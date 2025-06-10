import { TranscriptionView } from './transcription-view.js';

export class TranscriptionManager {

  constructor() {
    this.worker = new Worker(new URL("../worker.js", import.meta.url), {
      type: "module",
    });
    this.transcriptionView = new TranscriptionView(this);
    this.onRemoveIntervalListener = (startTime, endTime) => {}

    this.#addEventListener();
    window.worker = this.worker; // Expose worker globally for debugging
  }

  #addEventListener() {
    this.worker.addEventListener("message", ((event) => {
      const message = event.data;
      switch (message.status) {
        case "progress":
          // console.log("Loading ", message.progress)
          break;
        case "update":
          // console.log("update", message.data)
          break;
        case "complete":
          this.#onTranscriptionComplete(message.data);
          break;

        case "initiate":
          console.log("Initiating model loading");
          break;
        case "ready":
          console.log("Model ready");
          break;
        case "error":
          alert(
              `${message.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.\n\nIf this is not the case, please file a bug report.`,
          );
          break;
        case "done":
          console.log("Model file done loaded:", message.file);
          break;

        default:
          // initiate/download/done
          break;
      }
    }).bind(this));
  }

  addRemoveIntervalListener(callback) {
    if (typeof callback === 'function') {
      this.onRemoveIntervalListener = callback;
    } else {
      console.error("Callback must be a function");
    }
  }

  /**
   * Removes an interval from the transcription
   * @param startTime
   * @param endTime
   */
  removeInterval(startTime, endTime) {
    this.onRemoveIntervalListener(startTime, endTime);
  }

  #onTranscriptionComplete(data) {
    console.log("Transcription complete:", data);
    
    // Update the transcription view with the new data
    if (this.transcriptionView) {
      this.transcriptionView.updateTranscription(data);
    }
  }

  startTranscription(audioBuffer) {
    const data = getMockedData();
    this.#onTranscriptionComplete(data);

    return

    const audio = transformAudioBuffer(audioBuffer);
    console.log("Starting transcription with audio data:", audio);
    this.worker.postMessage({audio: audio});
  }

}

function transformAudioBuffer(audioData) {
  let audio;
  if (audioData.numberOfChannels === 2) {
    const SCALING_FACTOR = Math.sqrt(2);

    let left = audioData.getChannelData(0);
    let right = audioData.getChannelData(1);

    audio = new Float32Array(left.length);
    for (let i = 0; i < audioData.length; ++i) {
      audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
    }
  } else {
    // If the audio is not stereo, we can just use the first channel:
    audio = audioData.getChannelData(0);
  }
  return audio
}


