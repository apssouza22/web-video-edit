export { ClipSettingsService } from './clip-settings-service.js';
export { ClipSettingsView } from './clip-settings-view.js';
export type { ClipPropertyDescriptor, PropertyUpdate } from './types.js';

import { ClipSettingsService } from './clip-settings-service.js';

export function createClipSettingsService(): ClipSettingsService {
  return new ClipSettingsService();
}
