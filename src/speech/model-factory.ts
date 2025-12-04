import type { ProgressCallback, SpeechServiceConfig } from './types.js';
import { KokoroTTS } from 'kokoro-js';

export class SpeechModelFactory {
  static readonly DEFAULT_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
  static instance: KokoroTTS | null = null;
  static loadPromise: Promise<void> | null = null;
  private static currentModelId: string = SpeechModelFactory.DEFAULT_MODEL_ID;

  static async getInstance(
    progressCallback: ProgressCallback,
    config?: SpeechServiceConfig,
  ): Promise<KokoroTTS> {
    const modelId = config?.modelId || this.DEFAULT_MODEL_ID;

    if (this.instance && modelId === this.currentModelId) {
      return this.instance;
    }

    if (this.loadPromise) {
      await this.loadPromise;
      return this.instance!;
    }

    this.currentModelId = modelId;
    this.loadPromise = this.#loadModel(modelId, progressCallback, config);
    await this.loadPromise;

    return this.instance!;
  }

  static async #loadModel(
    modelId: string,
    progressCallback: ProgressCallback,
    config?: SpeechServiceConfig,
  ): Promise<void> {
    try {
      progressCallback({
        status: 'progress',
        message: 'Loading Kokoro TTS model...',
      });

      this.instance = await KokoroTTS.from_pretrained(modelId, {
        dtype: config?.dtype || 'q8',
        device: config?.device || 'wasm',
      });

      progressCallback({
        status: 'ready',
        message: 'Speach model loaded successfully!',
      });
    } catch (error) {
      progressCallback({
        status: 'error',
        message: (error as Error).message,
        data: error,
      });
      throw error;
    } finally {
      this.loadPromise = null;
    }
  }
}
