import {
    AudioBufferSource,
    BufferTarget,
    CanvasSource,
    getFirstEncodableAudioCodec,
    Mp4OutputFormat,
    Output,
    QUALITY_VERY_HIGH,
    VideoCodec,
} from "mediabunny";
import {AbstractClip} from "@/mediaclip";
import {StudioState} from "@/common";
import {fps} from "@/constants";
import {getExportDimensions} from "./dimensions";
import {calculateBitrate, QUALITY_PRESETS, QualityPreset, QualityPresetName} from "./quality-presets";
import {selectBestVideoCodec} from "./codec-selector";

type ProgressCallback = (progress: number) => void;
type CompletionCallback = () => void;

export interface ExportOptions {
  qualityPreset?: QualityPresetName;
  preferredCodecs?: VideoCodec[];
  customBitrate?: number;
  hardwareAcceleration?: 'no-preference' | 'prefer-hardware' | 'prefer-software';
}

/**
 * Class for exporting video using MediaBunny library with Web Codecs API
 *
 * This implementation follows the test2.js approach using BufferTarget and synchronous frame rendering
 */
export class WebCodecExporter {
    private output:  Output<Mp4OutputFormat, BufferTarget> | null = null;
    private canvasSource: CanvasSource | null = null;
    private audioBufferSource: AudioBufferSource | null = null;
    private isEncoding: boolean = false;
    private progressCallback: ProgressCallback | null = null;
    private completionCallback: CompletionCallback | null = null;
    private totalFrames: number = 0;
    private totalDuration: number = 0;
    private readonly frameRate: number = fps;
    private recordingCanvas: OffscreenCanvas | null = null;
    private recordingCtx: OffscreenCanvasRenderingContext2D | null = null;
    private audioContext: OfflineAudioContext | null = null;
    private readonly numberOfChannels: number = 2;
    private readonly sampleRate: number = 48000;
    private readonly studioState = StudioState.getInstance();
    private readonly exportOptions: ExportOptions;
    private readonly qualityPreset: QualityPreset;

    constructor(exportOptions: ExportOptions = {}) {
        this.exportOptions = exportOptions;
        this.qualityPreset = QUALITY_PRESETS[exportOptions.qualityPreset || 'archive'];
        this.output = new Output({
            target: new BufferTarget(),
            format: new Mp4OutputFormat(),
        });

        console.log(`🎯 Quality preset: ${this.qualityPreset.displayName}`);
        console.log(`   Bitrate mode: ${this.qualityPreset.bitrateMode}`);
        console.log(`   Latency mode: ${this.qualityPreset.latencyMode}`);
        console.log(`   Key frame interval: ${this.qualityPreset.keyFrameInterval}s`);
    }

    /**
     * Start the export process using MediaBunny library with BufferTarget approach
     */
    async export(
        progressCallback: ProgressCallback | null = null,
        completionCallback: CompletionCallback | null = null
    ): Promise<void> {
        if (this.isEncoding) {
            console.warn('Export already in progress');
            return;
        }

        this.progressCallback = progressCallback;
        this.completionCallback = completionCallback;

        console.log('🎬 Starting MediaBunny export with BufferTarget approach...');
        console.log('Available medias:', this.studioState.getMedias().length);
        console.log('Audio medias:', this.#getAudioLayers().length);

        this.isEncoding = true;
        this.totalDuration = this.#getTotalDuration();
        this.totalFrames = Math.ceil((this.totalDuration / 1000) * this.frameRate);

        try {
            this.#createRecordingCanvas();
            await this.#setupMediaBunnyOutput();
            await this.#setupAudioContext();
            await this.#renderFramesSynchronously();
            await this.#createAndDownloadFile();
            this.isEncoding = false;

            if (this.progressCallback) {
                this.progressCallback(100);
            }
            if (this.completionCallback) {
                this.completionCallback();
            }
            console.log('✅ Export completed successfully');
        } catch (error) {
            console.error('❌ Error during export:', error);
            this.isEncoding = false;
            if (this.completionCallback) {
                this.completionCallback();
            }
            alert('Failed to export video: ' + (error as Error).message);
        }
    }

    /**
     * Create a separate OffscreenCanvas for recording
     */
    #createRecordingCanvas(): void {
        const dimensions = getExportDimensions();
        this.recordingCanvas = new OffscreenCanvas(dimensions.width, dimensions.height);
        this.recordingCtx = this.recordingCanvas.getContext('2d', {
            alpha: false,
            desynchronized: true, // Better performance
            colorSpace: 'srgb', // Better color space
            willReadFrequently: false
        });

        if (this.recordingCtx) {
            this.recordingCtx.imageSmoothingEnabled = true;
            this.recordingCtx.imageSmoothingQuality = 'high';
        }
    }

