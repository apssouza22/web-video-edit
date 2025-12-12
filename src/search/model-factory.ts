import {
  pipeline,
  Florence2ForConditionalGeneration,
  AutoProcessor,
  AutoTokenizer,
  type PreTrainedModel,
  type Processor,
  type PreTrainedTokenizer,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import { getExecDevice } from "@/common/device";
import type { ProgressCallback } from "./types.js";

const FLORENCE_MODEL_ID = "onnx-community/Florence-2-base-ft";
const EMBEDDING_MODEL_ID = "Xenova/all-MiniLM-L6-v2";

export interface SearchModels {
  featureExtractor: FeatureExtractionPipeline;
  model: PreTrainedModel;
  processor: Processor;
  tokenizer: PreTrainedTokenizer;
}

export class SearchModelFactory {
  static #featureExtractor: FeatureExtractionPipeline | null = null;
  static #model: PreTrainedModel | null = null;
  static #processor: Processor | null = null;
  static #tokenizer: PreTrainedTokenizer | null = null;
  static #loadPromise: Promise<void> | null = null;

  static async getInstance(progressCallback: ProgressCallback | null = null): Promise<SearchModels> {
    if (this.#isLoaded()) {
      return this.#getModels();
    }

    if (this.#loadPromise) {
      await this.#loadPromise;
      return this.#getModels();
    }

    this.#loadPromise = this.#loadModels(progressCallback);
    await this.#loadPromise;

    return this.#getModels();
  }

  static #isLoaded(): boolean {
    return (
      this.#featureExtractor !== null &&
      this.#model !== null &&
      this.#processor !== null &&
      this.#tokenizer !== null
    );
  }

  static #getModels(): SearchModels {
    return {
      featureExtractor: this.#featureExtractor!,
      model: this.#model!,
      processor: this.#processor!,
      tokenizer: this.#tokenizer!,
    };
  }

  static async #loadModels(progressCallback: ProgressCallback | null): Promise<void> {
    try {
      progressCallback?.({
        status: "progress",
        message: "Loading feature extraction model...",
        progress: 0,
      });

      this.#featureExtractor = await pipeline(
        "feature-extraction",
        EMBEDDING_MODEL_ID,
        { device: getExecDevice() }
      ) as FeatureExtractionPipeline;

      progressCallback?.({
        status: "progress",
        message: "Loading Florence-2 model...",
        progress: 25,
      });

      this.#model = await Florence2ForConditionalGeneration.from_pretrained(FLORENCE_MODEL_ID, {
        dtype: "fp32",
        device: getExecDevice(),
      });

      progressCallback?.({
        status: "progress",
        message: "Loading processor...",
        progress: 50,
      });

      this.#processor = await AutoProcessor.from_pretrained(FLORENCE_MODEL_ID);

      progressCallback?.({
        status: "progress",
        message: "Loading tokenizer...",
        progress: 75,
      });

      this.#tokenizer = await AutoTokenizer.from_pretrained(FLORENCE_MODEL_ID);

      progressCallback?.({
        status: "ready",
        message: "Search models loaded successfully!",
        progress: 100,
      });
    } catch (error) {
      progressCallback?.({
        status: "error",
        message: (error as Error).message,
      });
      throw error;
    } finally {
      this.#loadPromise = null;
    }
  }
}

