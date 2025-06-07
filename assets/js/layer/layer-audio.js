

import { StandardLayer } from './layer-common.js';
import { AudioContext } from '../constants.js';

export class AudioLayer extends StandardLayer {
  constructor(file) {
    super(file);
    this.reader = new FileReader();
    this.audioCtx = new AudioContext();
    this.audioBuffer = null;
    this.source = null;
    this.playing = false;
    this.playerAudioContext = null;
    this.audioStreamDestination = null;
    this.reader.addEventListener("load", this.#onAudioLoad.bind(this));
    this.reader.readAsArrayBuffer(file);
  }

  #onAudioLoad() {
    let buffer = this.reader.result;
    this.audioCtx.decodeAudioData(
      buffer,
      this.#onAudioLoadSuccess.bind(this),
      (function (e) {
        //TODO: On error
      }).bind(this)
    );
  }

  #onAudioLoadSuccess(audioBuffer) {
    this.audioBuffer = audioBuffer;
    window.worker.postMessage({
      audio: getAudio(audioBuffer),
      model: "Xenova/whisper-base",
      multilingual: false,
      quantized:false,
      subtask:  "transcribe",
      // language: "en",
    });

    this.totalTimeInMilSeconds = this.audioBuffer.duration * 1000;
    if (this.totalTimeInMilSeconds === 0) {
      //TODO: On error
    }
    this.ready = true;
    this.loadUpdateListener(100);
  }

  updateName(name) {
    this.name = name + " [Audio] ";
  }

  disconnect() {
    if (this.source) {
      this.source.disconnect(this.playerAudioContext.destination);
      this.source = null;
    }
  }

  init(canvasWidth, canvasHeight,playerAudioContext) {
    super.init(canvasWidth, canvasHeight);
    this.playerAudioContext = playerAudioContext;
  }

  connectAudioSource() {
    this.disconnect();
    this.source = this.playerAudioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.playerAudioContext.destination);
    
    if (this.audioStreamDestination) {
      //Used for video exporting
      this.source.connect(this.audioStreamDestination);
    }
    this.started = false;
  }

  render(ctxOut, currentTime, playing = false) {
    if (!this.ready) {
      return;
    }
    if(!playing){
      return;
    }

    let time = currentTime - this.start_time;
    if (time < 0 || time > this.totalTimeInMilSeconds) {
      return;
    }

    if (!this.started) {
      if (!this.source) {
        this.connectAudioSource(currentTime);
      }
      this.source.start(0, time / 1000);
      this.started = true;
    }
  }
}


function getAudio(audioData){
  let audio;
  if (audioData.numberOfChannels === 2) {
    const SCALING_FACTOR = Math.sqrt(2);

    let left = audioData.getChannelData(0);
    let right = audioData.getChannelData(1);

    audio = new Float32Array(left.length);
    for (let i = 0; i < audioData.length; ++i) {
      audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
    }
  } else {
    // If the audio is not stereo, we can just use the first channel:
    audio = audioData.getChannelData(0);
  }
  return audio
}