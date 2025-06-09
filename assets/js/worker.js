// import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";  //this version logs as error the shape mismatch

// Disable local models
env.allowLocalModels = false;
const modelParams = {
    chunk_length_s: 30,
    stride_length_s: 5,
    // language: "english",
    // task: "transcribe",
    return_timestamps: "word",
}

class PipelineFactory {
    static task = "automatic-speech-recognition";
    static model = "Xenova/whisper-small.en";
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(
                this.task,
                this.model,
                {
                    progress_callback,
                     dtype: "q8",
                    // For medium models, we need to load the `no_attentions` revision to avoid running out of memory
                    revision: this.model.includes("/whisper-medium") ? "no_attentions" : "output_attentions",
                }
            );
        }

        return this.instance;
    }
}

async function transcribe(audio) {
    // Load transcriber model
    let modelInferance = await PipelineFactory.getInstance((data) => {
        self.postMessage(data);
    });
    let start = performance.now();
    let output = await modelInferance(audio, modelParams).catch(onModelInferenceError);
    let end = performance.now();
    console.log(`Time taken to transcribe: ${(end - start)/1000} seconds`);
    console.log(output);
    return output;
}

function onModelInferenceError(error){
    console.log(error);
    self.postMessage({
        status: "error",
        task: "automatic-speech-recognition",
        data: error,
    });
    return null;
}

self.addEventListener("message", async (event) => {
    const message = event.data;
    if (!message) {
        return;
    }

    let transcript = await transcribe(message.audio);
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
