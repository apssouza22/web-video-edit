import {popup} from "../studio/index.js";
import {ScreenRecordingService} from "./service.js";

const screenRecorder = new ScreenRecordingService();
const recordBtn = document.getElementById('record-btn');
const recordMenu = document.getElementById('record-menu');
const recordScreenBtn = document.getElementById('record-screen-btn');
const recordVideoBtn = document.getElementById('record-video-btn');
const stopBtn = document.getElementById('stop-recording-btn');

export function initScreenRecording() {
  // Dropdown functionality
  recordBtn.addEventListener('click', toggleDropdown);
  document.addEventListener('click', closeDropdownOnOutsideClick);
  
  // Recording functionality
  recordScreenBtn.addEventListener('click', startScreenRecording);
  recordVideoBtn.addEventListener('click', startCameraRecording);
  stopBtn.addEventListener('click', stopRecording);
  
  screenRecorder.addOnVideoFileCreatedListener((videoFile) => {
    console.log('Video file created:', videoFile);
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(videoFile);
    videoElement.controls = true;
    videoElement.autoplay = true;
    videoElement.style.width = '100%';
    videoElement.style.height = 'auto';
    console.log(videoElement.duration)
    videoElement.addEventListener('loadedmetadata', () => {
      console.log(`Video duration: ${videoElement.duration} seconds`);
    });
    videoElement.addEventListener("loadeddata", (event) => {
      console.log(`Video duration: ${videoElement.duration} seconds`);
    })
    popup(videoElement);
  })
}

function toggleDropdown(event) {
  event.stopPropagation();
  recordMenu.classList.toggle('show');
}

function closeDropdownOnOutsideClick(event) {
  if (!event.target.closest('.dropdown')) {
    recordMenu.classList.remove('show');
  }
}

function displayUserError(error) {
  if (error.userMessage) {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <h3>Recording Error</h3>
        <p>${error.userMessage}</p>
      `;
    popup(errorDiv);
  }
}

async function startScreenRecording() {
  try {
    console.log('Starting screen recording...');
    recordMenu.classList.remove('show'); // Close dropdown
    toggleRecordingButtons(true);
    await screenRecorder.startScreenCapture();

  } catch (error) {
    console.error('Failed to start screen recording:', error);
    toggleRecordingButtons(false);
    displayUserError(error);
  }
}

async function startCameraRecording() {
  try {
    console.log('Starting camera recording...');
    recordMenu.classList.remove('show'); // Close dropdown
    toggleRecordingButtons(true);
    await screenRecorder.startCameraCapture();
  } catch (error) {
    console.error('Failed to start camera recording:', error);
    toggleRecordingButtons(false);
    displayUserError(error);
  }
}

async function stopRecording() {
  try {
    await screenRecorder.stopRecording();
    toggleRecordingButtons(false);
  } catch (error) {
    console.error('Failed to stop recording:', error);
    toggleRecordingButtons(false);
    displayUserError(error);
  }
}

function toggleRecordingButtons(isRecording) {
  if (isRecording) {
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'block';
  } else {
    recordBtn.style.display = 'block';
    stopBtn.style.display = 'none';
  }
}
