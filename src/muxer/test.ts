import {
  CanvasSource,
  MediaStreamAudioTrackSource,
  Mp4OutputFormat,
  Output,
  QUALITY_MEDIUM,
  StreamTarget,
} from "https://cdn.jsdelivr.net/npm/mediabunny@1.0.2/+esm";

// MediaBunny additional type definitions for this test file
declare module "https://cdn.jsdelivr.net/npm/mediabunny@1.0.2/+esm" {
  interface StreamTargetConfig {
    write(chunk: { data: Uint8Array }): void;
  }

  interface MediaStreamAudioTrackSourceConfig {
    codec: string;
    bitrate: number;
  }

  interface Mp4OutputFormatConfig {
    fastStart?: 'fragmented';
  }

  export class MediaStreamAudioTrackSource {
    constructor(track: MediaStreamTrack, config: MediaStreamAudioTrackSourceConfig);
  }

  export class StreamTarget {
    constructor(stream: WritableStream);
  }

  export const QUALITY_MEDIUM: number;
}

const toggleRecordingButton = document.querySelector('#toggle-button') as HTMLButtonElement;
const horizontalRule = document.querySelector('hr') as HTMLHRElement;
const mainContainer = document.querySelector('#main-container') as HTMLElement;
const videoElement = document.querySelector('video') as HTMLVideoElement;
const downloadButton = document.querySelector('#download-button') as HTMLAnchorElement;
const errorElement = document.querySelector('#error-element') as HTMLElement;

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const context = canvas.getContext('2d', { alpha: false, desynchronized: true })!;

const frameRate = 30;

const chunks: Uint8Array[] = [];
let recording = false;
let output: Output | null = null;
let videoSource: CanvasSource | null = null;
let videoCaptureInterval: number | null = null;
let mediaStream: MediaStream | null = null;
let startTime: number;
let readyForMoreFrames = true;
let lastFrameNumber = -1;

const startRecording = async (): Promise<void> => {
  try {
    // Reset DOM state
    recording = true;
    toggleRecordingButton.textContent = 'Starting...';
    toggleRecordingButton.disabled = true;
    mainContainer.style.display = 'none';
    videoElement.src = '';
    downloadButton.style.display = 'none';

    // Paint a white background to the canvas
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Get user microphone
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    horizontalRule.style.display = '';
    mainContainer.style.display = '';

    const audioTrack = mediaStream.getAudioTracks()[0];

    // Create a new output file
    output = new Output({
      // We're using fragmented MP4 here; streamable WebM would also work
      format: new Mp4OutputFormat({ fastStart: 'fragmented' }),
      // We use StreamTarget to pipe the chunks to the SourceBuffer as soon as they are created
      target: new StreamTarget(new WritableStream({
        write(chunk) {
          chunks.push(chunk.data);

          if (sourceBuffer) {
            appendToSourceBuffer(chunk.data);
          }
        },
      })),
    });

    const mediaSource = new MediaSource();
    let sourceBuffer: SourceBuffer | null = null;
    videoElement.src = URL.createObjectURL(mediaSource);
    void videoElement.play();

    await new Promise<void>(resolve => mediaSource.onsourceopen = () => resolve());

    let appendPromise = Promise.resolve();
    const appendToSourceBuffer = (source: Uint8Array): void => {
      // Buffer appends must be serialized to avoid errors
      appendPromise = appendPromise.then(() => {
        sourceBuffer!.appendBuffer(source);
        return new Promise<void>(resolve => sourceBuffer!.onupdateend = () => resolve());
      });
    };

    // Add the video track, with the canvas as the source
    videoSource = new CanvasSource(canvas, {
      codec: 'vp9',
      bitrate: QUALITY_MEDIUM,
      keyFrameInterval: 0.5,
      latencyMode: 'realtime', // Allow the encoder to skip frames to keep up with real-time constraints
    });
    output.addVideoTrack(videoSource, { frameRate });

    if (audioTrack) {
      // Add the audio track, with the media stream track as the source
      const audioSource = new MediaStreamAudioTrackSource(audioTrack, {
        codec: 'opus',
        bitrate: QUALITY_MEDIUM,
      });
      output.addAudioTrack(audioSource);
    }

    await output.start();

    startTime = Number(document.timeline?.currentTime || performance.now());
    readyForMoreFrames = true;
    lastFrameNumber = -1;

    // Start the video frame capture loop
    void addVideoFrame();
    videoCaptureInterval = window.setInterval(() => void addVideoFrame(), 1000 / frameRate);

    const mimeType = await output.getMimeType();
    sourceBuffer = mediaSource.addSourceBuffer(mimeType);

    // Add all chunks that have been queued up until this point
    chunks.forEach(chunk => appendToSourceBuffer(chunk));

    toggleRecordingButton.textContent = 'Stop recording';
    toggleRecordingButton.disabled = false;
  } catch (error) {
    errorElement.textContent = String(error);

    mainContainer.style.display = 'none';
    toggleRecordingButton.textContent = 'Start recording';
    toggleRecordingButton.disabled = false;
    recording = false;
  }
};

