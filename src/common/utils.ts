import {createMediaText} from "@/media";

// Minimal TS wrapper for webm-duration-fix via CDN ESM.
// We keep the external URL to avoid adding a dependency right now.
import webmDurationFix from 'https://cdn.jsdelivr.net/npm/webm-duration-fix@1.0.4/+esm';

/**
 * Fixes the duration of a WebM video blob produced by MediaRecorder.
 */
export async function fixWebmDuration(blob: Blob): Promise<Blob> {
  // The CDN module exposes a default export; keep call compatible with existing code.
  const mod: any = webmDurationFix as any;
  return await mod.default?.(blob, {mimeType: blob.type}) ?? mod(blob, {mimeType: blob.type});
}


/**
 * Delays execution for a specified number of milliseconds.
 * Like sleep in other languages.
 * @param ms
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * File extension to MIME type mapping
 */
export const ext_map: Record<string, string> = {
  'mp4': 'video/mp4',
  'mpeg4': 'video/mp4',
  'mpeg': 'video/mpeg',
  'ogv': 'video/ogg',
  'webm': 'video/webm',
  'gif': 'image/gif',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'apng': 'image/apng',
  'avif': 'image/avif',
  'webp': 'image/webp',
  'aac': 'audio/aac',
  'mp3': 'audio/mpeg',
  'oga': 'audio/ogg',
  'wav': 'audio/wav',
  'weba': 'audio/webm'
};

export function popup(text: HTMLElement): void {
  const div = document.createElement('div');
  div.addEventListener('keydown', function (ev) {
    ev.stopPropagation();
  });
  const close = document.createElement('a');
  close.addEventListener('click', function (): void {
    div.remove();
  });
  close.textContent = "[x]";
  close.classList.toggle('close');
  div.appendChild(close);
  div.appendChild(text);
  div.classList.toggle('popup');
  document.body.appendChild(div);
}

declare global {
  interface Window {
    studio: {
      dumpToJson(): string;
      addLayer(layer: any): void;
    };
  }
}

export function exportToJson(): void {
  const date = new Date().getTime();
  const text = document.createElement('div');
  const preamble = document.createElement('span');
  preamble.textContent = "Click on the link below to download the json file:";
  const a = document.createElement('a');

  const json = window.studio.dumpToJson();

  // Create a blob from the JSON content
  const blob = new Blob([json], {type: 'application/json'});
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Set up the download link
  a.href = url;
  a.download = date + "_" + Math.floor(Math.random() * 1000) + ".json";
  a.classList.add('download-link');
  a.textContent = "[Download JSON]";
  a.addEventListener('click', function (): void {
    // After download, revoke the URL to free up memory
    setTimeout((): void => {
      URL.revokeObjectURL(url);
    }, 100);
  });

  text.appendChild(preamble);
  text.appendChild(document.createElement('br'));
  text.appendChild(document.createElement('br'));
  text.appendChild(a);
  text.appendChild(document.createElement('br'));
  text.appendChild(document.createElement('br'));

  // Instead of showing the raw JSON, you could add a preview or message
  const preview = document.createElement('div');
  preview.classList.add('json-preview');
  preview.textContent = "JSON content ready for download";
  text.appendChild(preview);

  popup(text);
}

export function addText(): void {
  const t = prompt("Enter text:");
  if (t) {
    window.studio.addLayer(createMediaText(t, (l, progress, ctx, audioBuffer) => {
    }));
  }
}

export function uploadSupportedType(files: FileList): boolean {
  const badUserExtensions: File[] = [];

  for (const file of files) {
    const extension = file.name.split('.').pop();
    if (extension && !(extension in ext_map)) {
      badUserExtensions.push(file);
    }
  }

  if (badUserExtensions.length) {
    const badFiles = badUserExtensions.map((file: File) => "- " + file.name).join('<br>');
    const text = document.createElement('div');
    text.style.textAlign = "left";
    text.innerHTML = `
      The selected file(s) are not supported:
      <br>
      <br>
      ${badFiles}
      <br><br>
      Please use one of the following file extensions:
      <br><br> mp4, mpeg4, gif, jpg, jpeg, png, aac, mp3
      
      `;
    popup(text);
  }
  return badUserExtensions.length === 0;
}

export function getSupportedMimeTypes(): string[] {
  const VIDEO_TYPES: readonly string[] = [
    "webm",
    "ogg",
    "mp4",
    "x-matroska"
  ];
  const VIDEO_CODECS: readonly string[] = [
    "vp9",
    "vp9.0",
    "vp8",
    "vp8.0",
    "avc1",
    "av1",
    "h265",
    "h.265",
    "h264",
    "h.264",
    "opus",
  ];

  const supportedTypes: string[] = [];
  VIDEO_TYPES.forEach((videoType: string) => {
    const type = `video/${videoType}`;
    VIDEO_CODECS.forEach((codec: string) => {
      const variations: string[] = [
        `${type};codecs=${codec}`,
        `${type};codecs:${codec}`,
        `${type};codecs=${codec.toUpperCase()}`,
        `${type};codecs:${codec.toUpperCase()}`
      ];
      variations.forEach((variation: string) => {
        if (MediaRecorder.isTypeSupported(variation))
          supportedTypes.push(variation);
      });
    });
    if (MediaRecorder.isTypeSupported(type)) supportedTypes.push(type);
  });
  return supportedTypes;
}