function getMockedData() {
  return {
    "text": " Hello, welcome to my course on security architecture. I'm excited to guide you through the world of digital security. In this course, you'll join me on a hands-on journey to master the art of building security systems. I will show you how to leverage powerful open source tools like keyclock, Nginx, Open, and Wasp project, and much more. Together, we will deploy web application firewalls, configure reverse products, implement identity-driven authentication, and enforce robust security policies. Plus, you will implement secure protocols with digital certificates to ensure that integrity and privacy. All that with practical real-world scenarios. Whether you are a software developer, a career professional, or a system architect, this course is for you.",
    "chunks": [
      {
        "text": " Hello,",
        "timestamp": [
          0,
          0.28
        ]
      },
      {
        "text": " welcome",
        "timestamp": [
          0.6,
          0.92
        ]
      },
      {
        "text": " to",
        "timestamp": [
          0.92,
          1.22
        ]
      },
      {
        "text": " my",
        "timestamp": [
          1.22,
          1.38
        ]
      },
      {
        "text": " course",
        "timestamp": [
          1.38,
          1.64
        ]
      },
      {
        "text": " on",
        "timestamp": [
          1.64,
          1.88
        ]
      },
      {
        "text": " security",
        "timestamp": [
          1.88,
          2.14
        ]
      },
      {
        "text": " architecture.",
        "timestamp": [
          2.14,
          2.86
        ]
      },
      {
        "text": " I'm",
        "timestamp": [
          3.28,
          3.52
        ]
      },
      {
        "text": " excited",
        "timestamp": [
          3.52,
          3.88
        ]
      },
      {
        "text": " to",
        "timestamp": [
          3.88,
          4.18
        ]
      },
      {
        "text": " guide",
        "timestamp": [
          4.18,
          4.42
        ]
      },
      {
        "text": " you",
        "timestamp": [
          4.42,
          4.68
        ]
      },
      {
        "text": " through",
        "timestamp": [
          4.68,
          4.94
        ]
      },
      {
        "text": " the",
        "timestamp": [
          4.94,
          5.16
        ]
      },
      {
        "text": " world",
        "timestamp": [
          5.16,
          5.5
        ]
      },
      {
        "text": " of",
        "timestamp": [
          5.5,
          5.94
        ]
      },
      {
        "text": " digital",
        "timestamp": [
          5.94,
          6.34
        ]
      },
      {
        "text": " security.",
        "timestamp": [
          6.34,
          6.96
        ]
      },
      {
        "text": " In",
        "timestamp": [
          7.76,
          8
        ]
      },
      {
        "text": " this",
        "timestamp": [
          8,
          8.2
        ]
      },
      {
        "text": " course,",
        "timestamp": [
          8.2,
          8.54
        ]
      },
      {
        "text": " you'll",
        "timestamp": [
          8.8,
          9.1
        ]
      },
      {
        "text": " join",
        "timestamp": [
          9.1,
          9.36
        ]
      },
      {
        "text": " me",
        "timestamp": [
          9.36,
          9.58
        ]
      },
      {
        "text": " on",
        "timestamp": [
          9.58,
          9.84
        ]
      },
      {
        "text": " a",
        "timestamp": [
          9.84,
          10
        ]
      },
      {
        "text": " hands",
        "timestamp": [
          10,
          10.22
        ]
      },
      {
        "text": "-on",
        "timestamp": [
          10.22,
          10.48
        ]
      },
      {
        "text": " journey",
        "timestamp": [
          10.48,
          10.9
        ]
      },
      {
        "text": " to",
        "timestamp": [
          10.9,
          11.4
        ]
      },
      {
        "text": " master",
        "timestamp": [
          11.4,
          11.8
        ]
      },
      {
        "text": " the",
        "timestamp": [
          11.8,
          12.08
        ]
      },
      {
        "text": " art",
        "timestamp": [
          12.08,
          12.34
        ]
      },
      {
        "text": " of",
        "timestamp": [
          12.34,
          12.72
        ]
      },
      {
        "text": " building",
        "timestamp": [
          12.72,
          13.08
        ]
      },
      {
        "text": " security",
        "timestamp": [
          13.08,
          13.56
        ]
      },
      {
        "text": " systems.",
        "timestamp": [
          13.56,
          14.24
        ]
      },
      {
        "text": " I",
        "timestamp": [
          14.78,
          15.02
        ]
      },
      {
        "text": " will",
        "timestamp": [
          15.02,
          15.16
        ]
      },
      {
        "text": " show",
        "timestamp": [
          15.16,
          15.38
        ]
      },
      {
        "text": " you",
        "timestamp": [
          15.38,
          15.54
        ]
      },
      {
        "text": " how",
        "timestamp": [
          15.54,
          15.86
        ]
      },
      {
        "text": " to",
        "timestamp": [
          15.86,
          16.14
        ]
      },
      {
        "text": " leverage",
        "timestamp": [
          16.14,
          16.58
        ]
      },
      {
        "text": " powerful",
        "timestamp": [
          16.58,
          17.26
        ]
      },
      {
        "text": " open",
        "timestamp": [
          17.26,
          17.7
        ]
      },
      {
        "text": " source",
        "timestamp": [
          17.7,
          17.94
        ]
      },
      {
        "text": " tools",
        "timestamp": [
          17.94,
          18.44
        ]
      },
      {
        "text": " like",
        "timestamp": [
          18.44,
          19.06
        ]
      },
      {
        "text": " keyclock,",
        "timestamp": [
          19.06,
          19.72
        ]
      },
      {
        "text": " Nginx,",
        "timestamp": [
          20.08,
          20.6
        ]
      },
      {
        "text": " Open,",
        "timestamp": [
          21.28,
          21.46
        ]
      },
      {
        "text": " and",
        "timestamp": [
          21.96,
          22.08
        ]
      },
      {
        "text": " Wasp",
        "timestamp": [
          22.08,
          22.42
        ]
      },
      {
        "text": " project,",
        "timestamp": [
          22.42,
          22.84
        ]
      },
      {
        "text": " and",
        "timestamp": [
          23.34,
          23.42
        ]
      },
      {
        "text": " much",
        "timestamp": [
          23.42,
          23.6
        ]
      },
      {
        "text": " more.",
        "timestamp": [
          23.6,
          23.9
        ]
      },
      {
        "text": " Together,",
        "timestamp": [
          24.46,
          24.86
        ]
      },
      {
        "text": " we",
        "timestamp": [
          25.18,
          25.38
        ]
      },
      {
        "text": " will",
        "timestamp": [
          25.38,
          25.5
        ]
      },
      {
        "text": " deploy",
        "timestamp": [
          25.5,
          25.94
        ]
      },
      {
        "text": " web",
        "timestamp": [
          25.94,
          26.6
        ]
      },
      {
        "text": " application",
        "timestamp": [
          26.6,
          27.12
        ]
      },
      {
        "text": " firewalls,",
        "timestamp": [
          27.12,
          27.76
        ]
      },
      {
        "text": " configure",
        "timestamp": [
          28.22,
          28.52
        ]
      },
      {
        "text": " reverse",
        "timestamp": [
          28.52,
          28.98
        ]
      },
      {
        "text": " products,",
        "timestamp": [
          28.98,
          29.38
        ]
      },
      {
        "text": " implement",
        "timestamp": [
          29.96,
          30.36
        ]
      },
      {
        "text": " identity",
        "timestamp": [
          30.36,
          30.88
        ]
      },
      {
        "text": "-driven",
        "timestamp": [
          30.88,
          31.28
        ]
      },
      {
        "text": " authentication,",
        "timestamp": [
          31.28,
          31.9
        ]
      },
      {
        "text": " and",
        "timestamp": [
          32.44,
          32.58
        ]
      },
      {
        "text": " enforce",
        "timestamp": [
          32.58,
          33.04
        ]
      },
      {
        "text": " robust",
        "timestamp": [
          33.04,
          33.74
        ]
      },
      {
        "text": " security",
        "timestamp": [
          33.74,
          34.18
        ]
      },
      {
        "text": " policies.",
        "timestamp": [
          34.18,
          34.76
        ]
      },
      {
        "text": " Plus,",
        "timestamp": [
          35.46,
          35.9
        ]
      },
      {
        "text": " you",
        "timestamp": [
          36.24,
          36.48
        ]
      },
      {
        "text": " will",
        "timestamp": [
          36.48,
          36.62
        ]
      },
      {
        "text": " implement",
        "timestamp": [
          36.62,
          37.1
        ]
      },
      {
        "text": " secure",
        "timestamp": [
          37.1,
          37.52
        ]
      },
      {
        "text": " protocols",
        "timestamp": [
          37.52,
          38.06
        ]
      },
      {
        "text": " with",
        "timestamp": [
          38.06,
          38.62
        ]
      },
      {
        "text": " digital",
        "timestamp": [
          38.62,
          39.14
        ]
      },
      {
        "text": " certificates",
        "timestamp": [
          39.14,
          39.56
        ]
      },
      {
        "text": " to",
        "timestamp": [
          39.56,
          40.38
        ]
      },
      {
        "text": " ensure",
        "timestamp": [
          40.38,
          40.78
        ]
      },
      {
        "text": " that",
        "timestamp": [
          40.78,
          41.08
        ]
      },
      {
        "text": " integrity",
        "timestamp": [
          41.08,
          41.62
        ]
      },
      {
        "text": " and",
        "timestamp": [
          41.62,
          42.08
        ]
      },
      {
        "text": " privacy.",
        "timestamp": [
          42.08,
          42.46
        ]
      },
      {
        "text": " All",
        "timestamp": [
          43.16,
          43.5
        ]
      },
      {
        "text": " that",
        "timestamp": [
          43.5,
          43.76
        ]
      },
      {
        "text": " with",
        "timestamp": [
          43.76,
          44.04
        ]
      },
      {
        "text": " practical",
        "timestamp": [
          44.04,
          44.66
        ]
      },
      {
        "text": " real",
        "timestamp": [
          44.66,
          44.96
        ]
      },
      {
        "text": "-world",
        "timestamp": [
          44.96,
          45.12
        ]
      },
      {
        "text": " scenarios.",
        "timestamp": [
          45.12,
          45.78
        ]
      },
      {
        "text": " Whether",
        "timestamp": [
          46.36,
          46.64
        ]
      },
      {
        "text": " you",
        "timestamp": [
          46.64,
          47.02
        ]
      },
      {
        "text": " are",
        "timestamp": [
          47.02,
          47.2
        ]
      },
      {
        "text": " a",
        "timestamp": [
          47.2,
          47.3
        ]
      },
      {
        "text": " software",
        "timestamp": [
          47.3,
          47.6
        ]
      },
      {
        "text": " developer,",
        "timestamp": [
          47.6,
          48.2
        ]
      },
      {
        "text": " a",
        "timestamp": [
          48.74,
          48.84
        ]
      },
      {
        "text": " career",
        "timestamp": [
          48.84,
          49.06
        ]
      },
      {
        "text": " professional,",
        "timestamp": [
          49.06,
          49.68
        ]
      },
      {
        "text": " or",
        "timestamp": [
          50.02,
          50.44
        ]
      },
      {
        "text": " a",
        "timestamp": [
          50.44,
          50.82
        ]
      },
      {
        "text": " system",
        "timestamp": [
          50.82,
          50.84
        ]
      },
      {
        "text": " architect,",
        "timestamp": [
          50.84,
          51.32
        ]
      },
      {
        "text": " this",
        "timestamp": [
          52.06,
          52.14
        ]
      },
      {
        "text": " course",
        "timestamp": [
          52.14,
          52.44
        ]
      },
      {
        "text": " is",
        "timestamp": [
          52.44,
          52.78
        ]
      },
      {
        "text": " for",
        "timestamp": [
          52.78,
          53
        ]
      },
      {
        "text": " you.",
        "timestamp": [
          53,
          53.24
        ]
      }
    ]
  }
}
