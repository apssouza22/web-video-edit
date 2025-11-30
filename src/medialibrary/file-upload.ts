import {uploadSupportedType} from '@/common/utils';
import {MediaLibrary} from "@/medialibrary/media-library";


export class FileUpload {
  private uploadAreaId: string;
  private filePickerId: string;
  private mediaLibrary: MediaLibrary;

  constructor(
      mediaLibrary: MediaLibrary,
      uploadAreaId: string = 'media-upload-area',
      filePickerId: string = 'filepicker'
  ) {
    this.mediaLibrary = mediaLibrary;
    this.uploadAreaId = uploadAreaId;
    this.filePickerId = filePickerId;
  }

  init(): void {
    this.setupUploadArea();
  }

  async uploadFiles(files: FileList): Promise<void> {
    if (!uploadSupportedType(files)) {
      return;
    }
    await this.mediaLibrary.addFiles(files);
  }

  openFilePicker(): void {
    const filePicker = document.getElementById(this.filePickerId) as HTMLInputElement;
    if (!filePicker) return;

    const handleInput = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || !uploadSupportedType(target.files)) {
        return;
      }
      await this.mediaLibrary.addFiles(target.files);
      filePicker.value = '';
      filePicker.removeEventListener('input', handleInput);
    };

    filePicker.addEventListener('input', handleInput);
    filePicker.click();
  }

  private setupUploadArea(): void {
    const uploadArea = document.getElementById(this.uploadAreaId);
    if (!uploadArea) return;

    uploadArea.addEventListener('click', () => {
      this.openFilePicker();
    });

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.uploadFiles(files);
      }
    });
  }
}

