import {AbstractMedia, addElementToBackground, isMediaAudio} from '@/media';
import { getSupportedMimeTypes } from '@/studio';
import { fixWebmDuration } from "@/common/utils";
import type { VideoStudio } from '@/studio';

type ProgressCallback = (progress: number) => void;
type CompletionCallback = () => void;

/**
 * Class for exporting video using MediaRecorder API without playing in the main player
 */
export class MediaRecorderExporter {
    private readonly studio: VideoStudio;
    private recordingCanvas: HTMLCanvasElement | null = null;
    private recordingCtx: CanvasRenderingContext2D | null = null;
    private recordingTime: number = 0;
    private mediaRecorder: MediaRecorder | null = null;
    private isRecording: boolean = false;
    private readonly audioContext: AudioContext;
    private progressCallback: ProgressCallback | null = null;
    private completionCallback: CompletionCallback | null = null;
    private totalDuration: number = 0;
    private progressInterval: number | null = null;

    constructor(studio: VideoStudio) {
        this.studio = studio;
        this.audioContext = new AudioContext();
    }

    /**
     * Start the export process using MediaRecorder without playing in the main player
     */
    export(
        progressCallback: ProgressCallback | null = null,
        completionCallback: CompletionCallback | null = null
    ): void {
        this.progressCallback = progressCallback;
        this.completionCallback = completionCallback;

        const availableTypes = this.#getSupportedMimeTypes();
        if (availableTypes.length === 0) {
            alert("Cannot export! Please use a screen recorder instead.");
            if (this.completionCallback) this.completionCallback();
            return;
        }
        this.totalDuration = this.#getTotalDuration();

        if (this.totalDuration <= 0) {
            alert("No content to export!");
            if (this.completionCallback) this.completionCallback();
            return;
        }

        this.#createRecordingCanvas();
        const stream = this.recordingCanvas!.captureStream();
        this.#loadAudioTrack(stream);
        this.#startBackgroundRecording(stream, availableTypes);
    }

