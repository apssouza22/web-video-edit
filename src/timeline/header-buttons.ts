/**
 * Set up click event listeners for timeline header buttons
 * @private
 */
import {EventBus, StudioState, TimelineLayerUpdateEvent} from "@/common";

export function setupTimelineHeaderButtons(eventBus: EventBus) {
  // Get buttons by their specific IDs
  const deleteButton = document.getElementById('delete-button')!;
  const splitButton = document.getElementById('split-button')!;
  const cloneButton = document.getElementById('clone-button')!;

  deleteButton.addEventListener('click', () => {
    if (!StudioState.getInstance().getSelectedMedia()) {
      console.log('No media selected. Please select a media first.');
      return;
    }
    eventBus.emit(new TimelineLayerUpdateEvent('delete', StudioState.getInstance().getSelectedMedia()!));
  });

  splitButton.addEventListener('click', () => {
    if (!StudioState.getInstance().getSelectedMedia()) {
      console.log('No media selected. Please select a media first.');
      return;
    }
    eventBus.emit(new TimelineLayerUpdateEvent('split', StudioState.getInstance().getSelectedMedia()!));
  });

  cloneButton.addEventListener('click', () => {
    if (!StudioState.getInstance().getSelectedMedia()) {
      console.log('No media selected. Please select a media first.');
      return;
    }
    eventBus.emit(new TimelineLayerUpdateEvent('clone', StudioState.getInstance().getSelectedMedia()!));
  });
}
