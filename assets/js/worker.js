/* eslint-disable camelcase */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";

// Disable local models
env.allowLocalModels = false;

class PipelineFactory {
    static task = "automatic-speech-recognition";
    static model = null;
    static quantized = null;
    static instance = null;

    static async getInstance(progress_callback = null) {
        console.log(this.model);
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                progress_callback,
                quantized: this.quantized,
                // For medium models, we need to load the `no_attentions` revision to avoid running out of memory
                revision: this.model.includes("/whisper-medium") ? "no_attentions" : "output_attentions",
            });
        }

        return this.instance;
    }
}

async function transcribe(audio, model, multilingual, quantized, subtask, language) {
    const isDistilWhisper = model.startsWith("distil-whisper/");
    let modelName = model;
    if (!isDistilWhisper && !multilingual) {
        modelName += ".en";
    }

    if (PipelineFactory.model !== modelName || PipelineFactory.quantized !== quantized) {
        // Invalidate model if different
        PipelineFactory.model = modelName;
        PipelineFactory.quantized = quantized;

        if (PipelineFactory.instance !== null) {
            (await PipelineFactory.getInstance()).dispose();
            PipelineFactory.instance = null;
        }
    }

    // Load transcriber model
    let transcriber = await PipelineFactory.getInstance((data) => {
        self.postMessage(data);
    });

    let output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: null,
        task: null,
        return_timestamps: "word",
    }).catch((error) => {
        console.log(error);
        self.postMessage({
            status: "error",
            task: "automatic-speech-recognition",
            data: error,
        });
        return null;
    });
    console.log(output);
    return output;
}

self.addEventListener("message", async (event) => {
    const message = event.data;
    if (!message) {
        return;
    }

    let transcript = await transcribe(message.audio, message.model, message.multilingual, message.quantized, message.subtask, message.language);
    if (transcript === null) {
        return;
    }

    // Send the result back to the main thread
    self.postMessage({
        status: "complete",
        task: "automatic-speech-recognition",
        data: transcript,
    });
});
