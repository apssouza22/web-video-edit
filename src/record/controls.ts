import {popup} from "@/common/utils";
import {createUserMediaRecordingService} from "./index";
import {UserMediaRecordingService} from "@/record/service";

interface RecordingError extends Error {
  userMessage?: string;
}

export class RecordingControls {
  #userMediaRecorder: UserMediaRecordingService;
  #recordScreenBtn: HTMLElement | null;
  #recordVideoBtn: HTMLElement | null;
  #stopBtn: HTMLElement | null;
  #recordTabBtn: HTMLElement | null;
  #recordOptions: HTMLElement | null;

  constructor() {
    this.#userMediaRecorder = createUserMediaRecordingService();
    this.#recordScreenBtn = document.getElementById('record-screen-btn');
    this.#recordVideoBtn = document.getElementById('record-video-btn');
    this.#stopBtn = document.getElementById('stop-recording-btn');
    this.#recordTabBtn = document.querySelector('.tab-button[data-tab="record"]');
    this.#recordOptions = document.querySelector('.record-options');
  }

  init(): void {
    this.#recordScreenBtn?.addEventListener('click', this.#startScreenRecording.bind(this));
    this.#recordVideoBtn?.addEventListener('click', this.#startCameraRecording.bind(this));
    this.#stopBtn?.addEventListener('click', this.#stopRecording.bind(this));
  }

  #displayUserError(error: RecordingError): void {
    if (error.userMessage) {
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
          <h3>Recording Error</h3>
          <p>${error.userMessage}</p>
        `;
      popup(errorDiv);
    }
  }

  async #startScreenRecording(): Promise<void> {
    try {
      console.log('Starting screen recording...');
      this.#toggleRecordingButtons(true);
      await this.#userMediaRecorder.startScreenCapture();
    } catch (error: any) {
      console.error('Failed to start screen recording:', error);
      this.#toggleRecordingButtons(false);
      this.#displayUserError(error as RecordingError);
    }
  }

  async #startCameraRecording(): Promise<void> {
    try {
      console.log('Starting camera recording...');
      this.#toggleRecordingButtons(true);
      await this.#userMediaRecorder.startCameraCapture();
    } catch (error: any) {
      console.error('Failed to start camera recording:', error);
      this.#toggleRecordingButtons(false);
      this.#displayUserError(error as RecordingError);
    }
  }

  async #stopRecording(): Promise<void> {
    try {
      await this.#userMediaRecorder.stopRecording();
      this.#toggleRecordingButtons(false);
      this.#showSuccessMessage();
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      this.#toggleRecordingButtons(false);
      this.#displayUserError(error as RecordingError);
    }
  }

  #showSuccessMessage(): void {
    const successDiv = document.createElement('div');
    successDiv.innerHTML = `
      <h3>Recording Complete</h3>
      <p>Your recording has been added to the library.</p>
    `;
    popup(successDiv);
  }

  #toggleRecordingButtons(isRecording: boolean): void {
    if (isRecording) {
      if (this.#recordOptions) this.#recordOptions.style.display = 'none';
      if (this.#stopBtn) this.#stopBtn.style.display = 'flex';
      this.#recordTabBtn?.classList.add('recording-active');
    } else {
      if (this.#recordOptions) this.#recordOptions.style.display = 'flex';
      if (this.#stopBtn) this.#stopBtn.style.display = 'none';
      this.#recordTabBtn?.classList.remove('recording-active');
    }
  }
}


export function initScreenRecording(): void {
  const controls = new RecordingControls();
  controls.init();
}
