// import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";
// import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";  //this version logs as error the shape mismatch
import {env, pipeline, PretrainedModelOptions} from "@huggingface/transformers";

import type {ModelParams, Pipeline, ProgressCallback, TranscriptionError, TranscriptionResult} from './types.js';
import {getExecDevice} from "@/common/device";

// Disable local models
env.allowLocalModels = false;

const modelParams: ModelParams = {
  chunk_length_s: 30,
  stride_length_s: 5,
  // language: "english",
  // task: "transcribe",
  return_timestamps: "word",
};

export class PipelineFactory {
  static readonly task: string = "automatic-speech-recognition";
  static readonly model: string = "Xenova/whisper-small.en";
  static instance: Promise<Pipeline> | null = null;

  /**
   * Get an instance of the pipeline for the specified task and model.
   * @param progress_callback - Optional callback for progress updates
   * @returns Promise resolving to pipeline function
   */
  static async getInstance(progress_callback: ProgressCallback | null = null): Promise<Pipeline> {
    if (this.instance === null) {
      const options: PretrainedModelOptions = {
        progress_callback: progress_callback || undefined,
        dtype: getExecDevice() === "wasm" ? "q8" : "fp32",
        device: getExecDevice(),
        // For medium models, we need to load the `no_attentions` revision to avoid running out of memory
        revision: this.model.includes("/whisper-medium") ? "no_attentions" : "output_attentions",
      };
      // @ts-ignore
      this.instance = await pipeline(
          "automatic-speech-recognition",
          this.model,
          options
      ) as Promise<Pipeline>;
    }

    return this.instance;
  }
}

export async function transcribe(audio: Float32Array): Promise<TranscriptionResult | null> {
  // Load transcriber model
  const modelInference = await PipelineFactory.getInstance((data) => {
    if (typeof self !== 'undefined') {
      self.postMessage(data);
    }
  });

  const start = performance.now();

  try {
    const output = await modelInference(audio, modelParams);
    const end = performance.now();

    console.log(`Time taken to transcribe: ${(end - start) / 1000} seconds`);
    console.log(output);

    return output;
  } catch (error) {
    return onModelInferenceError(error as TranscriptionError);
  }
}

export function onModelInferenceError(error: TranscriptionError): null {
  console.log(error);

  if (typeof self !== 'undefined') {
    self.postMessage({
      status: "error",
      task: "automatic-speech-recognition",
      data: error,
    });
  }

  return null;
}
