// Minimal TS wrapper for webm-duration-fix via CDN ESM.
// We keep the external URL to avoid adding a dependency right now.
import webmDurationFix from 'https://cdn.jsdelivr.net/npm/webm-duration-fix@1.0.4/+esm';

/**
 * Fixes the duration of a WebM video blob produced by MediaRecorder.
 */
export async function fixWebmDuration(blob: Blob): Promise<Blob> {
  // The CDN module exposes a default export; keep call compatible with existing code.
  const mod: any = webmDurationFix as any;
  return await mod.default?.(blob, { mimeType: blob.type }) ?? mod(blob, { mimeType: blob.type });
}

