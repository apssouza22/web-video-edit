import { SpeechService } from './speech-service.js';

export { SpeechService } from './speech-service.js';
export { SpeechView } from './speech-view.js';
export { SpeechModelFactory } from './model-factory.js';
export { generateSpeech, onModelInferenceError } from './speech-model.js';
export * from './types.js';

export function createSpeechService(): SpeechService {
  return new SpeechService();
}
