// Mock for ts-ebml CDN import
// This is used in tests to avoid importing from CDN

/**
 * Mock Decoder class that simulates EBML decoding
 */
class Decoder {
  decode(buffer) {
    // Return a minimal set of mock EBML elements
    return [
      { name: 'EBML', type: 'm' },
      { name: 'Segment', type: 'm' },
      { name: 'Info', type: 'm' },
      { name: 'Duration', type: 'f', data: 1000 },
      { name: 'Tracks', type: 'm' },
      { name: 'Cluster', type: 'm' }
    ];
  }
}

/**
 * Mock Encoder class that simulates EBML encoding
 */
class Encoder {
  encode(elements) {
    // Return a simple ArrayBuffer
    const buffer = new ArrayBuffer(100);
    return buffer;
  }
}

/**
 * Mock Reader class that simulates EBML reading
 */
class Reader {
  constructor() {
    this.logging = false;
    this.drop_default_duration = false;
    this.duration = 1000;
    this.metadataSize = 50;
    this.metadatas = [];
    this.cues = [
      { CueTime: 0, CueTrackPositions: [{ CueTrack: 1, CueClusterPosition: 0 }] },
      { CueTime: 500, CueTrackPositions: [{ CueTrack: 1, CueClusterPosition: 500 }] },
      { CueTime: 1000, CueTrackPositions: [{ CueTrack: 1, CueClusterPosition: 1000 }] }
    ];
  }

  read(elm) {
    // Simulate reading an element
    this.metadatas.push(elm);
  }

  stop() {
    // Finalize reading
  }
}

/**
 * Mock tools namespace with makeMetadataSeekable function
 */
const tools = {
  makeMetadataSeekable(metadatas, duration, cues) {
    // Return metadatas with mock Cues element added
    return [
      ...metadatas,
      {
        name: 'Cues',
        type: 'm',
        data: cues
      }
    ];
  }
};

// Export named exports
export { Decoder, Encoder, Reader, tools };

