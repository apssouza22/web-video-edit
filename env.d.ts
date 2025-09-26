/// <reference types="vite/client" />

// Allow importing the ESM CDN module in TS
declare module 'https://cdn.jsdelivr.net/npm/webm-duration-fix@1.0.4/+esm' {
  const mod: any;
  export default mod;
}

// Hugging Face Transformers library types
declare module 'https://cdn.jsdelivr.net/npm/@huggingface/transformers' {
  export interface Environment {
    allowLocalModels: boolean;
  }

  export const env: Environment;

  export interface PipelineOptions {
    progress_callback?: (data: any) => void;
    dtype?: string;
    revision?: string;
  }

  export function pipeline(
    task: string,
    model: string,
    options?: PipelineOptions
  ): Promise<any>;
}

// Alternative Xenova transformers (commented out in model.ts)
declare module 'https://cdn.jsdelivr.net/npm/@xenova/transformers' {
  export interface Environment {
    allowLocalModels: boolean;
  }

  export const env: Environment;

  export interface PipelineOptions {
    progress_callback?: (data: any) => void;
    dtype?: string;
    revision?: string;
  }

  export function pipeline(
    task: string,
    model: string,
    options?: PipelineOptions
  ): Promise<any>;
}
