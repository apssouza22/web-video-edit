import {VisionModelFactory, analyzeImage, onModelInferenceError} from "./vision-model.js";
import type {
  WorkerMessage,
  WorkerResponseMessage,
  LoadModelMessage,
  AnalyzeImageMessage,
  VisionResult,
  VisionError
} from "./types.js";

function isLoadModelMessage(message: WorkerMessage): message is LoadModelMessage {
  return message.task === "load-model";
}

function isAnalyzeImageMessage(message: WorkerMessage): message is AnalyzeImageMessage {
  return message.task === "analyze-image" && message.imageData !== undefined;
}

self.addEventListener("message", async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (!message) {
    return;
  }

  if (isLoadModelMessage(message)) {
    console.log("Loading vision model...");
    try {
      await VisionModelFactory.getInstance((data) => {
        self.postMessage(data);
      });
    } catch (error) {
      onModelInferenceError(error as VisionError);
    }
    return;
  }

  if (isAnalyzeImageMessage(message)) {
    const onTextUpdate = (partialText: string) => {
      const streamMessage: WorkerResponseMessage = {
        status: "progress",
        task: "image-analysis",
        data: {text: partialText, timestamp: message.timestamp},
      };
      self.postMessage(streamMessage);
    };
    const result = await analyzeImage(message.imageData, message.timestamp, message.instruction, onTextUpdate);

    if (!result || !result.text) {
      return;
    }

    const responseMessage: WorkerResponseMessage = {
      status: "complete",
      task: "image-analysis",
      data: result,
    };

    self.postMessage(responseMessage);
    return;
  }

  console.warn("Unknown message received in vision worker:", message);
});

