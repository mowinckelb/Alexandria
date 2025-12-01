/**
 * Audio chunking utility for Whisper API (25MB limit per request)
 * Splits large audio files into smaller chunks for transcription
 */

const WHISPER_MAX_SIZE = 24 * 1024 * 1024; // 24MB to be safe (limit is 25MB)

export interface AudioChunk {
  buffer: Buffer;
  index: number;
  totalChunks: number;
}

/**
 * Check if audio file needs chunking
 */
export function needsChunking(sizeBytes: number): boolean {
  return sizeBytes > WHISPER_MAX_SIZE;
}

/**
 * Split audio buffer into chunks based on size
 * Note: This is a simple byte-based split. For production, consider using ffmpeg
 * to split at silence points for better transcription quality.
 */
export function chunkAudioBuffer(buffer: Buffer, fileName: string): AudioChunk[] {
  if (!needsChunking(buffer.length)) {
    return [{ buffer, index: 0, totalChunks: 1 }];
  }

  const chunks: AudioChunk[] = [];
  const totalChunks = Math.ceil(buffer.length / WHISPER_MAX_SIZE);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * WHISPER_MAX_SIZE;
    const end = Math.min(start + WHISPER_MAX_SIZE, buffer.length);
    chunks.push({
      buffer: buffer.slice(start, end),
      index: i,
      totalChunks
    });
  }

  console.log(`[AudioChunker] Split ${fileName} (${(buffer.length / 1024 / 1024).toFixed(1)}MB) into ${totalChunks} chunks`);
  return chunks;
}

/**
 * Create a File object from a buffer chunk for Whisper API
 */
export function bufferToFile(buffer: Buffer, fileName: string, mimeType: string): File {
  const uint8Array = new Uint8Array(buffer);
  const blob = new Blob([uint8Array], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}
