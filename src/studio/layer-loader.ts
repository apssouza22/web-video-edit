import {AbstractMedia, MediaService, createMediaFromFile, createMediaText} from '@/media';

import {ext_map} from './index';
import {Frame} from '@/frame';
import {ESRenderingContext2D} from "@/common/render-2d";
import {LayerLoadUpdateListener} from "@/media/types";

/**
 * Interface for VideoStudio class used by LayerLoader
 */
interface VideoStudio {
  addLayer(layer: AbstractMedia): AbstractMedia;
}

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
 * LayerLoader class responsible for loading medias from JSON data
 */
export class LayerLoader {
  private studio: VideoStudio;
  private mediaService: MediaService;

  /**
   * Constructor for LayerLoader
   * @param studio - The studio instance that will own the medias
   */
  constructor(studio: VideoStudio, mediaService: MediaService) {
    this.studio = studio;
    this.mediaService = mediaService;
  }


  /**
   * Add a media from a file
   *
   * @param file - The file to add as a media
   * @param onMediaLoadUpdate - Whether to use HTML demuxing for video
   * @returns The added medias
   */
  addLayerFromFile(file: File, onMediaLoadUpdate: LayerLoadUpdateListener): AbstractMedia[] {
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
  async loadLayerFromURI(uri: string): Promise<AbstractMedia[] | undefined> {
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

    return this.addLayerFromFile(file, (l, progress, ctx, audioBuffer) => {});
  }

  /**
   * Load medias from JSON data
   * @param layers - Array of media data objects
   * @returns Promise that resolves when all medias are loaded
   */
  async loadLayersFromJson(layers: LayerJsonData[]): Promise<AbstractMedia[]> {
    const allLayers: AbstractMedia[] = [];
    for (const layer_d of layers) {
      const layersCreated = await this.#loadLayerType(layer_d);

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
          layer.framesCollection.frames = [];
          for (const f of layer_d.frames) {
            layer.framesCollection.push(Frame.fromArray(new Float32Array(f)));
          }
        }
      });
    })
  }

  async #loadLayerType(layer_d: LayerJsonData): Promise<AbstractMedia[]> {
    const layersCreated: AbstractMedia[] = [];
    if (layer_d.type === "VideoLayer") {
      if (layer_d.uri) {
        const l = await this.loadLayerFromURI(layer_d.uri);
        if (l) {
          layersCreated.push(...l);
        }
      }
    }
    if (layer_d.type === "TextLayer") {
      const layer = this.studio.addLayer(createMediaText(layer_d.name, (l, progress, ctx, audioBuffer) => {}));
      layersCreated.push(layer);
    }
    if (layer_d.type === "ImageLayer") {
      if (layer_d.uri) {
        const l = await this.loadLayerFromURI(layer_d.uri);
        if (l) {
          layersCreated.push(...l);
        }
      }
    }
    return layersCreated;
  }
}