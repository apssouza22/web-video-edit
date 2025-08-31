/// <reference types="vite/client" />

// Allow importing the ESM CDN module in TS
declare module 'https://cdn.jsdelivr.net/npm/webm-duration-fix@1.0.4/+esm' {
  const mod: any;
  export default mod;
}
