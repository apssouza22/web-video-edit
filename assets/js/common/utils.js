import webmDurationFix from 'https://cdn.jsdelivr.net/npm/webm-duration-fix@1.0.4/+esm'

/**
 * Fixes the duration of a WebM video blob.
 * This is necessary because MediaRecorder does not set the duration correctly for WebM files.
 *
 * @param {Blob} blob
 * @returns {Promise<Blob>}
 */
export async function fixWebmDuration(blob) {
  return await webmDurationFix.default(blob, {mimeType: blob.type});
}