import type {LlavaProcessor, Tensor} from "@huggingface/transformers";
import {RawImage, TextStreamer} from "@huggingface/transformers";
import type {ModelParams, StreamUpdateCallback, VisionError, VisionResult} from './types.js';
import {VisionModelFactory} from "@/vision/model-factory";

const MAX_NEW_TOKENS = 512;

const modelParams: ModelParams = {
  maxNewTokens: MAX_NEW_TOKENS,
  doSample: false,
  repetitionPenalty: 1.2,
};

async function processInference(
    imageData: ImageData,
    timestamp: number,
    instruction: string,
    onTextUpdate?: StreamUpdateCallback
): Promise<VisionResult> {
  try {
    const {processor, model} = await VisionModelFactory.getInstance();
    if (!processor || !model) {
      throw new Error("Model/processor not loaded");
    }
    const rawImg = new RawImage(imageData.data, imageData.width, imageData.height, 4);
    const prompt = getPrompt(instruction, processor);
    const streamer = getStreamer(processor, onTextUpdate);
    const inputs = await processor(rawImg, prompt, {add_special_tokens: false});
    const outputs = (await model.generate({
      ...inputs,
      max_new_tokens: modelParams.maxNewTokens,
      do_sample: modelParams.doSample,
      streamer,
      repetition_penalty: modelParams.repetitionPenalty,
    })) as Tensor;

    const decoded = processor.batch_decode(outputs.slice(null, [inputs.input_ids.dims.at(-1), null]), {
      skip_special_tokens: true,
    });

    return {text: decoded[0].trim(), timestamp: timestamp};
  } catch (error) {
    return onModelInferenceError(error as VisionError);
  }
}

function processNextInQueue(): void {
  if (VisionModelFactory.requestQueue.length === 0) {
    VisionModelFactory.inferenceLock = false;
    return;
  }

  const request = VisionModelFactory.requestQueue.shift()!;
  processInference(request.imageData, request.timestamp, request.instruction, request.onTextUpdate)
    .then(result => {
      request.resolve(result);
      processNextInQueue();
    })
    .catch(error => {
      request.reject(error);
      processNextInQueue();
    });
}

export async function analyzeImage(
    imageData: ImageData,
    timestamp: number,
    instruction: string,
    onTextUpdate?: StreamUpdateCallback
): Promise<VisionResult> {
  if (VisionModelFactory.inferenceLock) {
    console.log("Inference already running, adding request to queue");
    return new Promise((resolve, reject) => {
      VisionModelFactory.requestQueue.push({
        imageData,
        timestamp,
        instruction,
        onTextUpdate,
        resolve,
        reject,
      });
    });
  }

  VisionModelFactory.inferenceLock = true;
  const result = await processInference(imageData, timestamp, instruction, onTextUpdate);
  processNextInQueue();
  return result;
}

export function onModelInferenceError(error: VisionError): VisionResult {
  console.error("Vision model inference error:", error);
  if (typeof self !== 'undefined' && self.postMessage) {
    self.postMessage({
      status: "error",
      task: "image-analysis",
      data: error,
    });
  }

  return {text: ""};
}


function getPrompt(instruction: string, processor: LlavaProcessor) {
  const messages = [
    {
      role: "system",
      content: `You are a helpful visual AI assistant. Respond concisely and accurately to the user's query in one sentence.`,
    },
    {role: "user", content: `<image>${instruction}`},
  ];
  return processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });
}

function getStreamer(processor: LlavaProcessor, onTextUpdate?: StreamUpdateCallback) {
  let streamed = "";
  return new TextStreamer(processor.tokenizer!, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (t: string) => {
      streamed += t;
      onTextUpdate?.(streamed.trim());
    },
  });
}
