import { VideoCodec, canEncodeVideo, QUALITY_VERY_HIGH } from "mediabunny";

export interface CodecPreference {
  codec: VideoCodec;
  priority: number; // Higher = better quality
  description: string;
}

/**
 * Quality-first codec preference order
 * Prioritizes HEVC and H.264 for maximum compatibility with players like QuickTime
 * while still providing excellent quality
 *
 * Note: AV1 and VP9 offer better compression but are not supported by QuickTime Player
 */
const QUALITY_CODEC_PREFERENCES: CodecPreference[] = [
  { codec: 'hevc', priority: 5, description: 'HEVC/H.265 - Excellent quality, QuickTime compatible' },
  { codec: 'avc', priority: 4, description: 'H.264/AVC - High quality, universally compatible' },
  { codec: 'av1', priority: 3, description: 'AV1 - Best compression (not QuickTime compatible)' },
  { codec: 'vp9', priority: 2, description: 'VP9 - Good quality (not QuickTime compatible)' },
  { codec: 'vp8', priority: 1, description: 'VP8 - Legacy codec' }
];

export interface CodecSelectionOptions {
  width: number;
  height: number;
  preferredCodecs?: VideoCodec[];
  fallbackToFirst?: boolean;
}

/**
 * Selects the best available video codec based on quality priority
 * Tests codecs in quality order: AV1 > HEVC > VP9 > H.264 > VP8
 *
 * @param supportedCodecs - List of codecs supported by the output format
 * @param options - Selection options including resolution and preferences
 * @returns The best available codec, or null if none are suitable
 */
export async function selectBestVideoCodec(
  supportedCodecs: VideoCodec[],
  options: CodecSelectionOptions
): Promise<VideoCodec | null> {
  const { width, height, preferredCodecs, fallbackToFirst = true } = options;
  console.log('🔍 Selecting best video codec from:', supportedCodecs);

  // If user specified preferred codecs, try those first
  if (preferredCodecs && preferredCodecs.length > 0) {
    console.log('🎯 Trying user-preferred codecs:', preferredCodecs);
    for (const codec of preferredCodecs) {
      if (supportedCodecs.includes(codec)) {
        const canEncode = await canEncodeVideo(codec, {
          width,
          height,
          bitrate: QUALITY_VERY_HIGH,
          latencyMode: 'quality',
          bitrateMode: 'variable'
        });
        if (canEncode) {
          console.log(`✅ Selected preferred codec: ${codec}`);
          return codec;
        } else {
          console.log(`❌ Preferred codec ${codec} cannot encode at ${width}x${height}`);
        }
      }
    }
    console.log('⚠️ None of the preferred codecs are available, trying quality order...');
  }

  // Try codecs in quality order (highest quality first)
  const sortedPreferences = QUALITY_CODEC_PREFERENCES
    .filter(pref => supportedCodecs.includes(pref.codec))
    .sort((a, b) => b.priority - a.priority);

  console.log('📊 Testing codecs in quality order:', sortedPreferences.map(p => p.codec));

  for (const preference of sortedPreferences) {
    const canEncode = await canEncodeVideo(preference.codec, {
      width,
      height,
      bitrate: QUALITY_VERY_HIGH,
      latencyMode: 'quality',
      bitrateMode: 'variable'
    });

    if (canEncode) {
      console.log(`✅ Selected codec: ${preference.codec} - ${preference.description}`);
      console.log(`   Quality priority: ${preference.priority}/5`);
      return preference.codec;
    } else {
      console.log(`   ❌ Cannot encode at ${width}x${height}`);
    }
  }

  // Fallback to first supported codec if requested
  if (fallbackToFirst && supportedCodecs.length > 0) {
    console.warn('⚠️ No quality-preferred codec available, falling back to first supported:', supportedCodecs[0]);
    return supportedCodecs[0];
  }
  console.error('❌ No suitable video codec found!');
  return null;
}
