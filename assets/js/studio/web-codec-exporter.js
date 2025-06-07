import { AudioLayer } from '../layer/layer-audio.js';
import { addElementToBackground } from '../layer/layer-common.js';

/**
 * Class for exporting video using Web Codecs API
 */
export class WebCodecExporter {
    /**
     * @param {VideoStudio} studio
     */
    constructor(studio) {
        this.studio = studio;
        this.encoders = {
            video: null,
            audio: null
        };
        this.encodedChunks = {
            video: [],
            audio: []
        };
        this.frameCounter = 0;
    }

    /**
     * Start the export process using Web Codecs API
     * @param {HTMLElement} exportButton - The button that triggered the export
     * @param {string} tempText - Original button text to restore after export
     */
    export(exportButton, tempText) {
        // Reset encoded chunks
        this.encodedChunks = {
            video: [],
            audio: []
        };
        this.frameCounter = 0;
        
        // Set up video and audio encoding
        this.#setupEncoders();
        
        // Set up callback for when playback ends
        this.studio.player.onend((player) => {
            this.#finishEncodingAndDownload();
            exportButton.textContent = tempText;
            player.pause();
            player.time = 0;
        });

        // Start playback and encoding
        this.studio.pause();
        this.studio.player.time = 0;

        // Set up frame capture loop
        this.#setupFrameCapture();
        
        this.studio.play();
    }

    /**
     * Get audio layers from the studio
     * @returns {Array} Array of audio layers
     */
    getAudioLayers() {
        const layers = [];
        for (let layer of this.studio.getLayers()) {
            if (layer instanceof AudioLayer) {
                layers.push(layer);
            }
        }
        return layers;
    }

    /**
     * Set up video and audio encoders
     * @private
     */
    #setupEncoders() {
        // Video encoder setup
        const videoConfig = {
            codec: 'vp09.00.10.08',
            width: this.studio.player.canvas.width,
            height: this.studio.player.canvas.height,
            bitrate: 5_000_000, // 5 Mbps
            framerate: 30
        };

        this.encoders.video = new VideoEncoder({
            output: (chunk, metadata) => {
                this.encodedChunks.video.push(chunk);
            },
            error: (e) => {
                console.error('Video encoder error:', e);
            }
        });

        this.encoders.video.configure(videoConfig);

        // Audio encoder setup
        const audioLayers = this.getAudioLayers();
        if (audioLayers.length > 0) {
            const audioConfig = {
                codec: 'opus',
                sampleRate: this.studio.player.audioContext.sampleRate,
                numberOfChannels: 2,
                bitrate: 128_000 // 128 kbps
            };

            this.encoders.audio = new AudioEncoder({
                output: (chunk, metadata) => {
                    this.encodedChunks.audio.push(chunk);
                },
                error: (e) => {
                    console.error('Audio encoder error:', e);
                }
            });

            this.encoders.audio.configure(audioConfig);
            
            // Set up audio capture
            this.#setupAudioCapture(audioLayers);
        }
    }

    /**
     * Set up frame capture for video encoding
     * @private
     */
    #setupFrameCapture() {
        const fps = 30;
        const frameInterval = 1000 / fps;
        
        // Create a function to capture frames
        const captureFrame = () => {
            if (!this.studio.player.playing) return;
            
            const canvas = this.studio.player.canvas;
            const frame = new VideoFrame(canvas, {
                timestamp: this.frameCounter * 1000000, // microseconds
                duration: 1000000 / fps
            });
            
            try {
                this.encoders.video.encode(frame);
                frame.close();
            } catch (e) {
                console.error('Error encoding video frame:', e);
            }
            
            this.frameCounter++;
            
            if (this.studio.player.playing) {
                setTimeout(captureFrame, frameInterval);
            }
        };
        
        // Start capturing frames
        captureFrame();
    }

    /**
     * Set up audio capture and encoding
     * @param {Array} audioLayers - Array of audio layers to capture
     * @private
     */
    #setupAudioCapture(audioLayers) {
        const audioContext = this.studio.player.audioContext;
        const audioStreamDestination = audioContext.createMediaStreamDestination();
        
        audioLayers.forEach(layer => {
            layer.audioStreamDestination = audioStreamDestination;
        });

        // Set up audio processor to capture audio data
        const audioStream = audioStreamDestination.stream;
        const audioTrack = audioStream.getAudioTracks()[0];
        
        if (audioTrack) {
            const processor = new MediaStreamTrackProcessor({ track: audioTrack });
            const reader = processor.readable.getReader();
            
            const processAudioChunks = async () => {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        
                        if (this.encoders.audio && this.encoders.audio.state === 'configured') {
                            this.encoders.audio.encode(value);
                            value.close();
                        }
                    }
                } catch (e) {
                    console.error('Error reading audio data:', e);
                }
            };
            
            processAudioChunks();
        }
    }

    /**
     * Finish encoding and download the video
     * @private
     */
    #finishEncodingAndDownload() {
        // Close the encoders
        const videoPromise = this.encoders.video.flush()
            .then(() => this.encoders.video.close());
        
        const audioPromise = this.encoders.audio ? 
            this.encoders.audio.flush().then(() => this.encoders.audio.close()) : 
            Promise.resolve();
        
        // After both encoders are flushed, create a file
        Promise.all([videoPromise, audioPromise])
            .then(() => this.#muxAndDownload())
            .catch(err => console.error('Error finalizing encoding:', err));
    }

    /**
     * Mux audio and video chunks and download the result
     * @private
     */
    #muxAndDownload() {
        // For simplicity, we'll use WebM container format since it's well supported
        console.log('Encoding finished, preparing for download');
        console.log(`Video chunks: ${this.encodedChunks.video.length}`);
        
        if (this.encoders.audio) {
            console.log(`Audio chunks: ${this.encodedChunks.audio.length}`);
        }
        
        // Convert encoded chunks to a blob
        const videoData = this.#assembleVideoData();
        this.#downloadVideo(videoData);
    }
    
    /**
     * Assemble video data from encoded chunks
     * @returns {Blob} - Video data as a Blob
     * @private
     */
    #assembleVideoData() {
        // This is a simplified approach - in a real app, you'd use a proper muxer
        // For now we're just concatenating the video chunks
        const videoChunks = this.encodedChunks.video.map(chunk => {
            return new Uint8Array(chunk.copyTo());
        });
        
        return new Blob(videoChunks, { type: 'video/webm; codecs=vp09.00.10.08' });
    }

    /**
     * Download the video
     * @param {Blob} blob - The video blob to download
     * @private
     */
    #downloadVideo(blob) {
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
     * @param {Blob} blob - The blob to download
     * @private
     */
    #triggerFileDownload(blob) {
        const extension = blob.type.split(';')[0].split('/')[1];
        const filename = (new Date()).getTime() + '.' + extension;
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
}
