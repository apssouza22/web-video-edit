
import { TextLayer } from '../layer/layer-text.js';

/**
 * File extension to MIME type mapping
 */
export const ext_map = {
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

export function popup(text) {
    const div = document.createElement('div');
    div.addEventListener('keydown', function (ev) {
        ev.stopPropagation();
    });
    const close = document.createElement('a');
    close.addEventListener('click', function () {
        div.remove();
    });
    close.textContent = "[x]";
    close.classList.toggle('close');
    div.appendChild(close);
    div.appendChild(text);
    div.classList.toggle('popup');
    document.body.appendChild(div);
}


export function exportToJson() {
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
    a.textContent = "[Download JSON]";
    a.addEventListener('click', function () {
        // After download, revoke the URL to free up memory
        setTimeout(() => {
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

export function addText() {
    let t = prompt("Enter text:");
    if (t) {
        window.studio.addLayer(new TextLayer(t));
    }
}

export function uploadSupportedType(files) {
    let badUserExtensions = [];

    for (let file of files) {
        let extension = file.name.split('.').pop();
        if (!(extension in ext_map)) {
            badUserExtensions.push(file)
        }
    }

    if (badUserExtensions.length) {
        const badFiles = badUserExtensions.map((ext) => "- " + ext.name).join('<br>');
        const text = document.createElement('div');
        text.style.textAlign = "left";
        text.innerHTML = `
      The selected file(s) are not supported:
      <br>
      <br>
      ${badFiles}
      `;
        popup(text);
    }
    return !badUserExtensions.length > 0;
}



export function getSupportedMimeTypes() {
    const VIDEO_TYPES = [
        "webm",
        "ogg",
        "mp4",
        "x-matroska"
    ];
    const VIDEO_CODECS = [
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

    const supportedTypes = [];
    VIDEO_TYPES.forEach((videoType) => {
        const type = `video/${videoType}`;
        VIDEO_CODECS.forEach((codec) => {
            const variations = [
                `${type};codecs=${codec}`,
                `${type};codecs:${codec}`,
                `${type};codecs=${codec.toUpperCase()}`,
                `${type};codecs:${codec.toUpperCase()}`
            ]
            variations.forEach(variation => {
                if (MediaRecorder.isTypeSupported(variation))
                    supportedTypes.push(variation);
            })
        });
        if (MediaRecorder.isTypeSupported(type)) supportedTypes.push(type);
    });
    return supportedTypes;
}
