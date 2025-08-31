import {popup} from "../studio/index.js";
import {createUserMediaRecordingService} from "./index.js";

export class RecordingControls {
  // Private properties
  #userMediaRecorder;
  #recordBtn;
  #recordMenu;
  #recordScreenBtn;
  #recordVideoBtn;
  #stopBtn;

  constructor() {
    this.#userMediaRecorder = createUserMediaRecordingService();
    this.#recordBtn = document.getElementById('record-btn');
    this.#recordMenu = document.getElementById('record-menu');
    this.#recordScreenBtn = document.getElementById('record-screen-btn');
    this.#recordVideoBtn = document.getElementById('record-video-btn');
    this.#stopBtn = document.getElementById('stop-recording-btn');
  }

  init() {
    this.#recordBtn.addEventListener('click', this.#toggleDropdown.bind(this));
    document.addEventListener('click', this.#closeDropdownOnOutsideClick.bind(this));

    this.#recordScreenBtn.addEventListener('click', this.#startScreenRecording.bind(this));
    this.#recordVideoBtn.addEventListener('click', this.#startCameraRecording.bind(this));
    this.#stopBtn.addEventListener('click', this.#stopRecording.bind(this));

    this.#userMediaRecorder.addOnVideoFileCreatedListener((videoFile) => {
      window.studio.addLayerFromFile(videoFile, true);
    });
  }

  #toggleDropdown(event) {
    event.stopPropagation();
    this.#recordMenu.classList.toggle('show');
  }

  #closeDropdownOnOutsideClick(event) {
    if (!event.target.closest('.dropdown')) {
      this.#recordMenu.classList.remove('show');
    }
  }

  #displayUserError(error) {
    if (error.userMessage) {
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
          <h3>Recording Error</h3>
          <p>${error.userMessage}</p>
        `;
      popup(errorDiv);
    }
  }

  async #startScreenRecording() {
    try {
      console.log('Starting screen recording...');
      this.#recordMenu.classList.remove('show'); // Close dropdown
      this.#toggleRecordingButtons(true);
      await this.#userMediaRecorder.startScreenCapture();

    } catch (error) {
      console.error('Failed to start screen recording:', error);
      this.#toggleRecordingButtons(false);
      this.#displayUserError(error);
    }
  }

  async #startCameraRecording() {
    try {
      console.log('Starting camera recording...');
      this.#recordMenu.classList.remove('show'); // Close dropdown
      this.#toggleRecordingButtons(true);
      await this.#userMediaRecorder.startCameraCapture();
    } catch (error) {
      console.error('Failed to start camera recording:', error);
      this.#toggleRecordingButtons(false);
      this.#displayUserError(error);
    }
  }

  async #stopRecording() {
    try {
      await this.#userMediaRecorder.stopRecording();
      this.#toggleRecordingButtons(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.#toggleRecordingButtons(false);
      this.#displayUserError(error);
    }
  }

  #toggleRecordingButtons(isRecording) {
    if (isRecording) {
      this.#recordBtn.style.display = 'none';
      this.#stopBtn.style.display = 'block';
    } else {
      this.#recordBtn.style.display = 'block';
      this.#stopBtn.style.display = 'none';
    }
  }
}

// Legacy export for backward compatibility
export function initScreenRecording() {
  const controls = new RecordingControls();
  controls.init();
}