    /**
     * Set up MediaBunny output with BufferTarget and proper codec selection
     */
    async #setupMediaBunnyOutput(): Promise<void> {
        if (!this.recordingCanvas) {
            throw new Error('Recording canvas not initialized');
        }

        this.output = new Output({
            target: new BufferTarget(),
            format: new Mp4OutputFormat(),
        });

        const exportWidth = this.recordingCanvas.width;
        const exportHeight = this.recordingCanvas.height;

        // Use smart codec selection that prioritizes quality
        const videoCodec = await selectBestVideoCodec(
            this.output.format.getSupportedVideoCodecs(),
            {
                width: exportWidth,
                height: exportHeight,
                preferredCodecs: this.exportOptions.preferredCodecs,
                fallbackToFirst: true
            }
        );

        if (!videoCodec) {
            throw new Error('Your browser doesn\'t support video encoding.');
        }

        console.log('🎥 Using video codec:', videoCodec);
        console.log(`🎥 Export resolution: ${exportWidth}x${exportHeight}`);

        // Calculate bitrate based on resolution and quality preset
        const bitrate = this.exportOptions.customBitrate ||
                       (typeof this.qualityPreset.bitrate === 'number'
                         ? calculateBitrate(exportWidth, exportHeight, this.qualityPreset)
                         : this.qualityPreset.bitrate);

        console.log(`🎥 Bitrate: ${typeof bitrate === 'number' ? (bitrate / 1_000_000).toFixed(1) + ' Mbps' : 'Quality preset ' + this.qualityPreset.name}`);

        this.canvasSource = new CanvasSource(this.recordingCanvas, {
            codec: videoCodec,
            bitrate: bitrate,
            bitrateMode: this.qualityPreset.bitrateMode,
            latencyMode: this.qualityPreset.latencyMode,
            keyFrameInterval: this.qualityPreset.keyFrameInterval,
            hardwareAcceleration: this.exportOptions.hardwareAcceleration || 'no-preference',
            onEncoderConfig: (config) => {
                console.log('Video encoder config:', config);
            }
        });

        this.output.addVideoTrack(this.canvasSource, { frameRate: this.frameRate });
        
