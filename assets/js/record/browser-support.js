/**
 * Check if the current browser supports screen recording
 * @returns {Object} Support status and details
 */
export function checkBrowserSupport() {
  const support = {
    isSupported: true,
    features: {
      getDisplayMedia: false,
      mediaRecorder: false,
      supportedCodecs: []
    },
    browserInfo: {
      name: 'Unknown',
      version: 'Unknown'
    },
    errors: []
  };

  // Detect browser
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf('Chrome') > -1) {
    support.browserInfo.name = 'Chrome';
  } else if (userAgent.indexOf('Firefox') > -1) {
    support.browserInfo.name = 'Firefox';
  } else if (userAgent.indexOf('Safari') > -1) {
    support.browserInfo.name = 'Safari';
  } else if (userAgent.indexOf('Edge') > -1) {
    support.browserInfo.name = 'Edge';
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    support.features.getDisplayMedia = true;
  } else {
    support.isSupported = false;
    support.errors.push('getDisplayMedia is not supported');
  }

  if (typeof MediaRecorder !== 'undefined') {
    support.features.mediaRecorder = true;

    const testCodecs = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
    ];

    support.features.supportedCodecs = testCodecs.filter(codec =>
        MediaRecorder.isTypeSupported(codec)
    );

    if (support.features.supportedCodecs.length === 0) {
      support.isSupported = false;
      support.errors.push('No supported video codecs found');
    }
  } else {
    support.isSupported = false;
    support.errors.push('MediaRecorder is not supported');
  }

  // Additional checks for known problematic browsers
  if (support.browserInfo.name === 'Safari') {
    // Safari has limited support
    support.errors.push('Safari has limited screen recording support');
    support.isSupported = false;
  }

  // Browser-specific optimizations and warnings
  if (support.browserInfo.name === 'Firefox') {
    // Firefox might have different behavior
    support.warnings = support.warnings || [];
    support.warnings.push('Firefox may require manual codec selection');
  }

  if (support.browserInfo.name === 'Chrome') {
    support.optimizations = support.optimizations || [];
    support.optimizations.push('Chrome provides optimal screen recording performance');
  }

  if (support.browserInfo.name === 'Edge') {
    // Edge should work similarly to Chrome
    support.optimizations = support.optimizations || [];
    support.optimizations.push('Edge supports modern screen recording features');
  }

  return support;
}

