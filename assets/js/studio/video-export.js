class VideoExporter {

    /**
     * 
     * @param {VideoStudio} studio
     */
    constructor(studio) {
        this.studio = studio;
    }

    init() {
        document.getElementById('export').addEventListener('click', this.export.bind(this));
    }

    export(ev) {
        if (ev.shiftKey) {
            exportToJson();
            return;
        }
        if (this.studio.getLayers().length === 0) {
            alert("Nothing to export.");
            return;
        }
        const availableTypes = getSupportedMimeTypes();
        if (availableTypes.length === 0) {
            alert("Cannot export! Please use a screen recorder instead.");
        }
        const exportButton = document.getElementById('export');
        const tempText = exportButton.textContent;
        exportButton.textContent = "Exporting...";
        const stream = this.studio.player.canvas.captureStream();

        let audioLayers = this.getAudioLayers();
        if (audioLayers.length > 0) {
            const audioStreamDestination = this.studio.player.audioContext.createMediaStreamDestination();
            audioLayers.forEach(layer => {
                layer.audioStreamDestination = audioStreamDestination;
            });
            let tracks = audioStreamDestination.stream.getAudioTracks();
            stream.addTrack(tracks[0]);
        }
        this.#startMediaRecord(stream, exportButton, tempText, availableTypes);
    }

    #startMediaRecord(stream, exportButton, tempText, availableTypes) {
        const chunks = [];
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = e => chunks.push(e.data);

        rec.onstop = e => this.#downloadVideo(new Blob(chunks, { type: availableTypes[0] }));
        this.studio.player.onend(function (player) {
            rec.stop();
            exportButton.textContent = tempText;
            player.pause();
            player.time = 0;
        });

        this.studio.pause();
        this.studio.player.time = 0;
        this.studio.play();
        rec.start();
    }

    getAudioLayers() {
        const layers = []
        for (let layer of this.studio.getLayers()) {
            if (layer instanceof AudioLayer) {
                layers.push(layer);
            }
        }
        return layers;
    }

    #downloadVideo(blob) {
        console.log("Warning: Exported video may need to be fixed with CloudConvert.com or similar tools.");
        const vid = document.createElement('video');
        vid.controls = true;
        vid.src = URL.createObjectURL(blob);
        addElementToBackground(vid);
        this.triggerFileDownload(blob);

        vid.currentTime = Number.MAX_SAFE_INTEGER;
    }

    triggerFileDownload(blob) {
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