import {VisionView} from './vision-view.js';
import {FrameSample, VisionResult, WorkerResponseMessage} from './types.js';
import {getEventBus, VisionAnalysisCompleteEvent} from '@/common/event-bus';
import {AbstractMedia} from "@/medialayer";
import {SampleExtractor} from './sample-extractor.js';


export class VisionService {
  #worker: Worker;
  #visionView: VisionView;
  #eventBus = getEventBus();
  #sampleExtractor: SampleExtractor;
  #timestampToSample = new Map<number, FrameSample>();

  constructor(sampleExtractor: SampleExtractor ) {
    this.#worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    this.#visionView = new VisionView();
    this.#sampleExtractor = sampleExtractor ;
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
    const result = this.#timestampToSample.get(data.timestamp!);
    if (result) {
      result.text = data.text!;
      this.#visionView.updateResult(result);
      this.#eventBus.emit(new VisionAnalysisCompleteEvent(result));
      return
    }
    console.warn("Could not find matching sample for timestamp:", data.timestamp);
  }

  loadModel(): void {
    this.#worker.postMessage({ task: "load-model" });
  }

  async analyzeVideo(media: AbstractMedia): Promise<void> {
    const instruction = "Describe the image in detail. Include all people, objects, and actions. Respond in 50 words or less.";
    // if (window.location.hostname === "localhost") {
    //   console.warn("Using mocked vision data for local development.");
    //   const data = this.#getMockedData(instruction);
    //   this.#onAnalysisComplete(data);
    //   return;
    // }

    try {
      console.log("Extracting smart samples from video...");
      const samples = await this.#sampleExtractor.extractSamples(media);
      samples.forEach(sample => {
        this.#timestampToSample.set(sample.timestamp, sample);
      });

      if (!samples || samples.length === 0) {
        console.error("No video samples extracted for analysis.");
        return;
      }
      console.log(`Extracted ${samples.length} unique frame samples for analysis`);

      for (const sample of samples) {
        const enhancedInstruction = `${instruction} [Frame at ${(sample.timestamp / 1000).toFixed(2)}s]`;
        this.#worker.postMessage({
          task: "analyze-image",
          imageData: sample.imageData,
          timestamp: sample.timestamp,
          instruction: enhancedInstruction
        });
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
      timestamp: 0.3,
    };
  }
}

