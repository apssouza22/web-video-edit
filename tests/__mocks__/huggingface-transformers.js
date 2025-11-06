// Mock for @huggingface/transformers CDN import
// This is used in tests to avoid importing from CDN

export const env = {
  allowLocalModels: false
};

export const pipeline = () => {
  return async () => {
    return {
      text: 'Mock transcription',
      chunks: []
    };
  };
};

export default {
  env,
  pipeline
};

