import {AbstractMedia} from './media-common';
import {Canvas2DRender} from '@/common/render-2d';
import {TextMedia} from "@/mediaclip/text";
import {createFrameService} from "@/mediaclip/frame";

export interface TranscriptionChunk {
  text: string;
  timestamp: [number, number]; // [startTime, end_time] in seconds
}

interface CaptionScene {
  chunks: TranscriptionChunk[];
  startIndex: number;
  endIndex: number;
}

export class CaptionMedia extends TextMedia {
  private _highlightColor = '#ffcc00';
  private _transcriptionChunks: TranscriptionChunk[];
  private _currentSceneIndex = -1;
  private _currentWordIndex = -1;
  private _scenes: CaptionScene[] = [];
  private _chunkToSceneMap: Map<number, number> = new Map();

  constructor(name: string, transcription: TranscriptionChunk[]) {
    super(name);
    this._transcriptionChunks = transcription;

    this.#calculateDuration();
    this.#buildScenes();
    this.calculateDimensions();
    this._width = 600;
    this._renderer.setSize(this._width, this._height);
    this._frameService = createFrameService(this.totalTimeInMilSeconds);

    setTimeout(() => {
      this._ready = true;
      this._loadUpdateListener(100, this.name, this);
    }, 10);
  }

  get transcription(): TranscriptionChunk[] {
    return this._transcriptionChunks;
  }

  get highlightColor(): string {
    return this._highlightColor;
  }

  set highlightColor(value: string) {
    this._highlightColor = value;
  }

  #calculateDuration(): void {
    if (this._transcriptionChunks.length > 0) {
      const lastChunk = this._transcriptionChunks[this._transcriptionChunks.length - 1];
      this.totalTimeInMilSeconds = lastChunk.timestamp[1] * 1000;
    }
  }

  #hasSentenceEnd(text: string): boolean {
    return /[.!?]$/.test(text.trim());
  }

  #hasComma(text: string): boolean {
    return /,$/.test(text.trim());
  }

  #getSceneCharLength(chunks: TranscriptionChunk[]): number {
    return chunks.reduce((acc, chunk) => acc + chunk.text.trim().length, 0) + chunks.length - 1;
  }

  #buildScenes(): void {
    const chunks = this._transcriptionChunks;
    if (chunks.length === 0) return;

    const maxWords = 5;
    const minWords = 2;
    const maxCharLength = 45;

    let currentScene: TranscriptionChunk[] = [];
    let sceneStartIndex = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      currentScene.push(chunk);

      const wordCount = currentScene.length;
      const charLength = this.#getSceneCharLength(currentScene);
      const endsWithPunctuation = this.#hasSentenceEnd(chunk.text);
      const endsWithComma = this.#hasComma(chunk.text);

      const shouldEndScene = 
        endsWithPunctuation ||
        wordCount >= maxWords ||
        charLength >= maxCharLength ||
        (endsWithComma && wordCount >= minWords);

      const isLastChunk = i === chunks.length - 1;

      if (shouldEndScene || isLastChunk) {
        const scene: CaptionScene = {
          chunks: [...currentScene],
          startIndex: sceneStartIndex,
          endIndex: i
        };

        const sceneIndex = this._scenes.length;
        this._scenes.push(scene);

        for (let j = sceneStartIndex; j <= i; j++) {
          this._chunkToSceneMap.set(j, sceneIndex);
        }

        currentScene = [];
        sceneStartIndex = i + 1;
      }
    }
  }

  #getSceneForChunkIndex(chunkIndex: number): CaptionScene | null {
    const sceneIndex = this._chunkToSceneMap.get(chunkIndex);
    if (sceneIndex === undefined) return null;
    return this._scenes[sceneIndex];
  }

  #getChunkIndex(timeInSeconds: number): number {
    for (let i = 0; i < this._transcriptionChunks.length; i++) {
      const chunk = this._transcriptionChunks[i];
      if (timeInSeconds >= chunk.timestamp[0] && timeInSeconds <= chunk.timestamp[1]) {
        return i;
      }
    }
    return -1;
  }

  #renderCaptionScene(scene: CaptionScene, activeChunkIndex: number): void {
    this._renderer.clearRect();

    this.ctx.font = `bold ${this.fontSize}px sans-serif`;
    this.ctx.textBaseline = 'middle';

    const words = scene.chunks.map(chunk => chunk.text.trim());
    const totalText = words.join(' ');
    const totalWidth = this.ctx.measureText(totalText).width;

    let startX = (this._width - totalWidth) / 2;
    const y = this._height / 2;

    const activeWordInScene = activeChunkIndex - scene.startIndex;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const isActive = i === activeWordInScene;

      if (this.shadow) {
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 7;
      } else {
        this.ctx.shadowColor = '';
        this.ctx.shadowBlur = 0;
      }

      this.ctx.fillStyle = isActive ? this._highlightColor : this.color;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(word, startX, y);

      const wordWidth = this.ctx.measureText(word).width;
      startX += wordWidth;

      if (i < words.length - 1) {
        const spaceWidth = this.ctx.measureText(' ').width;
        startX += spaceWidth;
      }
    }
  }

  async render(ctxOut: CanvasRenderingContext2D, refTime: number, playing: boolean = false): Promise<void> {
    if (!this.isLayerVisible(refTime)) {
      return;
    }

    const frame = await this.getFrame(refTime);
    if (!frame) {
      return;
    }

    const localTime = (refTime - this.startTime) / 1000;
    const chunkIndex = this.#getChunkIndex(localTime);

    if (chunkIndex === -1) {
      return;
    }

    const scene = this.#getSceneForChunkIndex(chunkIndex);
    if (!scene) {
      return;
    }

    const sceneIndex = this._chunkToSceneMap.get(chunkIndex) ?? -1;
    const activeWordInScene = chunkIndex - scene.startIndex;

    const needsRedraw = sceneIndex !== this._currentSceneIndex || 
                        activeWordInScene !== this._currentWordIndex;

    if (needsRedraw) {
      this._currentSceneIndex = sceneIndex;
      this._currentWordIndex = activeWordInScene;
      this.#renderCaptionScene(scene, chunkIndex);
    }

    Canvas2DRender.drawTransformed(this.ctx, ctxOut, frame);
  }

  protected _createCloneInstance(): AbstractMedia {
    return new CaptionMedia(this.name, this._transcriptionChunks) as AbstractMedia;
  }

  clone(): AbstractMedia {
    const cloned = super.clone();
    if (cloned) {
      (cloned as CaptionMedia).highlightColor = this._highlightColor;
    }
    return cloned;
  }
}
