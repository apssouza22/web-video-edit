# Vision Package - SampleExtractor

## Overview

The `SampleExtractor` class intelligently samples frames from video media for AI analysis. It uses various algorithms to detect frame differences and employs multiple sampling strategies to ensure diverse and meaningful frame selection.

## Features

### Frame Comparison Algorithms

The `FrameComparator` class provides four different methods to compare frames:

1. **Histogram Comparison** - Fast comparison based on color distribution
   - Best for detecting color/lighting changes
   - Efficient for quick comparisons
   - Default method

2. **Perceptual Hash (pHash)** - Robust to minor variations
   - Uses DCT (Discrete Cosine Transform)
   - Good for detecting similar images
   - Resistant to small modifications

3. **Pixel Difference** - Precise pixel-by-pixel comparison
   - Most accurate but more expensive
   - Best for detecting subtle changes
   - Good for high-precision requirements

4. **Edge Detection** - Structural comparison using Sobel operator
   - Detects changes in image structure
   - Good for scene changes
   - Focuses on edges rather than colors

### Sampling Strategies

The `SampleExtractor` supports four different sampling strategies:

1. **TIME_BASED** - Samples at fixed time intervals
   - Simple and predictable
   - Good for consistent sampling
   - Configurable interval

2. **SCENE_CHANGE** - Samples when scene changes are detected
   - Focuses on different scenes
   - Skips similar consecutive frames
   - Best for videos with distinct scenes

3. **ADAPTIVE** (Default) - Dynamically adjusts sampling rate
   - Increases sampling when frames are different
   - Decreases sampling when frames are similar
   - Balances coverage and diversity

4. **UNIFORM** - Evenly distributed samples across video
   - Simple even distribution
   - Predictable number of samples
   - Good for overview analysis

## Usage

### Basic Usage

```typescript
import { SampleExtractor } from '@/vision';
import { AbstractMedia } from '@/media';

const extractor = new SampleExtractor();
const samples = await extractor.extractSamples(media);

console.log(`Extracted ${samples.length} unique frames`);

samples.forEach(sample => {
  console.log(`Frame at ${sample.timestamp}ms (index: ${sample.frameIndex})`);
  // sample.imageData contains the frame data
});
```

### Custom Configuration

```typescript
import { SampleExtractor, SamplingStrategy, ComparisonMethod } from '@/vision';

const extractor = new SampleExtractor({
  strategy: SamplingStrategy.ADAPTIVE,
  maxSamples: 15,              // Maximum frames to extract
  minSamples: 5,               // Minimum frames to extract
  intervalSeconds: 3,          // Interval for TIME_BASED strategy
  similarityThreshold: 0.20,   // Higher = more different frames required
  comparisonMethod: ComparisonMethod.HISTOGRAM
});

const samples = await extractor.extractSamples(media);
```

### Using with VisionService

The `SampleExtractor` is integrated into the `VisionService`:

```typescript
import { createVisionService, SamplingStrategy } from '@/vision';

const visionService = createVisionService({
  samplingConfig: {
    strategy: SamplingStrategy.SCENE_CHANGE,
    maxSamples: 10,
    minSamples: 3,
    similarityThreshold: 0.15
  }
});

await visionService.analyzeVideo(media, "Describe what you see in this frame");
```

### Dynamic Configuration Updates

```typescript
const extractor = new SampleExtractor();

// Extract with default config
const samples1 = await extractor.extractSamples(media);

// Update configuration
extractor.updateConfig({
  strategy: SamplingStrategy.SCENE_CHANGE,
  maxSamples: 20,
  similarityThreshold: 0.25
});

// Extract with new config
const samples2 = await extractor.extractSamples(media);
```

### Managing Sample History

```typescript
const extractor = new SampleExtractor();

// Extract samples
await extractor.extractSamples(media);

// Get history of compared samples
const history = extractor.getSampleHistory();
console.log(`Compared ${history.length} frames`);

// Clear history for fresh extraction
extractor.clearHistory();
```

## Configuration Options

### SampleExtractorConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strategy` | `SamplingStrategy` | `ADAPTIVE` | Sampling strategy to use |
| `maxSamples` | `number` | `10` | Maximum number of samples to extract |
| `minSamples` | `number` | `3` | Minimum number of samples to extract |
| `intervalSeconds` | `number` | `5` | Time interval for TIME_BASED strategy |
| `similarityThreshold` | `number` | `0.15` | Threshold for frame difference (0-1) |
| `comparisonMethod` | `ComparisonMethod` | `HISTOGRAM` | Frame comparison algorithm |

