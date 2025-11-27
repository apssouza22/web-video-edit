import { getFileStorage, StoredFileMetadata } from '@/file';
import { uploadSupportedType } from '@/common/utils';

export class MediaLibrary {
  private container: HTMLElement | null = null;
  private fileStorage = getFileStorage();
  private items: StoredFileMetadata[] = [];

  async init(): Promise<void> {
    this.container = document.getElementById('media-library');
    if (!this.container) return;

    await this.loadStoredFiles();
    this.render();
  }

  async addFile(file: File): Promise<StoredFileMetadata | null> {
    if (!uploadSupportedType([file] as unknown as FileList)) {
      return null;
    }

    const metadata = await this.fileStorage.saveFile(file);
    this.items.push(metadata);
    this.render();
    return metadata;
  }

  async addFiles(files: FileList): Promise<StoredFileMetadata[]> {
    const added: StoredFileMetadata[] = [];
    for (const file of files) {
      const metadata = await this.addFile(file);
      if (metadata) {
        added.push(metadata);
      }
    }
    return added;
  }

  async deleteItem(id: string): Promise<void> {
    await this.fileStorage.deleteFile(id);
    this.items = this.items.filter(item => item.id !== id);
    this.render();
  }

  async getFile(id: string): Promise<File | null> {
    const storedFile = await this.fileStorage.getFile(id);
    if (!storedFile) return null;

    return new File([storedFile.blob], storedFile.name, { type: storedFile.type });
  }

  private async loadStoredFiles(): Promise<void> {
    this.items = await this.fileStorage.getAllFiles();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

    if (this.items.length === 0) {
      this.container.innerHTML = '<div class="media-library-empty">No media files yet</div>';
      return;
    }

    for (const item of this.items) {
      const element = this.createItemElement(item);
      this.container.appendChild(element);
    }
  }

  private createItemElement(item: StoredFileMetadata): HTMLElement {
    const element = document.createElement('div');
    element.className = 'media-library-item';
    element.draggable = true;
    element.dataset.fileId = item.id;

    const thumbnail = document.createElement('div');
    thumbnail.className = 'media-library-thumb';
    if (item.thumbnailDataUrl) {
      thumbnail.style.backgroundImage = `url(${item.thumbnailDataUrl})`;
    } else {
      thumbnail.innerHTML = this.getTypeIcon(item.type);
    }

    const info = document.createElement('div');
    info.className = 'media-library-info';

    const name = document.createElement('div');
    name.className = 'media-library-name';
    name.textContent = this.truncateName(item.name, 20);
    name.title = item.name;

    const meta = document.createElement('div');
    meta.className = 'media-library-meta';
    meta.textContent = `${this.getTypeLabel(item.type)} • ${this.formatSize(item.size)}`;

    info.appendChild(name);
    info.appendChild(meta);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'media-library-delete';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Remove from library';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteItem(item.id);
    });

    element.appendChild(thumbnail);
    element.appendChild(info);
    element.appendChild(deleteBtn);

    this.setupDragEvents(element, item);

    return element;
  }

  private setupDragEvents(element: HTMLElement, item: StoredFileMetadata): void {
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

  private getTypeIcon(type: string): string {
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

  private getTypeLabel(type: string): string {
    if (type.startsWith('video/')) return 'Video';
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('audio/')) return 'Audio';
    return 'File';
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private truncateName(name: string, maxLength: number): string {
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
}

let mediaLibraryInstance: MediaLibrary | null = null;

export function getMediaLibrary(): MediaLibrary {
  if (!mediaLibraryInstance) {
    mediaLibraryInstance = new MediaLibrary();
  }
  return mediaLibraryInstance;
}

