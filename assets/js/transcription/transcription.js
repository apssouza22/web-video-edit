export class TranscriptionManager{

  constructor() {
    this.worker = new Worker(new URL("../worker.js", import.meta.url), {
      type: "module",
    });
    this.addEventListener();
    window.worker = this.worker; // Expose worker globally for debugging
  }

  addEventListener() {
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
          this.onTranscriptionComplete(message.data);
          // console.log("complete", message.data)
          break;

        case "initiate":
          console.log("Initiating model loading");
          break;
        case "ready":
          console.log("Model file ready");
          break;
        case "error":
          alert(
              `${message.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.\n\nIf this is not the case, please file a bug report.`,
          );
          break;
        case "done":
          // console.log("Model file loaded:", message.file);
          break;

        default:
          // initiate/download/done
          break;
      }
    }).bind(this));

  }

  onTranscriptionComplete(data) {
    console.log("Transcription complete:", data);
  }

  getMockedData() {
    return {
      "text": " I (speaking in foreign language) (mumbling) (speaking in foreign language) (mumbling) I wish you could have used this. I wish I could have used this much. I wish you could have.",
      "chunks": [
        {
          "text": " I",
          "timestamp": [
            29.98,
            29.98
          ]
        },
        {
          "text": " (speaking",
          "timestamp": [
            42.46,
            42.46
          ]
        },
        {
          "text": " in",
          "timestamp": [
            42.46,
            42.46
          ]
        },
        {
          "text": " foreign",
          "timestamp": [
            42.46,
            42.46
          ]
        },
        {
          "text": " language)",
          "timestamp": [
            42.46,
            42.46
          ]
        },
        {
          "text": " (mumbling)",
          "timestamp": [
            69.98,
            89.98
          ]
        },
        {
          "text": " (speaking",
          "timestamp": [
            94.3,
            94.3
          ]
        },
        {
          "text": " in",
          "timestamp": [
            94.3,
            94.3
          ]
        },
        {
          "text": " foreign",
          "timestamp": [
            94.3,
            94.3
          ]
        },
        {
          "text": " language)",
          "timestamp": [
            94.3,
            94.3
          ]
        },
        {
          "text": " (mumbling)",
          "timestamp": [
            129.98,
            149.98
          ]
        },
        {
          "text": " I",
          "timestamp": [
            140,
            140.48
          ]
        },
        {
          "text": " wish",
          "timestamp": [
            140.48,
            141.42
          ]
        },
        {
          "text": " you",
          "timestamp": [
            141.42,
            142.18
          ]
        },
        {
          "text": " could",
          "timestamp": [
            142.18,
            142.68
          ]
        },
        {
          "text": " have",
          "timestamp": [
            142.68,
            143.18
          ]
        },
        {
          "text": " used",
          "timestamp": [
            143.18,
            143.74
          ]
        },
        {
          "text": " this.",
          "timestamp": [
            143.74,
            144.66
          ]
        },
        {
          "text": " I",
          "timestamp": [
            145.98,
            146.36
          ]
        },
        {
          "text": " wish",
          "timestamp": [
            146.36,
            147.66
          ]
        },
        {
          "text": " I",
          "timestamp": [
            147.66,
            148.28
          ]
        },
        {
          "text": " could",
          "timestamp": [
            148.28,
            148.72
          ]
        },
        {
          "text": " have",
          "timestamp": [
            148.72,
            148.72
          ]
        },
        {
          "text": " used",
          "timestamp": [
            148.72,
            149.46
          ]
        },
        {
          "text": " this",
          "timestamp": [
            149.46,
            152.96
          ]
        },
        {
          "text": " much.",
          "timestamp": [
            152.96,
            154.96
          ]
        },
        {
          "text": " I",
          "timestamp": [
            154.96,
            156.16
          ]
        },
        {
          "text": " wish",
          "timestamp": [
            156.16,
            156.54
          ]
        },
        {
          "text": " you",
          "timestamp": [
            156.54,
            158.42
          ]
        },
        {
          "text": " could",
          "timestamp": [
            158.42,
            159.12
          ]
        },
        {
          "text": " have.",
          "timestamp": [
            159.12,
            166.96
          ]
        }
      ]
    }
  }
}


