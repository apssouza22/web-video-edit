import {PipelineFactory, transcribe, onModelInferenceError} from "./index";
import type {
  WorkerMessage,
  WorkerResponseMessage,
  LoadModelMessage,
  TranscribeMessage,
  TranscriptionResult,
  TranscriptionError
} from "./types.js";

// Type guard functions
function isLoadModelMessage(message: WorkerMessage): message is LoadModelMessage {
  return message.task === "load-model";
}

function isTranscribeMessage(message: WorkerMessage): message is TranscribeMessage {
  return message.audio !== undefined;
}

self.addEventListener("message", async (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    
    if (!message) {
        return;
    }
    
    if (isLoadModelMessage(message)) {
        console.log("Loading model...");
        try {
            await PipelineFactory.getInstance((data) => {
                self.postMessage(data);
            });
        } catch (error) {
            onModelInferenceError(error as TranscriptionError);
        }
        return;
    }
    
    if (message.task === "load-video") {
        console.log("Loading video...");
        return;
    }

    if (isTranscribeMessage(message)) {
        const transcript = await transcribe(message.audio);
        
        if (transcript === null) {
            return;
        }

        // Send the result back to the main thread
        const responseMessage: WorkerResponseMessage = {
            status: "complete",
            task: "automatic-speech-recognition",
            data: transcript,
        };
        
        self.postMessage(responseMessage);
        return;
    }
    
    console.warn("Unknown message received in worker:", message);
});
