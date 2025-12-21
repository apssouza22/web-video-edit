import {ExportOptionsManager} from './export-options-manager';
import type {VideoExportService} from './video-export-service';
import type {AbstractMedia} from '@/mediaclip';
import {createVideoMuxer} from "./index";
import {StudioState} from "@/common";

/**
 * Handles video export orchestration including UI interactions,
 * progress tracking, and coordination with export services.
 *
 * This class decouples export logic from VideoStudio, making it
 * more maintainable and testable.
 */
export class VideoExportHandler {
  private readonly exportButton: HTMLButtonElement | null;
  private readonly progressContainer: HTMLElement | null;
  private readonly progressFill: HTMLElement | null;
  private readonly progressText: HTMLElement | null;
  private readonly exportOptionsManager: ExportOptionsManager;
  private readonly videoExporter: VideoExportService;
  private readonly onExport: () => void;
  private readonly getMedias: () => AbstractMedia[];

  constructor(
      onExport: () => void
  ) {
    this.exportOptionsManager = new ExportOptionsManager();
    this.videoExporter = createVideoMuxer();
    this.onExport = onExport;
    this.getMedias = () => StudioState.getInstance().getMedias();

    // Get DOM elements
    this.exportButton = document.getElementById('export-video-btn') as HTMLButtonElement | null;
    this.progressContainer = document.getElementById('export-progress');
    this.progressFill = document.getElementById('export-progress-fill');
    this.progressText = document.getElementById('export-progress-text');
  }

  /**
   * Initialize the export handler by setting up event listeners
   */
  init(): void {
    if (!this.exportButton) {
      return;
    }
    this.exportButton.addEventListener('click', () => this.handleExportClick());
  }

  /**
   * Handle export button click
   */
  private handleExportClick(): void {
    if (this.getMedias().length === 0) {
      alert("Nothing to export.");
      return;
    }
    this.onExport();

    if (this.progressContainer) {
      this.progressContainer.style.display = 'block';
    }

    if (this.exportButton) {
      this.exportButton.setAttribute('disabled', 'true');
      this.exportButton.classList.add('exporting');
    }

    const exportOptions = this.exportOptionsManager.getExportOptions();
    this.videoExporter.export(
        (progress: number) => this.handleProgress(progress),
        () => this.handleCompletion(),
        exportOptions
    );
  }

  /**
   * Handle export progress updates
   */
  private handleProgress(progress: number): void {
    if (this.progressFill) {
      this.progressFill.style.width = `${progress}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = `${Math.round(progress)}%`;
    }
  }

  /**
   * Handle export completion
   */
  private handleCompletion(): void {
    // Re-enable button
    if (this.exportButton) {
      this.exportButton.removeAttribute('disabled');
      this.exportButton.classList.remove('exporting');
    }

    // Hide progress after delay
    if (this.progressContainer) {
      setTimeout(() => {
        if (this.progressContainer) {
          this.progressContainer.style.display = 'none';
        }
        if (this.progressFill) {
          this.progressFill.style.width = '0%';
        }
        if (this.progressText) {
          this.progressText.textContent = '0%';
        }
      }, 2000);
    }
  }
}
