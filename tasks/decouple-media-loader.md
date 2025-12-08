# Decouple Media Loader from Video/Image/Audio Media

## Objective
Separate the file loading process from media classes by using MediaLoader and FrameSource pattern.

## Implementation Steps

- [x] Step 1: Enhance FrameSource interface and create ImageFrameSource
  - Add metadata properties (width, height, totalTime) to FrameSource
  - Add cleanup method to FrameSource
  - Create ImageFrameSource implementation for image media

- [x] Step 2: Complete MediaLoader class
  - Implement async loadVideoMedia() that returns VideoMedia with FrameSource
  - Implement async loadImageMedia() that returns ImageMedia with FrameSource
  - Handle progress callbacks during loading

- [x] Step 3: Refactor VideoMedia
  - Accept FrameSource and metadata in constructor
  - Remove loadVideo() call from constructor
  - Keep skipLoading for clone/split operations

- [x] Step 4: Refactor ImageMedia
  - Accept FrameSource in constructor
  - Remove FileReader loading logic from constructor

- [x] Step 5: Update exports and ensure compatibility
  - Update mediasource/index.ts exports
  - Ensure existing functionality works correctly

## Audio Media Decoupling

- [x] Step 6: Create AudioFrameSource
  - Create AudioFrameSource that wraps AudioBuffer
  - Add audioBuffer property to FrameSourceMetadata

- [x] Step 7: Add loadAudioMedia to MediaLoader
  - Implement async loadAudioMedia() that returns AudioFrameSource
  - Use existing AudioLoader logic

- [x] Step 8: Refactor AudioMedia
  - Accept AudioFrameSource in constructor
  - Remove AudioLoader loading logic from constructor
  - Keep skipLoading for clone/split operations

- [x] Step 9: Update createMediaFromFile for audio
  - Update audio handling to use MediaLoader

