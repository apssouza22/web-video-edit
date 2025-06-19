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

function setStatus(message) {
  console.log(status, message.data.data);
  for (const key in message.data.data) {
    status[key].innerText = message.data.data[key];
  }
}

function start() {
  const videoCodec = document.querySelector("input[name=\"video_codec\"]:checked").value;
  const dataUri = `https://w3c.github.io/webcodecs/samples/data/bbb_video_${videoCodec}_frag.mp4`;
  const rendererName = document.querySelector("input[name=\"renderer\"]:checked").value;
  const canvas = document.querySelector("canvas").transferControlToOffscreen();
  const handler  =new DemuxHandler();
  handler.start(dataUri, rendererName, canvas);
}

class DemuxHandler{
  #worker;

  constructor() {
    this.#worker = new Worker(new URL("./worker.js", import.meta.url));
    this.#worker.addEventListener("message", setStatus);
  }

  start(dataUri, rendererName, canvas) {
    const task = "start";
    console.log(`Starting worker with dataUri: ${dataUri}, renderer: ${rendererName}`);
    this.#worker.postMessage({task, dataUri, rendererName, canvas}, [canvas]);
  }
}

