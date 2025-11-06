export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^https://cdn\\.jsdelivr\\.net/npm/@huggingface/transformers$': '<rootDir>/tests/__mocks__/huggingface-transformers.js',
    // '^https://cdn\\.jsdelivr\\.net/npm/@xenova/transformers$': '<rootDir>/tests/__mocks__/huggingface-transformers.js',
    '^https://cdn\\.jsdelivr\\.net/npm/webm-duration-fix@1\\.0\\.4/\\+esm$': '<rootDir>/tests/__mocks__/webm-duration-fix.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/main.js',
    '!src/main.ts',
    '!src/**/*.worker.js',
    '!src/**/worker.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  preset: 'ts-jest/presets/default-esm',
};

