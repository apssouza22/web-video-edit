import { ExportOptions } from '@/video/muxer/web-codec-exporter';
import { QualityPresetName, QUALITY_PRESETS } from '@/video/muxer/quality-presets';
import { VideoCodec } from 'mediabunny';

/**
 * Manages the export options UI in the Export tab
 * Handles user selection of quality presets and codec preferences
 */
export class ExportOptionsManager {
  private qualitySelect: HTMLSelectElement;
  private codecSelect: HTMLSelectElement;
  private infoText: HTMLSpanElement;

  constructor() {
    this.qualitySelect = document.getElementById('quality-preset-select') as HTMLSelectElement;
    this.codecSelect = document.getElementById('codec-preference-select') as HTMLSelectElement;
    this.infoText = document.getElementById('export-settings-info') as HTMLSpanElement;

    if (!this.qualitySelect || !this.codecSelect || !this.infoText) {
      console.warn('Export options UI elements not found');
      return;
    }

    this.#setupEventListeners();
    this.#updateInfoText();
  }

  #setupEventListeners(): void {
    this.qualitySelect.addEventListener('change', () => {
      this.#updateInfoText();
      this.#saveSettings();
    });

    this.codecSelect.addEventListener('change', () => {
      this.#updateInfoText();
      this.#saveSettings();
    });

    // Load saved settings
    this.#loadSettings();
  }

  #updateInfoText(): void {
    const qualityName = this.qualitySelect.value as QualityPresetName;
    const codecValue = this.codecSelect.value;
    const preset = QUALITY_PRESETS[qualityName];

    let codecDesc = '';
    if (codecValue.includes('av1')) {
      codecDesc = 'AV1 codec (best quality, may not work in QuickTime)';
    } else if (codecValue === 'hevc') {
      codecDesc = 'HEVC/H.265 codec (excellent quality, QuickTime compatible)';
    } else if (codecValue === 'avc') {
      codecDesc = 'H.264/AVC codec (universal compatibility)';
    } else {
      codecDesc = 'HEVC/H.264 codecs (best balance of quality and compatibility)';
    }

    this.infoText.textContent = `${preset.displayName}: ${preset.description}. Using ${codecDesc}.`;
  }

  #saveSettings(): void {
    localStorage.setItem('video-export-quality', this.qualitySelect.value);
    localStorage.setItem('video-export-codec', this.codecSelect.value);
  }

  #loadSettings(): void {
    const savedQuality = localStorage.getItem('video-export-quality');
    const savedCodec = localStorage.getItem('video-export-codec');

    if (savedQuality && this.qualitySelect) {
      this.qualitySelect.value = savedQuality;
    }

    if (savedCodec && this.codecSelect) {
      this.codecSelect.value = savedCodec;
    }

    this.#updateInfoText();
  }

  /**
   * Get the current export options based on user selection
   */
  getExportOptions(): ExportOptions {
    const qualityPreset = this.qualitySelect.value as QualityPresetName;
    const codecValue = this.codecSelect.value;
    const preferredCodecs = codecValue.split(',').map(c => c.trim()) as VideoCodec[];
    return {
      qualityPreset,
      preferredCodecs,
    };
  }
}
