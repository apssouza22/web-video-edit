import {StudioState} from "@/common";

/**
 * Calculate export dimensions based on aspect ratio and source media dimensions
 */
export function getExportDimensions(): { width: number; height: number } {
  const {maxWidth, maxHeight} = StudioState.getInstance().getMaxVideoSizes();
  const aspectRatio = StudioState.getInstance().getCurrentAspectRatio();

  // Parse aspect ratio (e.g., "16:9" → 16/9)
  const [w, h] = aspectRatio.split(':').map(Number);
  const targetAspectRatio = w / h;

  const baseline = BASELINE_RESOLUTIONS[aspectRatio] || BASELINE_RESOLUTIONS['16:9'];
  let exportWidth = baseline.width;
  let exportHeight = baseline.height;

  // Scale to match source media dimensions (both up and down)
  if (maxWidth > 0 && maxHeight > 0) {
    const sourceAspect = maxWidth / maxHeight;

    if (sourceAspect > targetAspectRatio) {
      // Source is wider - use width as reference
      exportWidth = maxWidth;
      exportHeight = Math.round(maxWidth / targetAspectRatio);
    } else {
      // Source is taller - use height as reference
      exportHeight = maxHeight;
      exportWidth = Math.round(maxHeight * targetAspectRatio);
    }

    // Ensure even dimensions (required by video encoders)
    exportWidth = Math.floor(exportWidth / 2) * 2;
    exportHeight = Math.floor(exportHeight / 2) * 2;
  }

  return { width: exportWidth, height: exportHeight };
}

// Baseline resolutions per aspect ratio
const BASELINE_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1920, height: 1920 },
  '3:4': { width: 1440, height: 1920 }
};
