# Create Speech Component (Text-to-Speech using Kokoro)

## Overview
Create a new `speech` component that uses the Kokoro transformers.js model to convert text to speech.

## Implementation Steps

- [x] 1. Install `kokoro-js` package
- [x] 2. Create speech module types (`src/speech/types.ts`)
- [x] 3. Create speech model factory (`src/speech/model-factory.ts`)
- [x] 4. Create speech service (`src/speech/speech-service.ts`)
- [x] 5. Create speech view component (`src/speech/speech-view.ts`)
- [x] 6. Create speech module index (`src/speech/index.ts`)
- [x] 7. Add Speech tab to HTML (`index.html`)
- [x] 8. Add CSS styles for speech component (`assets/css/style.css`)
- [x] 9. Add event bus events for speech synthesis (`src/common/event-bus.ts`)
- [x] 10. Wire up speech service in main.ts

## UI Requirements (from provided image)
- Text input area with placeholder "Start typing here..."
- Model selector dropdown showing "Kokoro 82M"
- Settings section with:
  - Voice dropdown (Heart, etc.)
  - Speed slider (0-200%) with numeric input
- Submit button (arrow icon) to generate speech

## Technical Details
- Use `kokoro-js` library for Kokoro TTS
- Follow singleton pattern like `PipelineFactory` in transcription module
- Match existing dark theme UI with JupiterSans font
- Support multiple voices provided by Kokoro model
- **Web Worker architecture** - Model inference runs in a separate worker thread to avoid blocking the main UI thread (following the vision module pattern)

