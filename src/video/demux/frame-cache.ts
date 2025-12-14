export class FrameCache {
  #cache: Map<number, ImageBitmap>;
  #maxSize: number;
  #accessOrder: number[];

  constructor(maxSize: number = 30) {
    this.#cache = new Map();
    this.#maxSize = maxSize;
    this.#accessOrder = [];
  }

  get(index: number): ImageBitmap | null {
    const frame = this.#cache.get(index);
    
    if (frame) {
      this.#updateAccessOrder(index);
      return frame;
    }
    
    return null;
  }

  set(index: number, frame: ImageBitmap): void {
    if (this.#cache.has(index)) {
      const oldFrame = this.#cache.get(index);
      oldFrame?.close();
    }

    if (this.#cache.size >= this.#maxSize && !this.#cache.has(index)) {
      this.#evictLeastRecentlyUsed();
    }

    this.#cache.set(index, frame);
    this.#updateAccessOrder(index);
  }

  has(index: number): boolean {
    return this.#cache.has(index);
  }

  clear(): void {
    for (const frame of this.#cache.values()) {
      frame.close();
    }
    this.#cache.clear();
    this.#accessOrder = [];
  }

  size(): number {
    return this.#cache.size;
  }

  #updateAccessOrder(index: number): void {
    const existingIndex = this.#accessOrder.indexOf(index);
    if (existingIndex > -1) {
      this.#accessOrder.splice(existingIndex, 1);
    }
    this.#accessOrder.push(index);
  }

  #evictLeastRecentlyUsed(): void {
    if (this.#accessOrder.length === 0) {
      return;
    }

    const lruIndex = this.#accessOrder.shift();
    if (lruIndex !== undefined) {
      const frame = this.#cache.get(lruIndex);
      frame?.close();
      this.#cache.delete(lruIndex);
    }
  }
}
