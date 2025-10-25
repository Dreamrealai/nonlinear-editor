/**
 * Waveform Worker
 *
 * Processes audio data to generate waveform visualization data.
 * Runs in a Web Worker to offload computation from the main thread.
 */

interface ProcessMessage {
  type: 'process';
  audioBuffer: ArrayBuffer;
  sampleCount: number;
}

interface ResultMessage {
  type: 'result';
  data: Float32Array;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

self.addEventListener('message', async (e: MessageEvent<ProcessMessage>): Promise<void> => {
  const { type, audioBuffer, sampleCount } = e.data;

  if (type !== 'process') {
    return;
  }

  try {
    // Decode audio data
    const audioContext = new AudioContext();
    const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);

    // Get audio data from first channel
    const rawData = decodedBuffer.getChannelData(0);

    // Downsample to match requested sample count
    const blockSize = Math.floor(rawData.length / sampleCount);
    const filteredData = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      const start = blockSize * i;
      let sum = 0;

      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j] ?? 0);
      }

      filteredData[i] = sum / blockSize;
    }

    // Send result back to main thread
    const resultMessage: ResultMessage = {
      type: 'result',
      data: filteredData,
    };

    // Transfer ownership of the buffer to the main thread
    (self.postMessage as (message: ResultMessage, transfer?: Transferable[]) => void)(
      resultMessage,
      [filteredData.buffer]
    );

    // Clean up
    await audioContext.close();
  } catch (error) {
    // Send error back to main thread
    const errorMessage: ErrorMessage = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error processing audio',
    };

    self.postMessage(errorMessage);
  }
});

// Export an empty object to satisfy TypeScript module requirements
export {};
