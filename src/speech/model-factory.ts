import type {ProgressCallback} from './types.js';
import {KokoroTTS} from 'kokoro-js';
import {getExecDevice} from "@/common/device";

export class SpeechModelFactory {
  static readonly DEFAULT_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
  static readonly DEFAULT_DTYPE = 'q8';
  static readonly DEFAULT_DEVICE = 'webgpu';
  static instance: KokoroTTS | null = null;
  static loadPromise: Promise<void> | null = null;
  private static currentModelId: string = SpeechModelFactory.DEFAULT_MODEL_ID;

  static async getInstance(
    progressCallback: ProgressCallback,
  ): Promise<KokoroTTS> {
    const modelId = this.DEFAULT_MODEL_ID;

    if (this.instance && modelId === this.currentModelId) {
      return this.instance;
    }

    if (this.loadPromise) {
      await this.loadPromise;
      return this.instance!;
    }

    this.currentModelId = modelId;
    this.loadPromise = this.#loadModel(modelId, progressCallback);
    await this.loadPromise;

    return this.instance!;
  }

  static async #loadModel(
    modelId: string,
    progressCallback: ProgressCallback
  ): Promise<void> {
    try {
      progressCallback({
        status: 'progress',
        message: 'Loading Kokoro TTS model...',
      });
      this.instance = await KokoroTTS.from_pretrained(modelId, {
        dtype:  getExecDevice() === "wasm" ? SpeechModelFactory.DEFAULT_DTYPE : "fp32",
        device: getExecDevice(),
        progress_callback: (data) => {
          if (data.status !== 'progress') {
            return;
          }
          progressCallback({
            status: 'progress',
          // @ts-ignore
            message: `Loading model: ${data.percentage}%`,
            data: data,
          });
        }
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
