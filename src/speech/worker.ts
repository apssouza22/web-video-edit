import { generateSpeech, onModelInferenceError } from './speech-model';
import { SpeechModelFactory } from './model-factory';
import type {
  GenerateSpeechMessage,
  LoadModelMessage,
  SpeechError,
  WorkerMessage,
  WorkerResponseMessage,
} from './types.js';

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (!message) {
    return;
  }

  if (isLoadModelMessage(message)) {
    await handleLoadModelMessage();
    return;
  }

  if (isGenerateSpeechMessage(message)) {
    await handleGenerateSpeechMessage(message);
    return;
  }

  console.warn('Unknown message received in speech worker:', message);
});

function isLoadModelMessage(message: WorkerMessage): message is LoadModelMessage {
  return message.task === 'load-model';
}

function isGenerateSpeechMessage(message: WorkerMessage): message is GenerateSpeechMessage {
  return message.task === 'generate-speech' && message.text !== undefined;
}

async function handleLoadModelMessage(): Promise<void> {
  console.log('Loading speech model...');

  try {
    await SpeechModelFactory.getInstance((data) => {
      self.postMessage(data);
    });
  } catch (error) {
    onModelInferenceError(error as SpeechError);
  }
}

async function handleGenerateSpeechMessage(message: GenerateSpeechMessage): Promise<void> {
  const progressMessage: WorkerResponseMessage = {
    status: 'progress',
    task: 'speech-generation',
    data: { status: 'generating', message: 'Generating speech...' },
  };
  self.postMessage(progressMessage);

  const result = await generateSpeech(message.text, message.voice, message.speed);

  if (!result || !result.audioData || result.audioData.length === 0) {
    const errorMessage: WorkerResponseMessage = {
      status: 'error',
      task: 'speech-generation',
      data: { status: 'error', message: 'Failed to generate speech' },
    };
    self.postMessage(errorMessage);
    return;
  }

  const responseMessage: WorkerResponseMessage = {
    status: 'complete',
    task: 'speech-generation',
    data: result,
  };
  self.postMessage(responseMessage);
}

