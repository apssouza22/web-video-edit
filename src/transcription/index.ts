import { TranscriptionService } from './transcription.js';

export {
  PipelineFactory,
  transcribe,
  onModelInferenceError
} from "./model.js";

export { TranscriptionService } from './transcription.js';
export { TranscriptionView } from './transcription-view.js';

export function createTranscriptionService(): TranscriptionService {
  return new TranscriptionService();
}
