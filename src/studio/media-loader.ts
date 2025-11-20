import {AbstractMedia, createMediaFromFile, createMediaText} from '@/media';

import {ext_map} from '@/common';
import {Frame} from '@/frame';
import {LayerLoadUpdateListener} from "@/media/types";
import {VideoStudio} from "./studio";


/**
 * Interface for media data from JSON
 */
interface LayerJsonData {
  type: string;
  name: string;
  uri?: string;
  width: number;
  height: number;
  start_time: number;
  total_time: number;
  frames?: Float32Array[];
}

/**
 * MediaLoader class responsible for loading medias from JSON data
 */
export class MediaLoader {
  private studio: VideoStudio;

  /**
   * Constructor for MediaLoader
   * @param studio - The studio instance that will own the medias
   */
  constructor(studio: VideoStudio) {
    this.studio = studio;
  }


  /**
   * Add a media from a file
   *
   * @param file - The file to add as a media
   * @param onMediaLoadUpdate - Whether to use HTML demuxing for video
   * @returns The added medias
   */
  addMediaFromFile(file: File, onMediaLoadUpdate: LayerLoadUpdateListener): AbstractMedia[] {
    const layers: AbstractMedia[] = [];
    createMediaFromFile(file, onMediaLoadUpdate)
    .forEach(layer => {
      layers.push(this.studio.addLayer(layer));
    });
    return layers;
  }

  /**
   * Load a media from a URI
   *
   * @param uri - The URI to load the media from
   * @returns Promise that resolves to the added medias
   */
  async loadMediaFromURI(uri: string): Promise<AbstractMedia[] | undefined> {
    if (!uri) {
      return;
    }
    const extension = uri.split(/[#?]/)[0].split('.').pop()?.trim();
    if (!extension) {
      return;
    }

    const metadata = {
      type: ext_map[extension]
    };
    const response = await fetch(uri);
    const data = await response.blob();

    const segs = uri.split("/");
    const name = segs[segs.length - 1];
    const file = new File([data], name, metadata) as File & { uri?: string };
    file.uri = uri;

    return this.addMediaFromFile(file, (l, progress, ctx, audioBuffer) => {});
  }

  /**
   * Load medias from JSON data
   * @param layers - Array of media data objects
   * @returns Promise that resolves when all medias are loaded
   */
  async loadLayersFromJson(layers: LayerJsonData[]): Promise<AbstractMedia[]> {
    const allLayers: AbstractMedia[] = [];
    for (const layer_d of layers) {
      const layersCreated = await this.#loadMediaType(layer_d);

      if (!layersCreated.length) {
        alert("Layer couldn't be processed.");
        continue;
      }
      allLayers.push(...layersCreated);
      this.#addOnLoadUpdateListener(layersCreated, layer_d);
    }
    return allLayers;
  }

  #addOnLoadUpdateListener(layersCreated: AbstractMedia[], layer_d: LayerJsonData): void {
    layersCreated.forEach(layer => {
      layer.addLoadUpdateListener((l, progress, ctx, audioBuffer) => {
        if (progress < 100) {
          return
        }
        layer.name = layer.name;
        layer.width = layer_d.width;
        layer.height = layer_d.height;
        layer.start_time = layer_d.start_time;
        layer.totalTimeInMilSeconds = layer_d.total_time;

        if (layer_d.frames) {
          layer.frameService.frames = [];
          for (const f of layer_d.frames) {
            layer.frameService.push(Frame.fromArray(new Float32Array(f)));
          }
        }
      });
    })
  }

  async #loadMediaType(layer_d: LayerJsonData): Promise<AbstractMedia[]> {
    const layersCreated: AbstractMedia[] = [];
    if (layer_d.type === "VideoMedia") {
      if (layer_d.uri) {
        const l = await this.loadMediaFromURI(layer_d.uri);
        if (l) {
          layersCreated.push(...l);
        }
      }
    }
    if (layer_d.type === "TextMedia") {
      const layer = this.studio.addLayer(createMediaText(layer_d.name, (l, progress, ctx, audioBuffer) => {}));
      layersCreated.push(layer);
    }
    if (layer_d.type === "ImageMedia") {
      if (layer_d.uri) {
        const l = await this.loadMediaFromURI(layer_d.uri);
        if (l) {
          layersCreated.push(...l);
        }
      }
    }
    return layersCreated;
  }
}