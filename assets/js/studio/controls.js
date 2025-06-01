class StudioControls {
  constructor(studio) {
    this.studio = studio;

  }

  init() {
    window.addEventListener('drop', this.#onFileDrop.bind(this));
    window.addEventListener('keydown', this.#onKeydown.bind(this));
    window.addEventListener('paste',  this.#onPaste.bind(this));

    window.addEventListener('dragover', function (e) {
      console.log("dragging over..");
      e.preventDefault();
    });
    window.addEventListener('resize', function () {
      studio.resize();
    });

    window.addEventListener("touchmove", function (e) {
      e.preventDefault();
    }, {passive: false});
  }

  #onPaste(ev) {
    let uri = (event.clipboardData || window.clipboardData).getData('text');
    this.studio.layerLoader.loadLayerFromURI(uri);
  }

  #onFileDrop(ev) {
    ev.preventDefault();
    if (!ev.dataTransfer.items) {
      return
    }
    for (let i = 0; i < ev.dataTransfer.items.length; i++) {
      let item = ev.dataTransfer.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        studio.layerLoader.addLayerFromFile(file);
        return;
      }
      if (item.kind === 'string' && item.type === 'text/uri-list') {
        item.getAsString(studio.layerLoader.loadLayerFromURI);
      }
    }
  }

  #onKeydown(ev) {
    if (ev.code === "Space") {
      if (this.studio.player.playing) {
        this.studio.pause();
      } else {
        this.studio.play();
      }
      return;
    }
    if (ev.code === "KeyS") {
      this.studio.split();
      return;
    }
    if (ev.code === "KeyJ") {
      if (ev.ctrlKey) {
        exportToJson();
      }
    }
  }

}




