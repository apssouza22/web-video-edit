const dpr = window.devicePixelRatio || 1;
let fps = 24;
let max_size = 4000 * 1e6 / 4; // 4GB max

var AudioContext = window.AudioContext ||
    window.webkitAudioContext ||
    false;

const studio = new VideoStudio();
studio.init();

window.addEventListener('load', function () {
  let layerHolder = document.getElementById('layer_holder');
  layerHolder.addEventListener("touchmove", (e) => {
    e.stopPropagation();
  }, {passive: false});
  onLoadHandler();
});

function onLoadHandler() {
  let file = decodeURIComponent(location.hash.substring(1));
  // http://localhost:63342/video-demux/index.html#http://localhost:63342/video-demux/assets/example.json
  if (!file) {
    file = "http://localhost:63342/video-demux/assets/example.json"
  }
  if (file) {
    console.log("Loading example", file);
    for (let uri of file.split(',')) {
      studio.layerLoader.loadLayerFromURI(uri);
    }
    location.hash = "";
    return;
  }
  const localStorage = window.localStorage;
  let seen = localStorage.getItem('_seen');
  if (!seen || false) {
    const text = document.createElement('div');
    text.innerHTML = `Welcome!
      <br>
      <br>
      To start, drag-n-drop or paste URLs to images or videos.
      `;
    popup(text);
    localStorage.setItem('_seen', 'true');
  }
}



