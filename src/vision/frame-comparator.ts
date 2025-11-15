export enum ComparisonMethod {
  HISTOGRAM = 'histogram',
  PERCEPTUAL_HASH = 'perceptual_hash',
  PIXEL_DIFFERENCE = 'pixel_difference',
  EDGE_DETECTION = 'edge_detection'
}

export interface FrameComparisonResult {
  similarity: number;
  method: ComparisonMethod;
  isDifferent: boolean;
}

export class FrameComparator {
  #threshold: number;

  constructor(threshold: number = 0.15) {
    this.#threshold = threshold;
  }

  compare(frame1: ImageData, frame2: ImageData, method: ComparisonMethod = ComparisonMethod.HISTOGRAM): FrameComparisonResult {
    if (!frame1 || !frame2) {
      return {
        similarity: 0,
        method,
        isDifferent: true
      };
    }

    if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
      return {
        similarity: 0,
        method,
        isDifferent: true
      };
    }

    let similarity = 0;

    switch (method) {
      case ComparisonMethod.HISTOGRAM:
        similarity = this.#compareHistogram(frame1, frame2);
        break;
      case ComparisonMethod.PERCEPTUAL_HASH:
        similarity = this.#comparePerceptualHash(frame1, frame2);
        break;
      case ComparisonMethod.PIXEL_DIFFERENCE:
        similarity = this.#comparePixelDifference(frame1, frame2);
        break;
      case ComparisonMethod.EDGE_DETECTION:
        similarity = this.#compareEdges(frame1, frame2);
        break;
      default:
        similarity = this.#compareHistogram(frame1, frame2);
    }

    return {
      similarity,
      method,
      isDifferent: similarity > this.#threshold
    };
  }

  #compareHistogram(frame1: ImageData, frame2: ImageData): number {
    const hist1 = this.#calculateHistogram(frame1);
    const hist2 = this.#calculateHistogram(frame2);

    let difference = 0;
    for (let i = 0; i < hist1.length; i++) {
      difference += Math.abs(hist1[i] - hist2[i]);
    }

    return difference / (frame1.width * frame1.height * 2);
  }

  #calculateHistogram(frame: ImageData): number[] {
    const histogram = new Array(256 * 3).fill(0);
    const data = frame.data;

    for (let i = 0; i < data.length; i += 4) {
      histogram[data[i]]++;
      histogram[256 + data[i + 1]]++;
      histogram[512 + data[i + 2]]++;
    }

    return histogram;
  }

  #comparePerceptualHash(frame1: ImageData, frame2: ImageData): number {
    const hash1 = this.#calculatePerceptualHash(frame1);
    const hash2 = this.#calculatePerceptualHash(frame2);

    let hammingDistance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        hammingDistance++;
      }
    }

    return hammingDistance / hash1.length;
  }

  #calculatePerceptualHash(frame: ImageData): number[] {
    const size = 32;
    const resized = this.#resizeImageData(frame, size, size);
    const grayscale = this.#toGrayscale(resized);

    const dctData = this.#simpleDCT(grayscale, size);

    const dctLowFreq = dctData.slice(0, 64);
    const median = this.#calculateMedian(dctLowFreq);

    const hash: number[] = [];
    for (let i = 0; i < dctLowFreq.length; i++) {
      hash.push(dctLowFreq[i] > median ? 1 : 0);
    }

    return hash;
  }

  #comparePixelDifference(frame1: ImageData, frame2: ImageData): number {
    const data1 = frame1.data;
    const data2 = frame2.data;

    let totalDifference = 0;
    for (let i = 0; i < data1.length; i += 4) {
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
      totalDifference += (rDiff + gDiff + bDiff) / 3;
    }

    return totalDifference / (data1.length / 4) / 255;
  }

  #compareEdges(frame1: ImageData, frame2: ImageData): number {
    const edges1 = this.#detectEdges(frame1);
    const edges2 = this.#detectEdges(frame2);

    return this.#comparePixelDifference(edges1, edges2);
  }

  #detectEdges(frame: ImageData): ImageData {
    const width = frame.width;
    const height = frame.height;
    const grayscale = this.#toGrayscale(frame);
    const edges = new ImageData(width, height);

    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];

    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const pixel = grayscale.data[idx];
            gx += pixel * sobelX[ky + 1][kx + 1];
            gy += pixel * sobelY[ky + 1][kx + 1];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const idx = (y * width + x) * 4;
        edges.data[idx] = magnitude;
        edges.data[idx + 1] = magnitude;
        edges.data[idx + 2] = magnitude;
        edges.data[idx + 3] = 255;
      }
    }

    return edges;
  }

  #toGrayscale(frame: ImageData): ImageData {
    const grayscale = new ImageData(frame.width, frame.height);
    const data = frame.data;
    const gray = grayscale.data;

    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      gray[i] = avg;
      gray[i + 1] = avg;
      gray[i + 2] = avg;
      gray[i + 3] = 255;
    }

    return grayscale;
  }

  #resizeImageData(frame: ImageData, newWidth: number, newHeight: number): ImageData {
    const resized = new ImageData(newWidth, newHeight);
    const xRatio = frame.width / newWidth;
    const yRatio = frame.height / newHeight;

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.floor(x * xRatio);
        const srcY = Math.floor(y * yRatio);
        const srcIdx = (srcY * frame.width + srcX) * 4;
        const dstIdx = (y * newWidth + x) * 4;

        resized.data[dstIdx] = frame.data[srcIdx];
        resized.data[dstIdx + 1] = frame.data[srcIdx + 1];
        resized.data[dstIdx + 2] = frame.data[srcIdx + 2];
        resized.data[dstIdx + 3] = 255;
      }
    }

    return resized;
  }

  #simpleDCT(imageData: ImageData, size: number): number[] {
    const result: number[] = [];
    const data = imageData.data;

    for (let u = 0; u < size; u++) {
      for (let v = 0; v < size; v++) {
        let sum = 0;
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const pixel = data[(y * size + x) * 4];
            sum += pixel * 
              Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
              Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
          }
        }
        result.push(sum);
      }
    }

    return result;
  }

  #calculateMedian(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}

