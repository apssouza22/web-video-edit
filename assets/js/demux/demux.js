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
  for (const key in message.data) {
    status[key].innerText = message.data[key];
  }
}
const worker = new Worker(new URL("./worker.js", import.meta.url));

function start() {
  const videoCodec = document.querySelector("input[name=\"video_codec\"]:checked").value;
  const dataUri = `https://w3c.github.io/webcodecs/samples/data/bbb_video_${videoCodec}_frag.mp4`;
  const rendererName = document.querySelector("input[name=\"renderer\"]:checked").value;
  const canvas = document.querySelector("canvas").transferControlToOffscreen();

  console.log(`Starting worker with dataUri: ${dataUri}, renderer: ${rendererName}`);
  worker.addEventListener("message", setStatus);
  worker.postMessage({dataUri, rendererName, canvas}, [canvas]);
}
