import {StandardLayer} from '@/layer';
import {ImageLayer} from '@/layer';
import {VideoLayer} from '@/layer';
import {TextLayer} from '@/layer';
import {AudioLayer} from '@/layer/layer-audio';
import {ext_map} from './index';
import {Frame} from '@/frame';

/**
 * Interface for VideoStudio class used by LayerLoader
 */
interface VideoStudio {
  addLayer(layer: StandardLayer): StandardLayer;
}

/**
 * Interface for layer data from JSON
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
 * LayerLoader class responsible for loading layers from JSON data
 */
export class LayerLoader {
  private studio: VideoStudio;

  /**
   * Constructor for LayerLoader
   * @param studio - The studio instance that will own the layers
   */
  constructor(studio: VideoStudio) {
    this.studio = studio;
  }


  /**
   * Add a layer from a file
   *
   * @param file - The file to add as a layer
   * @param useHtmlDemux - Whether to use HTML demuxing for video
   * @returns The added layers
   */
  addLayerFromFile(file: File, useHtmlDemux: boolean = false): StandardLayer[] {
    const layers: StandardLayer[] = [];
    if (file.type.indexOf('video') >= 0) {
      layers.push(this.studio.addLayer(new AudioLayer(file)));
      layers.push(this.studio.addLayer(new VideoLayer(file, false, useHtmlDemux)));
    }
    if (file.type.indexOf('image') >= 0) {
      layers.push(this.studio.addLayer(new ImageLayer(file)));
    }
    if (file.type.indexOf('audio') >= 0) {
      layers.push(this.studio.addLayer(new AudioLayer(file)));
    }
    return layers;
  }

  /**
   * Load a layer from a URI
   *
   * @param uri - The URI to load the layer from
   * @returns Promise that resolves to the added layers
   */
  async loadLayerFromURI(uri: string): Promise<StandardLayer[] | undefined> {
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

    return this.addLayerFromFile(file);
  }

  /**
   * Load layers from JSON data
   * @param layers - Array of layer data objects
   * @returns Promise that resolves when all layers are loaded
   */
  async loadLayersFromJson(layers: LayerJsonData[]): Promise<StandardLayer[]> {
    const allLayers: StandardLayer[] = [];
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

  #addOnLoadUpdateListener(layersCreated: StandardLayer[], layer_d: LayerJsonData): void {
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

  async #loadLayerType(layer_d: LayerJsonData): Promise<StandardLayer[]> {
    const layersCreated: StandardLayer[] = [];
    if (layer_d.type === "VideoLayer") {
      if (layer_d.uri) {
        const l = await this.loadLayerFromURI(layer_d.uri);
        if (l) {
          layersCreated.push(...l);
        }
      }
    }
    if (layer_d.type === "TextLayer") {
      const layer = this.studio.addLayer(new TextLayer(layer_d.name));
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