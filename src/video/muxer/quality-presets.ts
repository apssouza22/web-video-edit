import { Quality, QUALITY_LOW, QUALITY_MEDIUM, QUALITY_HIGH, QUALITY_VERY_HIGH } from "mediabunny";

export type QualityPresetName = 'low' | 'medium' | 'high' | 'very-high' | 'archive' | 'maximum';

export interface QualityPreset {
  name: QualityPresetName;
  displayName: string;
  bitrate: number | Quality;
  bitrateMode: 'constant' | 'variable';
  latencyMode: 'quality' | 'realtime';
  keyFrameInterval: number;
  description: string;
}

export const QUALITY_PRESETS: Record<QualityPresetName, QualityPreset> = {
  'low': {
    name: 'low',
    displayName: 'Low (Fast)',
    bitrate: QUALITY_LOW,
    bitrateMode: 'constant',
    latencyMode: 'realtime',
    keyFrameInterval: 10,
    description: 'Fast export, smaller file size'
  },
  'medium': {
    name: 'medium',
    displayName: 'Medium',
    bitrate: QUALITY_MEDIUM,
    bitrateMode: 'constant',
    latencyMode: 'quality',
    keyFrameInterval: 5,
    description: 'Balanced quality and speed'
  },
  'high': {
    name: 'high',
    displayName: 'High',
    bitrate: QUALITY_HIGH,
    bitrateMode: 'variable',
    latencyMode: 'quality',
    keyFrameInterval: 5,
    description: 'High quality export'
  },
  'very-high': {
    name: 'very-high',
    displayName: 'Very High',
    bitrate: QUALITY_VERY_HIGH,
    bitrateMode: 'variable',
    latencyMode: 'quality',
    keyFrameInterval: 3,
    description: 'Very high quality export'
  },
  'archive': {
    name: 'archive',
    displayName: 'Archive Quality',
    bitrate: QUALITY_VERY_HIGH,
    bitrateMode: 'variable',
    latencyMode: 'quality',
    keyFrameInterval: 2,
    description: 'Maximum quality for archival (large file size)'
  },
  'maximum': {
    name: 'maximum',
    displayName: 'Maximum Quality',
    bitrate: 50_000_000, // 50 Mbps base for 1080p
    bitrateMode: 'variable',
    latencyMode: 'quality',
    keyFrameInterval: 1,
    description: 'Highest possible quality (very large file size)'
  }
};

/**
 * Calculate bitrate based on resolution for custom bitrate presets
 * Scales bitrate proportionally to pixel count relative to 1080p baseline
 */
export function calculateBitrate(width: number, height: number, preset: QualityPreset): number | Quality {
  if (typeof preset.bitrate === 'number') {
    // Scale bitrate based on resolution
    const pixels = width * height;
    const basePixels = 1920 * 1080; // 1080p baseline
    const scale = Math.pow(pixels / basePixels, 0.95); // Slightly sublinear scaling
    return Math.round(preset.bitrate * scale);
  }
  return preset.bitrate; // Return Quality object as-is for MediaBunny presets
}
