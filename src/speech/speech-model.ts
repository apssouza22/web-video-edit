import type { SpeechError, SpeechResult } from './types.js';
import { SpeechModelFactory } from './model-factory.js';

export async function generateSpeech(
  text: string,
  voice: string,
  speed: number
): Promise<SpeechResult> {
  try {
    const tts = await SpeechModelFactory.getInstance((data) => {
      if (typeof self !== 'undefined' && self.postMessage) {
        self.postMessage(data);
      }
    });

    // @ts-ignore - kokoro-js types may not be complete
    const audio = await tts.generate(text, { voice, speed });

    // @ts-ignore - get raw audio data from the result
    const audioData = audio.audio;
    const sampleRate = audio.sampling_rate || 24000;

    return {
      audioData: audioData,
      sampleRate: sampleRate,
    };
  } catch (error) {
    return onModelInferenceError(error as SpeechError);
  }
}

export function onModelInferenceError(error: SpeechError): SpeechResult {
  console.error('Speech model inference error:', error);

  if (typeof self !== 'undefined' && self.postMessage) {
    self.postMessage({
      status: 'error',
      task: 'speech-generation',
      data: error,
    });
  }

  return {
    audioData: new Float32Array(0),
    sampleRate: 24000,
  };
}

