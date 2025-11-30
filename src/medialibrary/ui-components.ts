import {StoredFileMetadata} from "@/medialibrary/file-storage";
import {escapeAttr, parseHTML} from "@/common/html";

export function createItemElement(item: StoredFileMetadata, deleteItem: (id: string)=> Promise<void>): HTMLElement {
  const thumbnailContent = item.thumbnailDataUrl ? '' : getTypeIcon(item.type);
  const thumbnailStyle = item.thumbnailDataUrl ? `background-image: url(${item.thumbnailDataUrl})` : '';

  const html = `
    <div class="media-library-item" draggable="true" data-file-id="${item.id}">
      <div class="media-library-thumb" style="${thumbnailStyle}">${thumbnailContent}</div>
      <div class="media-library-info">
        <div class="media-library-name" title="${escapeAttr(item.name)}">${truncateName(item.name, 20)}</div>
        <div class="media-library-meta">${getTypeLabel(item.type)} • ${formatSize(item.size)}</div>
      </div>
      <button class="media-library-delete" title="Remove from library">×</button>
    </div>
  `;

  const element = parseHTML(html);

  const deleteBtn = element.querySelector('.media-library-delete') as HTMLButtonElement;
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await deleteItem(item.id);
  });

  setupDragEvents(element, item);

  return element;
}

function setupDragEvents(element: HTMLElement, item: StoredFileMetadata): void {
  element.addEventListener('dragstart', (e) => {
    if (!e.dataTransfer) return;

    e.dataTransfer.setData('application/x-media-library-id', item.id);
    e.dataTransfer.setData('text/plain', item.name);
    e.dataTransfer.effectAllowed = 'copy';
    element.classList.add('dragging');
  });

  element.addEventListener('dragend', () => {
    element.classList.remove('dragging');
  });
}

function getTypeIcon(type: string): string {
  if (type.startsWith('video/')) {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }
  if (type.startsWith('image/')) {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  }
  if (type.startsWith('audio/')) {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  }
  return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}

function getTypeLabel(type: string): string {
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('image/')) return 'Image';
  if (type.startsWith('audio/')) return 'Audio';
  return 'File';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  const ext = name.lastIndexOf('.');
  if (ext > 0 && name.length - ext <= 5) {
    const baseName = name.substring(0, ext);
    const extension = name.substring(ext);
    const availableLength = maxLength - extension.length - 3;
    return `${baseName.substring(0, availableLength)}...${extension}`;
  }
  return `${name.substring(0, maxLength - 3)}...`;
}

