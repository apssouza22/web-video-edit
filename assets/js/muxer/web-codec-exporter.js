import { AudioLayer } from '../layer/layer-audio.js';
import { addElementToBackground } from '../layer/layer-common.js';

/**
 * Class for exporting video using Web Codecs API
 *
 * This is not currently working
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
        this.audioReader = null;
        this.isEncoding = false;
        this.exportStartTime = 0;
        this.progressCallback = null;
        this.completionCallback = null;
        this.totalFrames = 0;
        this.totalDuration = 0;
    }

    /**
     * Start the export process using Web Codecs API
     * @param {HTMLElement} exportButton - The button that triggered the export
     * @param {string} tempText - Original button text to restore after export
     * @param {Function} progressCallback - Callback function to report progress (0-100)
     * @param {Function} completionCallback - Callback function to call when export is complete
     */
    async export(exportButton, tempText, progressCallback = null, completionCallback = null) {
        if (this.isEncoding) {
            console.warn('Export already in progress');
            return;
        }

        this.progressCallback = progressCallback;
        this.completionCallback = completionCallback;

        console.log('🎬 Starting WebCodec export...');
        console.log('Canvas dimensions:', this.studio.player.canvas.width, 'x', this.studio.player.canvas.height);
        console.log('Available layers:', this.studio.getLayers().length);
        console.log('Audio layers:', this.getAudioLayers().length);

        this.isEncoding = true;
        this.exportStartTime = performance.now();
        
        // Calculate total duration and expected frames
        this.totalDuration = this.#getTotalDuration();
        this.totalFrames = Math.ceil(this.totalDuration * 30); // 30 FPS
        
        // Reset encoded chunks
        this.encodedChunks = {
            video: [],
            audio: []
        };
        this.frameCounter = 0;
        
        try {
            // Set up video and audio encoding
            await this.#setupEncoders();
            
            // Set up callback for when playback ends
            this.studio.player.onend(async (player) => {
                console.log('🏁 Playback ended, finalizing export...');
                await this.#finishEncodingAndDownload();
                player.pause();
                player.time = 0;
                this.isEncoding = false;
                const totalTime = ((performance.now() - this.exportStartTime) / 1000).toFixed(2);
                console.log(`✅ Export completed in ${totalTime}s`);
                if (this.completionCallback) this.completionCallback();
            });

            // Start playback and encoding
            this.studio.pause();
            this.studio.player.time = 0;

            this.#setupFrameCapture();
            
            console.log('▶️ Starting playback for encoding...');
            this.studio.play();
        } catch (error) {
            console.error('❌ Error starting export:', error);
            this.isEncoding = false;
            if (this.completionCallback) this.completionCallback();
            alert('Failed to start video export: ' + error.message);
        }
    }

    /**
     * Calculate total duration from all layers
     * @returns {number} Total duration in seconds
     * @private
     */
    #getTotalDuration() {
        let maxDuration = 0;
        for (let layer of this.studio.getLayers()) {
            const layerEnd = layer.start_time + layer.total_time;
            if (layerEnd > maxDuration) {
                maxDuration = layerEnd;
            }
        }
        return maxDuration;
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
    async #setupEncoders() {
        console.log('🔧 Setting up encoders...');
        
        // Try different video configs in order of preference
        const videoConfigs = [
            {
                codec: 'avc1.42E01E', // H.264 Baseline
                width: this.studio.player.canvas.width,
                height: this.studio.player.canvas.height,
                bitrate: 5_000_000,
                framerate: 30,
                bitrateMode: 'constant'
            },
            {
                codec: 'avc1.4D401E', // H.264 Main
                width: this.studio.player.canvas.width,
                height: this.studio.player.canvas.height,
                bitrate: 5_000_000,
                framerate: 30,
                bitrateMode: 'constant'
            },
            {
                codec: 'vp09.00.10.08', // VP9
                width: this.studio.player.canvas.width,
                height: this.studio.player.canvas.height,
                bitrate: 5_000_000,
                framerate: 30
            }
        ];

        let videoConfig = null;
        for (const config of videoConfigs) {
            console.log(`Testing video codec: ${config.codec}`);
            try {
                const supported = await VideoEncoder.isConfigSupported(config);
                if (supported.supported) {
                    videoConfig = config;
                    console.log(`✅ Video codec ${config.codec} is supported`);
                    break;
                } else {
                    console.log(`❌ Video codec ${config.codec} not supported`);
                }
            } catch (e) {
                console.log(`❌ Error testing codec ${config.codec}:`, e);
            }
        }

        if (!videoConfig) {
            throw new Error('No supported video codec found');
        }

        this.encoders.video = new VideoEncoder({
            output: (chunk, metadata) => {
                console.log(`📹 Video chunk: ${chunk.byteLength} bytes, type: ${chunk.type}, timestamp: ${chunk.timestamp}`);
                this.encodedChunks.video.push(chunk);
            },
            error: (e) => {
                console.error('❌ Video encoder error:', e);
            }
        });

        this.encoders.video.configure(videoConfig);
        console.log('✅ Video encoder configured:', videoConfig);

        // Audio encoder setup
        const audioLayers = this.getAudioLayers();
        if (audioLayers.length > 0) {
            console.log('🔊 Setting up audio encoder...');
            
            const audioConfigs = [
                {
                    codec: 'mp4a.40.2', // AAC
                    sampleRate: this.studio.player.audioContext.sampleRate,
                    numberOfChannels: 2,
                    bitrate: 128_000
                },
                {
                    codec: 'opus',
                    sampleRate: this.studio.player.audioContext.sampleRate,
                    numberOfChannels: 2,
                    bitrate: 128_000
                }
            ];

            let audioConfig = null;
            for (const config of audioConfigs) {
                console.log(`Testing audio codec: ${config.codec}`);
                try {
                    const supported = await AudioEncoder.isConfigSupported(config);
                    if (supported.supported) {
                        audioConfig = config;
                        console.log(`✅ Audio codec ${config.codec} is supported`);
                        break;
                    } else {
                        console.log(`❌ Audio codec ${config.codec} not supported`);
                    }
                } catch (e) {
                    console.log(`❌ Error testing audio codec ${config.codec}:`, e);
                }
            }

            if (!audioConfig) {
                console.warn('⚠️ No supported audio codec found, exporting video only');
            } else {
                this.encoders.audio = new AudioEncoder({
                    output: (chunk, metadata) => {
                        console.log(`🔊 Audio chunk: ${chunk.byteLength} bytes, type: ${chunk.type}, timestamp: ${chunk.timestamp}`);
                        this.encodedChunks.audio.push(chunk);
                    },
                    error: (e) => {
                        console.error('❌ Audio encoder error:', e);
                    }
                });

                this.encoders.audio.configure(audioConfig);
                console.log('✅ Audio encoder configured:', audioConfig);
                
                // Set up audio capture
                await this.#setupAudioCapture(audioLayers);
            }
        } else {
            console.log('ℹ️ No audio layers found, video only export');
        }
    }

    /**
     * Set up frame capture for video encoding
     * @private
     */
    #setupFrameCapture() {
        console.log('📸 Setting up frame capture...');
        const fps = 30;
        const frameInterval = 1000 / fps;
        let lastFrameTime = 0;
        let frameCount = 0;
        
        // Create a function to capture frames
        const captureFrame = () => {
            if (!this.studio.player.playing || !this.isEncoding) return;
            
            const now = performance.now();
            if (now - lastFrameTime >= frameInterval) {
                const canvas = this.studio.player.canvas;
                
                // Create VideoFrame with proper timestamp
                const timestamp = this.frameCounter * (1000000 / fps); // microseconds
                const frame = new VideoFrame(canvas, {
                    timestamp: timestamp,
                    duration: 1000000 / fps
                });
                
                try {
                    if (this.encoders.video && this.encoders.video.state === 'configured') {
                        this.encoders.video.encode(frame, { keyFrame: frameCount % 30 === 0 });
                        frameCount++;
                        
                        // Update progress based on frames encoded
                        if (this.progressCallback && this.totalFrames > 0) {
                            const progress = Math.min((frameCount / this.totalFrames) * 100, 99); // Cap at 99%
                            this.progressCallback(progress);
                        }
                        
                        if (frameCount % 30 === 0) {
                            console.log(`📹 Encoded ${frameCount} frames (${(frameCount / fps).toFixed(1)}s)`);
                        }
                    }
                    frame.close();
                } catch (e) {
                    console.error('❌ Error encoding video frame:', e);
                }
                
                this.frameCounter++;
                lastFrameTime = now;
            }
            
            if (this.studio.player.playing && this.isEncoding) {
                requestAnimationFrame(captureFrame);
            }
        };

        // Start frame capture
        requestAnimationFrame(captureFrame);
    }

    /**
     * Set up audio capture and encoding
     * @param {Array} audioLayers - Array of audio layers to capture
     * @private
     */
    async #setupAudioCapture(audioLayers) {
        console.log('🎤 Setting up audio capture...');
        const audioContext = this.studio.player.audioContext;
        const audioStreamDestination = audioContext.createMediaStreamDestination();
        
        audioLayers.forEach(layer => {
            layer.audioStreamDestination = audioStreamDestination;
        });

        // Set up audio processor to capture audio data
        const audioStream = audioStreamDestination.stream;
        const audioTrack = audioStream.getAudioTracks()[0];
        
        if (audioTrack && 'MediaStreamTrackProcessor' in window) {
            try {
                const processor = new MediaStreamTrackProcessor({ track: audioTrack });
                this.audioReader = processor.readable.getReader();
                console.log('✅ Audio capture setup complete');
                
                // Start processing audio chunks
                this.#processAudioChunks();
            } catch (e) {
                console.error('❌ Error setting up audio capture:', e);
                // Fallback: disable audio encoding if MediaStreamTrackProcessor is not available
                this.encoders.audio = null;
            }
        } else {
            console.warn('⚠️ MediaStreamTrackProcessor not available, audio will not be included');
            this.encoders.audio = null;
        }
    }

    /**
     * Process audio chunks asynchronously
     * @private
     */
    async #processAudioChunks() {
        let audioChunkCount = 0;
        try {
            while (this.isEncoding && this.audioReader) {
                const { value, done } = await this.audioReader.read();
                if (done) break;
                
                if (this.encoders.audio && this.encoders.audio.state === 'configured') {
                    try {
                        this.encoders.audio.encode(value);
                        value.close();
                        audioChunkCount++;
                        
                        if (audioChunkCount % 100 === 0) {
                            console.log(`🔊 Processed ${audioChunkCount} audio chunks`);
                        }
                    } catch (e) {
                        console.error('❌ Error encoding audio chunk:', e);
                    }
                } else if (value) {
                    value.close();
                }
            }
        } catch (e) {
            console.error('❌ Error reading audio data:', e);
        }
        console.log(`✅ Audio processing complete (${audioChunkCount} chunks processed)`);
    }

    /**
     * Finish encoding and download the video
     * @private
     */
    async #finishEncodingAndDownload() {
        console.log('🔄 Finalizing encoding...');
        
        // Stop audio processing
        if (this.audioReader) {
            try {
                await this.audioReader.cancel();
                this.audioReader = null;
                console.log('✅ Audio reader stopped');
            } catch (e) {
                console.error('❌ Error stopping audio reader:', e);
            }
        }

        // Close the encoders
        const promises = [];
        
        if (this.encoders.video) {
            console.log('🔄 Flushing video encoder...');
            promises.push(
                this.encoders.video.flush()
                    .then(() => {
                        console.log('✅ Video encoder flushed');
                        return this.encoders.video.close();
                    })
                    .then(() => console.log('✅ Video encoder closed'))
                    .catch(e => console.error('❌ Error closing video encoder:', e))
            );
        }
        
        if (this.encoders.audio) {
            console.log('🔄 Flushing audio encoder...');
            promises.push(
                this.encoders.audio.flush()
                    .then(() => {
                        console.log('✅ Audio encoder flushed');
                        return this.encoders.audio.close();
                    })
                    .then(() => console.log('✅ Audio encoder closed'))
                    .catch(e => console.error('❌ Error closing audio encoder:', e))
            );
        }
        
        // After both encoders are flushed, create a file
        try {
            await Promise.all(promises);
            console.log('✅ All encoders closed');
            await this.#muxAndDownload();
        } catch (err) {
            console.error('❌ Error finalizing encoding:', err);
        }
    }

    /**
     * Mux audio and video chunks and download the result
     * @private
     */
    async #muxAndDownload() {
        console.log('📦 Starting muxing process...');
        console.log(`📊 Final stats - Video chunks: ${this.encodedChunks.video.length}, Audio chunks: ${this.encodedChunks.audio.length}`);
        
        // Log chunk details
        if (this.encodedChunks.video.length > 0) {
            const firstVideo = this.encodedChunks.video[0];
            const lastVideo = this.encodedChunks.video[this.encodedChunks.video.length - 1];
            console.log(`📹 Video: First chunk: ${firstVideo.byteLength} bytes, type: ${firstVideo.type}`);
            console.log(`📹 Video: Last chunk: ${lastVideo.byteLength} bytes, type: ${lastVideo.type}`);
            
            let totalVideoSize = this.encodedChunks.video.reduce((sum, chunk) => sum + chunk.byteLength, 0);
            console.log(`📹 Total video size: ${(totalVideoSize / 1024 / 1024).toFixed(2)} MB`);
        }
        
        if (this.encodedChunks.audio.length > 0) {
            const firstAudio = this.encodedChunks.audio[0];
            const lastAudio = this.encodedChunks.audio[this.encodedChunks.audio.length - 1];
            console.log(`🔊 Audio: First chunk: ${firstAudio.byteLength} bytes, type: ${firstAudio.type}`);
            console.log(`🔊 Audio: Last chunk: ${lastAudio.byteLength} bytes, type: ${lastAudio.type}`);
            
            let totalAudioSize = this.encodedChunks.audio.reduce((sum, chunk) => sum + chunk.byteLength, 0);
            console.log(`🔊 Total audio size: ${(totalAudioSize / 1024 / 1024).toFixed(2)} MB`);
        }
        
        // Convert encoded chunks to a blob
        const videoData = await this.#assembleVideoData();
        console.log(`📦 Final blob size: ${(videoData.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📦 Final blob type: ${videoData.type}`);
        
        this.#downloadVideo(videoData);
    }
    
    /**
     * Assemble video data from encoded chunks
     * @returns {Blob} - Video data as a Blob
     * @private
     */
    async #assembleVideoData() {
        console.log('🔧 Assembling video data...');
        
        // Use MP4 container for H.264 content, WebM for VP9
        const isH264 = this.encodedChunks.video.length > 0 && 
                      this.encodedChunks.video[0].type && 
                      this.encodedChunks.video[0].type === 'key';
        
        // Try to create a simple container by concatenating chunks
        const allChunks = [];
        
        // Sort video chunks by timestamp
        this.encodedChunks.video.sort((a, b) => a.timestamp - b.timestamp);
        
        // Process video chunks
        for (const chunk of this.encodedChunks.video) {
            try {
                const buffer = new ArrayBuffer(chunk.byteLength);
                chunk.copyTo(buffer);
                allChunks.push(new Uint8Array(buffer));
            } catch (e) {
                console.error('❌ Error processing video chunk:', e);
            }
        }
        
        // Process audio chunks if available
        if (this.encoders.audio && this.encodedChunks.audio.length > 0) {
            // Sort audio chunks by timestamp
            this.encodedChunks.audio.sort((a, b) => a.timestamp - b.timestamp);
            
            for (const chunk of this.encodedChunks.audio) {
                try {
                    const buffer = new ArrayBuffer(chunk.byteLength);
                    chunk.copyTo(buffer);
                    allChunks.push(new Uint8Array(buffer));
                } catch (e) {
                    console.error('❌ Error processing audio chunk:', e);
                }
            }
        }
        
        // Create blob with appropriate MIME type
        const mimeType = this.encoders.audio ? 
            'video/mp4' : 
            'video/mp4';
            
        console.log(`📦 Creating blob with MIME type: ${mimeType}`);
        console.log(`📦 Total chunks: ${allChunks.length}`);
        
        const blob = new Blob(allChunks, { type: mimeType });
        
        // Test if the blob can be played
        this.#testBlobPlayback(blob);
        
        return blob;
    }

    /**
     * Test if the generated blob can be played
     * @param {Blob} blob - The video blob to test
     * @private
     */
    #testBlobPlayback(blob) {
        console.log('🧪 Testing blob playback...');
        const testVideo = document.createElement('video');
        testVideo.style.display = 'none';
        
        testVideo.onloadedmetadata = () => {
            console.log('✅ Blob can be loaded as video');
            console.log(`📊 Video duration: ${testVideo.duration}s`);
            console.log(`📊 Video dimensions: ${testVideo.videoWidth}x${testVideo.videoHeight}`);
            document.body.removeChild(testVideo);
            URL.revokeObjectURL(testVideo.src);
        };
        
        testVideo.onerror = (e) => {
            console.error('❌ Blob cannot be played as video:', e);
            document.body.removeChild(testVideo);
            URL.revokeObjectURL(testVideo.src);
        };
        
        testVideo.src = URL.createObjectURL(blob);
        document.body.appendChild(testVideo);
    }

    /**
     * Download the video
     * @param {Blob} blob - The video blob to download
     * @private
     */
    #downloadVideo(blob) {
        console.log("📥 Starting download...");
        console.log("⚠️ Note: The exported video is created by concatenating encoded chunks.");
        console.log("⚠️ This creates a basic video stream but may not have proper container metadata.");
        console.log("⚠️ If the video doesn't play, try using CloudConvert.com or similar tools to fix the container.");
        
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
        const extension = 'mp4'; // Force MP4 extension
        const filename = `video_export_${(new Date()).getTime()}.${extension}`;
        console.log(`📥 Downloading as: ${filename}`);
        
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
