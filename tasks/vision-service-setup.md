# Vision Service Setup

## Task: Prepare vision package with vision service for image analysis

### Implementation Steps

- [x] Create type definitions (`src/vision/types.ts`)
- [x] Refactor vision-model.ts to remove React dependencies and follow transcription pattern
- [x] Create vision service (`src/vision/vision-service.ts`)
- [x] Create worker (`src/vision/worker.ts`)
- [x] Create vision view (`src/vision/vision-view.ts`)
- [x] Create index exports (`src/vision/index.ts`)
- [x] Verify integration works

## Usage Example

```typescript
import { createVisionService } from '@/vision';

// Create the vision service
const visionService = createVisionService();

// Load the model (should be done once, preferably on app initialization)
visionService.loadModel();

// Option 1: Analyze a video frame
const videoElement = document.querySelector('video');
visionService.analyzeVideoFrame(videoElement, "What is in this image?");

// Option 2: Analyze an ImageData object
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;
ctx.drawImage(someImageSource, 0, 0);
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
visionService.analyzeImage(imageData, "Describe what you see in this image");

// Listen for results
visionService.addResultListener((result) => {
  console.log("Vision analysis result:", result.text);
});

// Or use the event bus
import { getEventBus, VisionAnalysisCompleteEvent } from '@/common';
const eventBus = getEventBus();
eventBus.subscribe(VisionAnalysisCompleteEvent, (event) => {
  console.log("Analysis complete:", event.result.text);
});

// Get the view component
const visionView = visionService.getView();
visionView.show(); // Display the results UI
```

## Package Structure

```
src/vision/
├── types.ts              # Type definitions
├── vision-model.ts       # Model factory and inference logic
├── vision-service.ts     # Main service class
├── worker.ts             # Web Worker for model operations
├── vision-view.ts        # UI view component
└── index.ts              # Public API exports
```

## Integration Notes

- The vision service follows the same pattern as the transcription service
- Uses WebGPU for inference (requires Chrome/Edge with WebGPU enabled)
- Model loading is async and should be done once
- Results are displayed via the VisionView component
- Events are emitted via the global EventBus for inter-package communication
- Mocked data is used for localhost development
