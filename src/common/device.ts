export function getExecDevice(){
  if (!('gpu' in navigator)) {
    return "wasm";
  }
  console.log("WebGPU is supported. Using WebGPU as execution device.");
  return "webgpu";
}