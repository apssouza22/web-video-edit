import {addText, popup, updateSettings} from './studio/index';
import {initScreenRecording} from "./record/controls";
import {initStudio} from "@/studio/initilizer.js";

const studio = initStudio()

initScreenRecording();

// Expose global functions for HTML onclick handlers
window.studio = studio;
window.addText = addText;
window.updateSettings = updateSettings;
window.popup = popup;

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
  // if (!file) {
  //   file = "http://localhost:63342/video-demux/assets/example.json"
  // }
  if (file) {
    console.log("Loading example", file);
    for (let uri of file.split(',')) {
      studio.loadLayersFromJson(uri);
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