        const audioLayers = this.#getAudioLayers();
        if (audioLayers.length > 0) {
            const audioCodec = await getFirstEncodableAudioCodec(
                this.output.format.getSupportedAudioCodecs(),
                {
                    numberOfChannels: this.numberOfChannels,
                    sampleRate: this.sampleRate,
                }
            );

            if (audioCodec) {
                console.log('🎵 Using audio codec:', audioCodec);
                this.audioBufferSource = new AudioBufferSource({
                    codec: audioCodec,
                    bitrate: QUALITY_VERY_HIGH,
                });
                this.output.addAudioTrack(this.audioBufferSource);
            } else {
                console.warn('No audio codec available, exporting video only');
            }
        }
        await this.output.start();
    }

    /**
     * Setup audio context for offline rendering
     */
    async #setupAudioContext(): Promise<void> {
        const audioLayers = this.#getAudioLayers();
        if (audioLayers.length === 0 || !this.audioBufferSource) {
            return;
        }
        const durationInSeconds = this.totalDuration / 1000;
        this.audioContext = new OfflineAudioContext(
            this.numberOfChannels,
            this.sampleRate * durationInSeconds,
            this.sampleRate
        );
    }

    /**
     * Render frames synchronously
     */
    async #renderFramesSynchronously(): Promise<void> {
        if (!this.canvasSource) {
            throw new Error('Canvas source not initialized');
        }

        for (let currentFrame = 0; currentFrame < this.totalFrames; currentFrame++) {

            const currentTime = (currentFrame / this.frameRate) * 1000; // Convert to milliseconds
            const videoProgress = currentFrame / this.totalFrames;
            const overallProgress = videoProgress * (this.audioBufferSource ? 0.9 : 0.95);

            if (this.progressCallback) {
                this.progressCallback(Math.round(overallProgress * 100));
            }
            await this.#renderFrameAtTime(currentTime);

            // Add frame to video encoder - await is crucial for backpressure
            await this.canvasSource.add(currentTime / 1000, 1 / this.frameRate);
        }

        this.canvasSource.close();

        // Render audio if available
        if (this.audioBufferSource && this.audioContext) {
            if (this.progressCallback) {
                this.progressCallback(90);
            }

            await this.#renderAudioOffline();
        }

        // Finalize the output
        if (this.progressCallback) {
            this.progressCallback(95);
        }

        console.log('🔄 Finalizing output...');
        await this.output!.finalize();
    }

    /**
     * Render audio using offline audio context
     */
    async #renderAudioOffline(): Promise<void> {
        if (!this.audioBufferSource || !this.audioContext) {
            return;
        }

        console.log('🎵 Rendering audio offline...');
        for (const layer of this.#getAudioLayers()) {
            if (layer.audioBuffer) {
                layer.connectAudioSource(this.audioContext);
                layer.playStart(layer.startTime);
            }
        }

        const audioBuffer = await this.audioContext.startRendering();
        await this.audioBufferSource.add(audioBuffer);
        this.audioBufferSource.close();

        console.log('✅ Audio rendered');
    }

    /**
     * Create and download the final MP4 file
     */
    async #createAndDownloadFile(): Promise<void> {
        if (!this.output) {
            throw new Error('Output not initialized');
        }

        console.log('📁 Creating final MP4 file...');
        const videoBlob = new Blob([this.output.target.buffer!], { type: 'video/mp4' });

        // Create download link
        const url = URL.createObjectURL(videoBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `video-export-${Date.now()}.mp4`;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        const fileSizeMB = (videoBlob.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Export complete! File size: ${fileSizeMB} MB`);
    }

    /**
     * Render a single frame at the specified time
     */
    async #renderFrameAtTime(currentTime: number): Promise<void> {
        if (!this.recordingCtx || !this.recordingCanvas) return;
        this.recordingCtx.clearRect(0, 0, this.recordingCanvas.width, this.recordingCanvas.height);
        const medias = this.studioState.getMedias();
        for (const media of medias) {
            await media.render(this.recordingCtx, currentTime, false);
        }
    }

    /**
     * Calculate total duration from all medias
     */
    #getTotalDuration(): number {
        let maxDuration = 0;
        for (const layer of this.studioState.getMedias()) {
            const layerEnd = layer.startTime + layer.totalTimeInMilSeconds;
            if (layerEnd > maxDuration) {
                maxDuration = layerEnd;
            }
        }
        return maxDuration;
    }

    /**
     * Get audio medias from the studio
     */
    #getAudioLayers(): AbstractClip[] {
        const layers: AbstractClip[] = [];
        for (const layer of this.studioState.getMedias()) {
            if (layer.isAudio()) {
                layers.push(layer);
            }
        }
        return layers;
    }
}
