import {analyzeImage, onModelInferenceError} from "./vision-model.js";
import type {
  AnalyzeImageMessage,
  LoadModelMessage,
  VisionError,
  WorkerMessage,
  WorkerResponseMessage
} from "./types.js";
import {VisionModelFactory} from "@/vision/model-factory";

self.addEventListener("message", async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message) {
    return;
  }
  if (isLoadModelMessage(message)) {
    await handleLoadModelMessage();
    return;
  }
  if (isAnalyzeImageMessage(message)) {
    await handleAnalyzeImageMessage(message);
    return;
  }
  console.warn("Unknown message received in vision worker:", message);
});

function isLoadModelMessage(message: WorkerMessage): message is LoadModelMessage {
  return message.task === "load-model";
}

function isAnalyzeImageMessage(message: WorkerMessage): message is AnalyzeImageMessage {
  return message.task === "analyze-image" && message.imageData !== undefined;
}

async function handleLoadModelMessage() {
  console.log("Loading vision model...");
  try {
    await VisionModelFactory.getInstance((data) => {
      self.postMessage(data);
    });
  } catch (error) {
    onModelInferenceError(error as VisionError);
  }
}

async function handleAnalyzeImageMessage(message: AnalyzeImageMessage) {
  const onTextUpdate = (partialText: string) => {
    const streamMessage: WorkerResponseMessage = {
      status: "progress",
      task: "image-analysis",
      data: {text: partialText, timestamp: message.timestamp},
    };
    self.postMessage(streamMessage);
  };
  let result = await analyzeImage(message.imageData, message.timestamp, message.instruction, onTextUpdate);
  if (!result || !result.text) {
    result = {
      text: "Failed to analyze image.",
      timestamp: message.timestamp,
    }
  }
  const responseMessage: WorkerResponseMessage = {
    status: "complete",
    task: "image-analysis",
    data: result,
  };
  self.postMessage(responseMessage);
}
