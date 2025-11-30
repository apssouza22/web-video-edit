import {FileStorage, getFileStorage, MediaFile, StoredFile, StoredFileMetadata} from './file-storage';
import { uploadSupportedType } from '@/common/utils';
import { FileUpload } from './file-upload';
import {createItemElement} from "@/medialibrary/ui-components";
import {ThumbnailGenerator} from "@/medialibrary/thumbnail";

export class MediaLibrary {
  private container: HTMLElement | null = null;
  private fileStorage: FileStorage;
  private items: StoredFileMetadata[] = [];
  private thumbnailGenerator: ThumbnailGenerator;

  constructor(thumbnailGenerator: ThumbnailGenerator, fileStorage: FileStorage) {
    this.thumbnailGenerator = thumbnailGenerator
    this.fileStorage = fileStorage;
  }

  async init(): Promise<void> {
    this.container = document.getElementById('media-library');
    if (!this.container) return;

    await this.loadStoredFiles();
    this.render();
  }

  async deleteItem(id: string): Promise<void> {
    await this.fileStorage.deleteFile(id);
    this.items = this.items.filter(item => item.id !== id);
    this.render();
  }

  async addFile(file: File): Promise<StoredFileMetadata | null> {
    if (!uploadSupportedType([file] as unknown as FileList)) {
      return null;
    }
    const thumbnailDataUrl = await this.thumbnailGenerator.generateThumbnail(file);
    const mediaFile: MediaFile = {
      file,
      thumbnailDataUrl,
    };
    const metadata = await this.fileStorage.saveFile(mediaFile);
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
      const element = createItemElement(item, this.deleteItem.bind(this));
      this.container.appendChild(element);
    }
  }
}

let mediaLibraryInstance: MediaLibrary | null = null;
export function getMediaLibrary(): MediaLibrary {
  if (mediaLibraryInstance) {
    return mediaLibraryInstance;
  }

  const thumbnailGenerator = new ThumbnailGenerator();
  const  fileStorage = getFileStorage();
  mediaLibraryInstance = new MediaLibrary(thumbnailGenerator, fileStorage);
  const fileUpload = new FileUpload(mediaLibraryInstance);

  mediaLibraryInstance.init();
  fileUpload.init();
  return mediaLibraryInstance;
}
