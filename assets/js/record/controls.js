import {popup} from "../studio/index.js";
import {ScreenRecordingService} from "./service.js";

const screenRecorder = new ScreenRecordingService();
const recordBtn = document.getElementById('record-screen-btn');
const stopBtn = document.getElementById('stop-recording-btn');

export function initScreenRecording() {
  recordBtn.addEventListener('click', startScreenRecording);
  stopBtn.addEventListener('click', stopScreenRecording);
  screenRecorder.addOnVideoFileCreatedListener((videoFile) => {
    console.log('Video file created:', videoFile);
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(videoFile);
    videoElement.controls = true;
    videoElement.autoplay = true;
    videoElement.style.width = '100%';
    videoElement.style.height = 'auto';
    popup(videoElement);
  })
}

function displayUserError(error) {
  if (error.userMessage) {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <h3>Screen Recording Error</h3>
        <p>${error.userMessage}</p>
      `;
    popup(errorDiv);
  }
}

async function startScreenRecording() {
  try {
    console.log('Starting screen recording...');
    toggleRecordingButtons(true);
    await screenRecorder.startScreenCapture();

  } catch (error) {
    console.error('Failed to start screen recording:', error);
    toggleRecordingButtons(false);
    displayUserError(error);
  }
}

async function stopScreenRecording() {
  try {
    await screenRecorder.stopScreenCapture();
    toggleRecordingButtons(false);
  } catch (error) {
    console.error('Failed to stop screen recording:', error);
    toggleRecordingButtons(false);
    displayUserError(error);
  }
}

function toggleRecordingButtons(isRecording) {
  if (isRecording) {
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    recordBtn.classList.add('recording');
  } else {
    recordBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    recordBtn.classList.remove('recording');
  }
}
