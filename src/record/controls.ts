import {popup} from "../studio/index.js";
import {createUserMediaRecordingService} from "./index";

// Interface for error objects with user messages
interface RecordingError extends Error {
  userMessage?: string;
}

// Interface for UserMediaRecordingService to avoid circular dependency
interface UserMediaRecordingService {
  addOnVideoFileCreatedListener(callback: (videoFile: File) => void): void;

  startScreenCapture(): Promise<void>;

  startCameraCapture(): Promise<void>;

  stopRecording(): Promise<void>;
}

export class RecordingControls {
  // Private properties
  #userMediaRecorder: UserMediaRecordingService;
  #recordBtn: HTMLElement | null;
  #recordMenu: HTMLElement | null;
  #recordScreenBtn: HTMLElement | null;
  #recordVideoBtn: HTMLElement | null;
  #stopBtn: HTMLElement | null;

  constructor() {
    this.#userMediaRecorder = createUserMediaRecordingService();
    this.#recordBtn = document.getElementById('record-btn');
    this.#recordMenu = document.getElementById('record-menu');
    this.#recordScreenBtn = document.getElementById('record-screen-btn');
    this.#recordVideoBtn = document.getElementById('record-video-btn');
    this.#stopBtn = document.getElementById('stop-recording-btn');
  }

  init(): void {
    if (this.#recordBtn) {
      this.#recordBtn.addEventListener('click', this.#toggleDropdown.bind(this));
    }
    document.addEventListener('click', this.#closeDropdownOnOutsideClick.bind(this));
    this.#recordScreenBtn?.addEventListener('click', this.#startScreenRecording.bind(this));
    this.#recordVideoBtn?.addEventListener('click', this.#startCameraRecording.bind(this));
    this.#stopBtn?.addEventListener('click', this.#stopRecording.bind(this));


    this.#userMediaRecorder.addOnVideoFileCreatedListener((videoFile: File) => {
      (window as any).studio.addLayerFromFile(videoFile, true);
    });
  }

  #toggleDropdown(event: Event): void {
    event.stopPropagation();
    if (this.#recordMenu) {
      this.#recordMenu.classList.toggle('show');
    }
  }

  #closeDropdownOnOutsideClick(event: Event): void {
    const target = event.target as Element;
    if (!target.closest('.dropdown')) {
      this.#recordMenu?.classList.remove('show');
    }
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
      this.#recordMenu?.classList.remove('show'); // Close dropdown
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
      this.#recordMenu?.classList.remove('show'); // Close dropdown
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
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      this.#toggleRecordingButtons(false);
      this.#displayUserError(error as RecordingError);
    }
  }

  #toggleRecordingButtons(isRecording: boolean): void {
    if (isRecording) {
      this.#recordBtn!.style.display = 'none';
      this.#stopBtn!.style.display = 'block';
    } else {
      this.#recordBtn!.style.display = 'block';
      this.#stopBtn!.style.display = 'none';
    }
  }
}

// Legacy export for backward compatibility
export function initScreenRecording(): void {
  const controls = new RecordingControls();
  controls.init();
}
