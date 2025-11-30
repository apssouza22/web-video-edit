import {AbstractMedia, createMediaFromFile, createMediaText} from '@/medialayer';

import {ext_map} from '@/common';
import {Frame} from '@/frame';
import {LayerLoadUpdateListener} from "@/medialayer/types";
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
  startTime: number;
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
  addMediaFromFile(file: File): AbstractMedia[] {
    const medias: AbstractMedia[] = [];
    createMediaFromFile(file)
    .forEach(layer => {
      medias.push(layer);
    });
    return medias;
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

    return this.addMediaFromFile(file);
  }

}