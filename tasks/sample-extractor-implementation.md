# Sample Extractor Implementation

## Task: Create SampleExtractor class for smart frame sampling for AI analysis

### Implementation Steps

- [x] Create frame comparison algorithms in `src/vision/frame-comparator.ts`
  - [x] Implement histogram comparison algorithm
  - [x] Implement perceptual hash (pHash) algorithm
  - [x] Implement pixel difference algorithm
  - [x] Implement edge detection comparison
  - [x] Create unified comparison interface

- [x] Add new types to `src/vision/types.ts`
  - [x] SamplingStrategy types
  - [x] FrameSample interface
  - [x] SampleExtractorConfig interface
  - [x] ComparisonMethod enum
  - [x] FrameComparisonResult interface

- [x] Create SampleExtractor class in `src/vision/sample-extractor.ts`
  - [x] Implement constructor with configuration
  - [x] Implement time-based sampling strategy
  - [x] Implement scene change detection strategy
  - [x] Implement adaptive sampling strategy
  - [x] Implement frame extraction from AbstractMedia
  - [x] Implement frame difference checking
  - [x] Add sample history management

- [x] Integrate SampleExtractor into VisionService
  - [x] Update VisionService to use SampleExtractor
  - [x] Update analyzeVideo method
  - [x] Add configuration options

- [x] Update exports in `src/vision/index.ts`

- [x] Create tests for SampleExtractor
  - [x] Test histogram comparison
  - [x] Test pHash comparison
  - [x] Test sampling strategies
  - [x] Test frame extraction
  - [x] Test integration with VisionService

