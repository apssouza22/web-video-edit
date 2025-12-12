import type { FeatureExtractionPipeline, Tensor } from "@huggingface/transformers";

export class EmbeddingCalculator {
  #featureExtractor: FeatureExtractionPipeline;

  constructor(featureExtractor: FeatureExtractionPipeline) {
    this.#featureExtractor = featureExtractor;
  }

  async calculateEmbedding(text: string): Promise<Float32Array> {
    const embeddings = await this.#featureExtractor(text, {
      pooling: "mean",
      normalize: true,
    }) as Tensor;
    return new Float32Array(embeddings.data as Float32Array);
  }

  calculateCosineSimilarity(vectorA: Float32Array, vectorB: Float32Array): number {
    const dotProd = this.#dotProduct(vectorA, vectorB);
    const magnitudeA = this.#magnitude(vectorA);
    const magnitudeB = this.#magnitude(vectorB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProd / (magnitudeA * magnitudeB);
  }

  #dotProduct(vectorA: Float32Array, vectorB: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < vectorA.length; i++) {
      sum += vectorA[i] * vectorB[i];
    }
    return sum;
  }

  #magnitude(vector: Float32Array): number {
    let sumOfSquares = 0;
    for (let i = 0; i < vector.length; i++) {
      sumOfSquares += vector[i] * vector[i];
    }
    return Math.sqrt(sumOfSquares);
  }
}

