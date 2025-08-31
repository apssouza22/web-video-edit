import { TranscriptionService } from './transcription.js';
export {PipelineFactory, transcribe,onModelInferenceError} from "./model.js";

export function createTranscriptionService() {
  return new TranscriptionService();
}