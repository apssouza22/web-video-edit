import { VisionView } from './vision-view.js';
import {
  WorkerResponseMessage,
  VisionResult,
  VisionServiceConfig,
  VisionResultCallback,
  SampleExtractorConfig, SamplingStrategy
} from './types.js';
import { getEventBus, VisionAnalysisCompleteEvent } from '@/common/event-bus';
import {AbstractMedia} from "@/media";
import { SampleExtractor } from './sample-extractor.js';
import {ComparisonMethod} from "@/vision/frame-comparator";

export class VisionService {
  #worker: Worker;
  #visionView: VisionView;
  #onResultCallback: VisionResultCallback;
  #eventBus = getEventBus();
  #sampleExtractor: SampleExtractor;

  constructor(config?: VisionServiceConfig & { samplingConfig?: SampleExtractorConfig }) {
    this.#worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    this.#visionView = new VisionView();
    this.#onResultCallback = (result: VisionResult) => {};
    this.#sampleExtractor = new SampleExtractor({
      strategy: SamplingStrategy.SCENE_CHANGE,
      maxSamples: 100,
      minSamples: 5,
      similarityThreshold: 0.20,
      comparisonMethod: ComparisonMethod.HISTOGRAM
    });
    this.#addEventListener();
  }

  #addEventListener(): void {
    this.#worker.addEventListener("message", ((event: MessageEvent<WorkerResponseMessage>) => {
      const message = event.data;
      switch (message.status) {
        case "complete":
          if (message.data && typeof message.data === 'object' && 'text' in message.data) {
            this.#onAnalysisComplete(message.data as VisionResult);
          }
          break;

        case "initiate":
          console.log("Initiating vision model loading");
          break;

        case "ready":
          console.log("Vision model ready");
          break;

        case "error":
          const errorMessage = message.data && typeof message.data === 'object' && 'message' in message.data
            ? (message.data as Error).message
            : 'Unknown error occurred';
          alert(
            `Vision model error: ${errorMessage}\n\nThis may be due to WebGPU compatibility issues. Please try Chrome or Edge with WebGPU enabled.`,
          );
          break;

        case "done":
          console.log("Vision model file loaded:", message.file);
          break;

        default:
          break;
      }
    }).bind(this));
  }

  #onAnalysisComplete(data: VisionResult): void {
    console.log("Vision analysis complete:", data);
    this.#visionView.updateResult(data);
    this.#onResultCallback(data);
    this.#eventBus.emit(new VisionAnalysisCompleteEvent(data));
  }

  loadModel(): void {
    this.#worker.postMessage({ task: "load-model" });
  }

  analyzeImage(imageData: ImageData, instruction: string): void {
    // if (window.location.hostname === "localhost") {
    //   console.warn("Using mocked vision data for local development.");
    //   const data = this.#getMockedData(instruction);
    //   this.#onAnalysisComplete(data);
    //   return;
    // }

    this.#visionView.showLoading();
    this.#worker.postMessage({
      task: "analyze-image",
      imageData: imageData,
      instruction: instruction
    });
  }

  async analyzeVideo(media: AbstractMedia, instruction: string): Promise<void> {
    try {
      console.log("Extracting smart samples from video...");
      const samples = await this.#sampleExtractor.extractSamples(media);
      
      if (!samples || samples.length === 0) {
        console.error("No video samples extracted for analysis.");
        return;
      }

      console.log(`Extracted ${samples.length} unique frame samples for analysis`);

      for (const sample of samples) {
        const enhancedInstruction = `${instruction} [Frame at ${(sample.timestamp / 1000).toFixed(2)}s]`;
        this.analyzeImage(sample.imageData, enhancedInstruction);
        
        await this.#delay(500);
      }
    } catch (error) {
      console.error("Error analyzing video:", error);
    }
  }

  #delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  #getMockedData(instruction: string): VisionResult {
    return {
      text: `Mocked response for instruction: "${instruction}". This is a placeholder description of the image content.`,
      timestamp: Date.now()
    };
  }

  getView(): VisionView {
    return this.#visionView;
  }

  getSampleExtractor(): SampleExtractor {
    return this.#sampleExtractor;
  }

  updateSamplingConfig(config: Partial<SampleExtractorConfig>): void {
    this.#sampleExtractor.updateConfig(config);
  }
}

