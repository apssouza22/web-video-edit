# Vision Package - SampleExtractor

## Overview

The `SampleExtractor` class intelligently samples frames from video medialayer for AI analysis. It uses various algorithms to detect frame differences and employs multiple sampling strategies to ensure diverse and meaningful frame selection.

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

2. **SCENE_CHANGE** - Samples when scene changes are detected
   - Focuses on different scenes
   - Skips similar consecutive frames
   - Best for videos with distinct scenes

3. **ADAPTIVE** (Default) - Dynamically adjusts sampling rate
   - Increases sampling when frames are different
   - Decreases sampling when frames are similar
   - Balances coverage and diversity


## Performance Considerations

### Speed vs Accuracy

| Method | Speed | Accuracy | Best For |
|--------|-------|----------|----------|
| Histogram | Fast | Good | Color changes |
| Perceptual Hash | Medium | Very Good | Similar images |
| Pixel Difference | Slow | Excellent | Precise detection |
| Edge Detection | Medium | Good | Scene changes |

### Recommendations
- **For scene detection**: Use `HISTOGRAM` with `SCENE_CHANGE` strategy
- **For thorough analysis**: Use `PERCEPTUAL_HASH` with `ADAPTIVE` strategy
- **For precision**: Use `PIXEL_DIFFERENCE` with lower threshold

## Future Improvements

Potential enhancements:
- Machine learning-based scene detection
- Motion vector analysis
- Audio-based scene detection
- Parallel frame extraction
- GPU-accelerated comparison
- Adaptive threshold adjustment
- Content-aware sampling

