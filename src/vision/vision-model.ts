import type {LlavaProcessor, PreTrainedModel, Tensor} from "@huggingface/transformers";
import {
  AutoModelForImageTextToText,
  AutoProcessor,
  PretrainedModelOptions,
  RawImage,
  TextStreamer
} from "@huggingface/transformers";
import type {ModelParams, ProgressCallback, StreamUpdateCallback, VisionError, VisionResult} from './types.js';

const MODEL_ID = "onnx-community/FastVLM-0.5B-ONNX";
const MAX_NEW_TOKENS = 512;

const modelParams: ModelParams = {
  maxNewTokens: MAX_NEW_TOKENS,
  doSample: false,
  repetitionPenalty: 1.2,
};

export class VisionModelFactory {
  static readonly modelId: string = MODEL_ID;
  static processorInstance: LlavaProcessor | null = null;
  static modelInstance: PreTrainedModel | null = null;
  static loadPromise: Promise<void> | null = null;
  static inferenceLock: boolean = false;
  static canvas: HTMLCanvasElement | null = null;

  static async getInstance(progressCallback: ProgressCallback | null = null): Promise<{
    processor: LlavaProcessor;
    model: PreTrainedModel
  }> {
    if (this.processorInstance && this.modelInstance) {
      return {processor: this.processorInstance, model: this.modelInstance};
    }

    if (this.loadPromise) {
      await this.loadPromise;
      return {processor: this.processorInstance!, model: this.modelInstance!};
    }

    this.loadPromise = this.#loadModel(progressCallback);
    await this.loadPromise;

    return {processor: this.processorInstance!, model: this.modelInstance!};
  }

  static async #loadModel(progressCallback: ProgressCallback | null): Promise<void> {
    try {
      progressCallback?.({status: "progress", message: "Loading processor..."});
      this.processorInstance = await AutoProcessor.from_pretrained(this.modelId);
      progressCallback?.({status: "progress", message: "Processor loaded. Loading model..."});
      const options: PretrainedModelOptions = {
        dtype: {
          embed_tokens: "fp16",
          vision_encoder: "q4",
          decoder_model_merged: "q4",
        },
        device: "webgpu",
      };
      this.modelInstance = await AutoModelForImageTextToText.from_pretrained(this.modelId, options);
      progressCallback?.({status: "ready", message: "Model loaded successfully!"});
    } catch (error) {
      progressCallback?.({status: "error", message: (error as Error).message, data: error});
      throw error;
    } finally {
      this.loadPromise = null;
    }
  }
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

export async function analyzeImage(
    imageData: ImageData,
    timestamp: number,
    instruction: string,
    onTextUpdate?: StreamUpdateCallback
): Promise<VisionResult> {
  if (VisionModelFactory.inferenceLock) {
    console.log("Inference already running, skipping request");
    return {text: ""};
  }
  VisionModelFactory.inferenceLock = true;
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
  } finally {
    VisionModelFactory.inferenceLock = false;
  }
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
