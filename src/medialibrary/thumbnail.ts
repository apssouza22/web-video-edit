export class ThumbnailGenerator {

   async generateThumbnail(file: File): Promise<string | undefined> {
    if (file.type.startsWith('image/')) {
      return this.generateImageThumbnail(file);
    }
    if (file.type.startsWith('video/')) {
      return this.generateVideoThumbnail(file);
    }
    if (file.type.startsWith('audio/')) {
      return this.getAudioPlaceholder();
    }
    return undefined;
  }



  private generateImageThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 80;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(this.getPlaceholderDataUrl('image'));
      };

      img.src = url;
    });
  }

  private generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.onloadeddata = () => {
        video.currentTime = 0.1;
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const size = 80;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(size / video.videoWidth, size / video.videoHeight);
        const x = (size - video.videoWidth * scale) / 2;
        const y = (size - video.videoHeight * scale) / 2;

        ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(this.getPlaceholderDataUrl('video'));
      };

      video.src = url;
    });
  }

  private getAudioPlaceholder(): string {
    return this.getPlaceholderDataUrl('audio');
  }


  private getPlaceholderDataUrl(type: 'image' | 'video' | 'audio'): string {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2a2d32';
    ctx.fillRect(0, 0, 80, 80);

    ctx.fillStyle = '#a9e1fa';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const icons: Record<string, string> = {
      image: '🖼️',
      video: '🎬',
      audio: '🎵',
    };

    ctx.font = '24px sans-serif';
    ctx.fillText(icons[type] || '📁', 40, 40);

    return canvas.toDataURL('image/png');
  }
}