const stopRecording = async (): Promise<void> => {
  toggleRecordingButton.textContent = 'Stopping...';
  toggleRecordingButton.disabled = true;

  if (videoCaptureInterval) {
    clearInterval(videoCaptureInterval);
  }
  mediaStream?.getTracks().forEach(track => track.stop());

  if (output) {
    await output.finalize();

    // Show a download button
    const blob = new Blob(chunks, { type: output.format.mimeType });
    const url = URL.createObjectURL(blob);
    downloadButton.style.display = '';
    downloadButton.href = url;
    downloadButton.download = 'michelangelo' + output.format.fileExtension;
  }

  toggleRecordingButton.textContent = 'Start recording';
  toggleRecordingButton.disabled = false;
  recording = false;
};

toggleRecordingButton.addEventListener('click', () => {
  if (!recording) {
    void startRecording();
  } else {
    void stopRecording();
  }
});

const addVideoFrame = async (): Promise<void> => {
  if (!readyForMoreFrames || !videoSource) {
    // The last frame hasn't finished encoding yet; let's drop this frame due to real-time constraints
    return;
  }

  const elapsedSeconds = (Number(document.timeline?.currentTime || performance.now()) - startTime) / 1000;
  const frameNumber = Math.round(elapsedSeconds * frameRate);
  if (frameNumber === lastFrameNumber) {
    // Prevent multiple frames with the same timestamp
    return;
  }

  lastFrameNumber = frameNumber;
  const timestamp = frameNumber / frameRate;

  readyForMoreFrames = false;
  await videoSource.add(timestamp, 1 / frameRate);
  readyForMoreFrames = true;
};

/* === CANVAS DRAWING STUFF === */

let drawing = false;
let lastPos = new DOMPoint(0, 0);

const getRelativeMousePos = (event: PointerEvent): DOMPoint => {
  const rect = canvas.getBoundingClientRect();
  return new DOMPoint(
    event.clientX - rect.x,
    event.clientY - rect.y,
  );
};

const drawLine = (from: DOMPoint, to: DOMPoint): void => {
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.strokeStyle = '#27272a';
  context.lineWidth = 5;
  context.lineCap = 'round';
  context.stroke();
};

canvas.addEventListener('pointerdown', (event: PointerEvent) => {
  if (event.button !== 0) return;

  drawing = true;
  lastPos = getRelativeMousePos(event);
  drawLine(lastPos, lastPos);
});

window.addEventListener('pointerup', () => {
  drawing = false;
});

window.addEventListener('pointermove', (event: PointerEvent) => {
  if (!drawing) return;

  const newPos = getRelativeMousePos(event);
  drawLine(lastPos, newPos);
  lastPos = newPos;
});
