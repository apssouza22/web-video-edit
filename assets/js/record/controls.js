import {popup} from "../studio/index.js";
import {createUserMediaRecordingService} from "./index.js";

const userMediaRecorder =  createUserMediaRecordingService();
const recordBtn = document.getElementById('record-btn');
const recordMenu = document.getElementById('record-menu');
const recordScreenBtn = document.getElementById('record-screen-btn');
const recordVideoBtn = document.getElementById('record-video-btn');
const stopBtn = document.getElementById('stop-recording-btn');

export function initScreenRecording() {
  recordBtn.addEventListener('click', toggleDropdown);
  document.addEventListener('click', closeDropdownOnOutsideClick);

  // Recording functionality
  recordScreenBtn.addEventListener('click', startScreenRecording);
  recordVideoBtn.addEventListener('click', startCameraRecording);
  stopBtn.addEventListener('click', stopRecording);

  userMediaRecorder.addOnVideoFileCreatedListener((videoFile) => {
    window.studio.addLayerFromFile(videoFile);
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
    await userMediaRecorder.startScreenCapture();

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
    await userMediaRecorder.startCameraCapture();
  } catch (error) {
    console.error('Failed to start camera recording:', error);
    toggleRecordingButtons(false);
    displayUserError(error);
  }
}

async function stopRecording() {
  try {
    await userMediaRecorder.stopRecording();
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
