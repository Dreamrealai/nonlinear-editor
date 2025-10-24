/**
 * Web Worker for Audio Waveform Processing
 *
 * Offloads expensive waveform data extraction from the main thread
 * to prevent UI blocking during audio processing.
 */

type WaveformMessage = {
  type: 'process';
  audioBuffer: ArrayBuffer;
  sampleCount: number;
};

type WaveformResponse = {
  type: 'result' | 'error';
  data?: Float32Array;
  error?: string;
};

self.onmessage = async (e: MessageEvent<WaveformMessage>): Promise<void> => {
  const { type, audioBuffer, sampleCount } = e.data;

  if (type !== 'process') {
    return;
  }

  try {
    // Create offline audio context for processing
    const audioContext = new OfflineAudioContext(1, audioBuffer.byteLength, 44100);
    const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);

    // Get audio data from first channel
    const rawData = decodedBuffer.getChannelData(0);

    // Downsample to match desired sample count
    const blockSize = Math.floor(rawData.length / sampleCount);
    const filteredData = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      const start = blockSize * i;
      let sum = 0;

      // Average the block for this sample
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j] ?? 0);
      }

      filteredData[i] = sum / blockSize;
    }

    // Send result back to main thread
    const response: WaveformResponse = {
      type: 'result',
      data: filteredData,
    };

    self.postMessage(response, { transfer: [filteredData.buffer] });
  } catch (error) {
    // Send error back to main thread
    const response: WaveformResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    self.postMessage(response);
  }
};

export {};
