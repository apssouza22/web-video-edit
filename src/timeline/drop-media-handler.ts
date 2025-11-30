import {getEventBus, MediaLibraryDropEvent} from "@/common";

export function setupMediaLibraryDrop(timelineContainer: HTMLElement) {
  timelineContainer.addEventListener('dragover', (e) => {
    const hasMediaLibraryId = e.dataTransfer?.types.includes('application/x-media-library-id');
    if (hasMediaLibraryId) {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
      timelineContainer.classList.add('drop-target');
    }
  });

  timelineContainer.addEventListener('dragleave', (e) => {
    if (!timelineContainer.contains(e.relatedTarget as Node)) {
      timelineContainer.classList.remove('drop-target');
    }
  });

  timelineContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    timelineContainer.classList.remove('drop-target');

    const fileId = e.dataTransfer?.getData('application/x-media-library-id');
    if (fileId) {
      getEventBus().emit(new MediaLibraryDropEvent(fileId));
    }
  });
}
