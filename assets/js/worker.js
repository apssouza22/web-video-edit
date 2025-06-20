import {PipelineFactory, transcribe} from "./transcription/";


self.addEventListener("message", async (event) => {
    const message = event.data;
    if (!message) {
        return;
    }
    if(message.task === "load-model") {
        console.log("Loading model...");
        await PipelineFactory.getInstance((data) => {
            self.postMessage(data);
        }).catch(onModelInferenceError);
        return;
    }
    if(message.task === "load-video") {
        console.log("Loading video...");
        return
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


function onModelInferenceError(error){
    console.log(error);
    self.postMessage({
        status: "error",
        task: "automatic-speech-recognition",
        data: error,
    });
    return null;
}
