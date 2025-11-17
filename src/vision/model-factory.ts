import {
  AutoModelForImageTextToText,
  AutoProcessor,
  LlavaProcessor,
  PreTrainedModel,
  PretrainedModelOptions
} from "@huggingface/transformers";
import type {ProgressCallback, StreamUpdateCallback, VisionResult} from "@/vision/types";

const MODEL_ID = "onnx-community/FastVLM-0.5B-ONNX";
interface QueuedRequest {
  imageData: ImageData;
  timestamp: number;
  instruction: string;
  onTextUpdate?: StreamUpdateCallback;
  resolve: (result: VisionResult) => void;
  reject: (error: Error) => void;
}

export class VisionModelFactory {
  static readonly modelId: string = MODEL_ID;
  static processorInstance: LlavaProcessor | null = null;
  static modelInstance: PreTrainedModel | null = null;
  static loadPromise: Promise<void> | null = null;
  static inferenceLock: boolean = false;
  static canvas: HTMLCanvasElement | null = null;
  static requestQueue: QueuedRequest[] = [];

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