### Similarity Threshold

The `similarityThreshold` determines how different frames need to be to be considered unique:

- **0.05-0.10**: Very sensitive - detects small changes
- **0.15-0.20**: Moderate - balanced detection (recommended)
- **0.25-0.35**: Less sensitive - only major changes
- **0.40+**: Very strict - only dramatic changes

## Algorithm Details

### Histogram Comparison

Compares color distribution across RGB channels:
- Creates histograms for each color channel
- Calculates absolute difference between histograms
- Normalizes by frame size
- Fast and effective for color changes

### Perceptual Hash

Uses DCT-based perceptual hashing:
1. Resize to 32x32 pixels
2. Convert to grayscale
3. Apply Discrete Cosine Transform
4. Extract low-frequency components
5. Generate binary hash
6. Compare using Hamming distance

### Pixel Difference

Direct pixel-by-pixel comparison:
- Compares each RGB value
- Calculates average difference
- Normalizes to 0-1 range
- Most accurate but slowest

### Edge Detection

Sobel operator-based comparison:
1. Convert frames to grayscale
2. Apply Sobel X and Y operators
3. Calculate gradient magnitude
4. Compare edge maps
5. Good for structural changes

## Performance Considerations

### Speed vs Accuracy

| Method | Speed | Accuracy | Best For |
|--------|-------|----------|----------|
| Histogram | Fast | Good | Color changes |
| Perceptual Hash | Medium | Very Good | Similar images |
| Pixel Difference | Slow | Excellent | Precise detection |
| Edge Detection | Medium | Good | Scene changes |

### Recommendations

- **For quick preview**: Use `HISTOGRAM` with `UNIFORM` strategy
- **For scene detection**: Use `HISTOGRAM` with `SCENE_CHANGE` strategy
- **For thorough analysis**: Use `PERCEPTUAL_HASH` with `ADAPTIVE` strategy
- **For precision**: Use `PIXEL_DIFFERENCE` with lower threshold

## Examples

### Example 1: Extract Key Scenes

```typescript
const extractor = new SampleExtractor({
  strategy: SamplingStrategy.SCENE_CHANGE,
  maxSamples: 20,
  similarityThreshold: 0.20,
  comparisonMethod: ComparisonMethod.HISTOGRAM
});

const keyScenes = await extractor.extractSamples(videoMedia);
```

### Example 2: Consistent Time Sampling

```typescript
const extractor = new SampleExtractor({
  strategy: SamplingStrategy.TIME_BASED,
  intervalSeconds: 10,  // Every 10 seconds
  maxSamples: 100
});

const timeBasedSamples = await extractor.extractSamples(videoMedia);
```

### Example 3: Adaptive Smart Sampling

```typescript
const extractor = new SampleExtractor({
  strategy: SamplingStrategy.ADAPTIVE,
  maxSamples: 15,
  minSamples: 5,
  similarityThreshold: 0.15
});

const smartSamples = await extractor.extractSamples(videoMedia);
```

## API Reference

### SampleExtractor

#### Constructor
```typescript
constructor(config?: SampleExtractorConfig)
```

#### Methods

- `extractSamples(media: AbstractMedia): Promise<FrameSample[]>`
  - Extracts samples from the given media
  
- `updateConfig(config: Partial<SampleExtractorConfig>): void`
  - Updates the configuration
  
- `getConfig(): Required<SampleExtractorConfig>`
  - Returns current configuration
  
- `clearHistory(): void`
  - Clears sample history
  
- `getSampleHistory(): FrameSample[]`
  - Returns history of compared frames

### FrameComparator

#### Constructor
```typescript
constructor(threshold: number = 0.15)
```

#### Methods

- `compare(frame1: ImageData, frame2: ImageData, method: ComparisonMethod): FrameComparisonResult`
  - Compares two frames using the specified method

## Types

### FrameSample
```typescript
interface FrameSample {
  imageData: ImageData;
  timestamp: number;
  frameIndex: number;
}
```

### FrameComparisonResult
```typescript
interface FrameComparisonResult {
  similarity: number;
  method: ComparisonMethod;
  isDifferent: boolean;
}
```

## Testing

Tests are available in `tests/vision/sample-extractor.test.ts`:

```bash
npm test -- tests/vision/sample-extractor.test.ts
```

## Future Improvements

Potential enhancements:
- Machine learning-based scene detection
- Motion vector analysis
- Audio-based scene detection
- Parallel frame extraction
- GPU-accelerated comparison
- Adaptive threshold adjustment
- Content-aware sampling

