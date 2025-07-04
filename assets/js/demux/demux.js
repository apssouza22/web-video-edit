// Play button.
const startButton = document.querySelector("#start");
startButton.addEventListener("click", () => {
  document.querySelectorAll("input").forEach(input => input.disabled = true);
  startButton.disabled = true;
  start();
}, {once: true});

// Status UI.
const status = {
  fetch: document.querySelector("#fetch"),
  demux: document.querySelector("#demux"),
  decode: document.querySelector("#decode"),
  render: document.querySelector("#render"),
};
const frames = []
function setStatus(message) {
  if(message.data["imageData"]){
    console.log(message.data["imageData"])
    frames.push(message.data["imageData"]);
    console.log("Frame received", frames.length) ;
    return
  }


  for (const key in message.data.data) {
    if(!status[key]) {
      console.log("Frame status", key, message.data.data[key]);
      continue;
    }
    status[key].innerText = message.data.data[key];
  }
}

function start() {
  const videoCodec = document.querySelector("input[name=\"video_codec\"]:checked").value;
  const dataUri = `https://w3c.github.io/webcodecs/samples/data/bbb_video_${videoCodec}_frag.mp4`;
  const rendererName = document.querySelector("input[name=\"renderer\"]:checked").value;
  const canvas = document.querySelector("canvas").transferControlToOffscreen();
  const handler = new DemuxHandler(setStatus);
  handler.start(dataUri, rendererName, canvas);
}

class DemuxHandler {
  #worker;

  constructor(onUpdateListener) {
    this.#worker = new Worker(new URL("./worker.js", import.meta.url));
    this.#worker.addEventListener("message", onUpdateListener);
  }


  init(arrayBuffer, canvas, rendererName) {
    const task = "start";
    this.#worker.postMessage({task, arrayBuffer, rendererName, canvas}, [canvas]);
  }

  start(dataUri, rendererName, canvas) {
    const task = "start";
    console.log(`Starting worker with dataUri: ${dataUri}, renderer: ${rendererName}`);
    this.#worker.postMessage({task, dataUri, rendererName, canvas}, [canvas]);
  }
}

