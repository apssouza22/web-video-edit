import { UserMediaRecordingService } from './service.js';

export function createUserMediaRecordingService(onRecordingUpdateListener) {
  return new UserMediaRecordingService(onRecordingUpdateListener);
}