    #loadAudioTrack(stream: MediaStream): void {
        const audioLayers = this.#getAudioLayers();
        if (audioLayers.length <= 0) {
            return;
        }
        const audioStreamDestination = this.audioContext.createMediaStreamDestination();
        audioLayers.forEach(layer => {
            layer.audioStreamDestination = audioStreamDestination;
        });
        const tracks = audioStreamDestination.stream.getAudioTracks();
        if (tracks.length > 0) {
            stream.addTrack(tracks[0]);
        }
    }

    /**
     * Create a separate canvas for recording that matches the player canvas
     */
    #createRecordingCanvas(): void {
        this.recordingCanvas = document.createElement('canvas');
        this.recordingCanvas.width = this.studio.player.canvas.width;
        this.recordingCanvas.height = this.studio.player.canvas.height;
        this.recordingCtx = this.recordingCanvas.getContext('2d');

        if (this.recordingCtx) {
            addElementToBackground(this.recordingCanvas);
        }
    }

    /**
     * Start recording using MediaRecorder with background rendering
     */
    #startBackgroundRecording(stream: MediaStream, availableTypes: string[]): void {
        const chunks: BlobPart[] = [];
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: availableTypes[0] });
        this.isRecording = true;
        this.recordingTime = 0;

        this.mediaRecorder.ondataavailable = (e: BlobEvent) => chunks.push(e.data);
        this.mediaRecorder.onstop = async (e: Event) => {
            this.#stopBackgroundRecording();
            const blob = new Blob(chunks, { type: availableTypes[0] });
            const videoBlob = await fixWebmDuration(blob);
            this.#downloadVideo(videoBlob);
            if (this.completionCallback) {
                this.completionCallback();
            }
        };

        this.#startProgressTracking();
        this.#startBackgroundRendering();
        this.mediaRecorder.start();
    }

    /**
     * Start background rendering loop that renders frames without playing
     */
    #startBackgroundRendering(): void {
        let lastTimestamp: number | null = null;
        
        this.#setupAudioForExport();

        const renderFrame = (currentTime: number): void => {
            if (lastTimestamp === null) {
                lastTimestamp = currentTime;
            }
            
            if (!this.isRecording) return;

            const deltaTime = currentTime - lastTimestamp;
            this.recordingTime += deltaTime;
            this.#renderLayersAtTime(this.recordingTime);

            if (this.recordingTime >= this.totalDuration) {
                this.mediaRecorder?.stop();
                return;
            }
            lastTimestamp = currentTime;
            window.requestAnimationFrame(renderFrame);
        };
        window.requestAnimationFrame(renderFrame);
    }

    /**
     * Setup audio connections for export
     */
    #setupAudioForExport(): void {
        this.audioContext.resume();
        for (const layer of this.studio.getLayers()) {
            if (layer.constructor.name === 'AudioLayer') {
                layer.connectAudioSource(this.audioContext);
            }
        }
    }

    /**
     * Render all layers to the recording canvas at a specific time
     */
    #renderLayersAtTime(time: number): void {
        if (!this.recordingCtx || !this.recordingCanvas) return;

        this.recordingCtx.clearRect(0, 0, this.recordingCanvas.width, this.recordingCanvas.height);
        const layers = this.studio.getLayers();

        for (const layer of layers) {
            // Pass playing=true to ensure audio layers start at correct time
            layer.render(this.recordingCtx, time, true);
        }
    }

    /**
     * Stop background recording and cleanup
     */
    #stopBackgroundRecording(): void {
        this.isRecording = false;
        this.#stopProgressTracking();
        this.studio.getLayers().forEach(layer => {
            layer.audioStreamDestination = null;
        });

        if (this.recordingCanvas) {
            this.recordingCanvas.remove();
            this.recordingCanvas = null;
            this.recordingCtx = null;
        }
    }

    /**
     * Calculate total duration from all layers
     */
    #getTotalDuration(): number {
        let maxDuration = 0;
        for (const layer of this.studio.getLayers()) {
            const layerEnd = layer.start_time + layer.totalTimeInMilSeconds;
            if (layerEnd > maxDuration) {
                maxDuration = layerEnd;
            }
        }
        return maxDuration;
    }

    /**
     * Get audio layers from the studio
     */
    #getAudioLayers(): AbstractMedia[] {
        const layers: AbstractMedia[] = [];
        for (const layer of this.studio.getLayers()) {
            if (isMediaAudio(layer)) {
                layers.push(layer);
            }
        }
        return layers;
    }

    /**
     * Start tracking export progress based on recording time
     */
    #startProgressTracking(): void {
        if (!this.progressCallback || this.totalDuration <= 0) return;

        this.progressInterval = window.setInterval(() => {
            const progress = Math.min((this.recordingTime / this.totalDuration) * 100, 99); // Cap at 99% until complete
            this.progressCallback?.(progress);
        }, 100); // Update every 100ms
    }

    /**
     * Stop progress tracking
     */
    #stopProgressTracking(): void {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        if (this.progressCallback) {
            this.progressCallback(100);
        }
    }

    /**
     * Download the recorded video
     */
    #downloadVideo(blob: Blob): void {
        console.log("Warning: Exported video may need to be fixed with CloudConvert.com or similar tools.");
        const vid = document.createElement('video');
        vid.controls = true;
        vid.src = URL.createObjectURL(blob);
        addElementToBackground(vid);
        this.#triggerFileDownload(blob);

        vid.currentTime = Number.MAX_SAFE_INTEGER;
    }

    /**
     * Trigger file download in the browser
     */
    #triggerFileDownload(blob: Blob): void {
        const extension = blob.type.includes('webm') ? 'webm' : 'mp4';
        const filename = `video_export_${(new Date()).getTime()}.${extension}`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);

        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        }, 100);
    }

    /**
     * Get supported MIME types for MediaRecorder
     */
    #getSupportedMimeTypes(): string[] {
        return getSupportedMimeTypes();
    }
}
