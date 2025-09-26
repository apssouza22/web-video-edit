import { UserMediaRecordingService } from './service';

export function createUserMediaRecordingService(onRecordingUpdateListener?: (file: File) => void): UserMediaRecordingService {
  return new UserMediaRecordingService();
}
