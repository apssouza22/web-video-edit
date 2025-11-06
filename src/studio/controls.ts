import { exportToJson } from './utils';
import {VideoStudio} from "@/studio/studio";

export class StudioControls {
  private studio: VideoStudio;

  constructor(studio: VideoStudio) {
    this.studio = studio;
  }

  init(): void {
    window.addEventListener('drop', this.#onFileDrop.bind(this));
    window.addEventListener('keydown', this.#onKeydown.bind(this));
    window.addEventListener('paste',  this.#onPaste.bind(this));

    window.addEventListener('dragover', function (e: DragEvent): void {
      console.log("dragging over..");
      e.preventDefault();
    });
    window.addEventListener('resize', (): void => {
      this.studio.resize();
    });

    window.addEventListener("touchmove", function (e: TouchEvent): void {
      e.preventDefault();
    }, {passive: false});
  }

  #onPaste(ev: ClipboardEvent): void {
    const uri = (ev.clipboardData || (window as any).clipboardData)?.getData('text');
    if (uri) {
      this.studio.layerLoader.loadLayerFromURI(uri);
    }
  }

  #onFileDrop(ev: DragEvent): void {
    ev.preventDefault();
    if (!ev.dataTransfer?.items) {
      return
    }
    for (let i = 0; i < ev.dataTransfer.items.length; i++) {
      const item = ev.dataTransfer.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          this.studio.layerLoader.addLayerFromFile(file, (progress: number, layerName: string) => {
            console.log(`Loading ${layerName}: ${progress * 100}%`);
          });
        }
        return;
      }
      if (item.kind === 'string' && item.type === 'text/uri-list') {
        item.getAsString((uri: string) => {
          this.studio.layerLoader.loadLayerFromURI(uri);
        });
      }
    }
  }

  #onKeydown(ev: KeyboardEvent): void {
    if (ev.code === "Space") {
      if (this.studio.player.playing) {
        this.studio.pause();
      } else {
        this.studio.play();
      }
      return;
    }
    if (ev.code === "KeyJ") {
      if (ev.ctrlKey) {
        exportToJson();
      }
    }
  }
}
