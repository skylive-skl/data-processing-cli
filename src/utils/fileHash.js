import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

export const SUPPORTED_HASH_ALGORITHMS = ['sha256', 'md5', 'sha512'];

export async function calculateFileHash(filePath, algorithm) {
  const hash = createHash(algorithm);

  const sink = new Writable({
    write(chunk, encoding, callback) {
      try {
        hash.update(chunk);
        callback();
      } catch (error) {
        callback(error);
      }
    },
  });

  await pipeline(
    createReadStream(filePath),
    sink,
  );

  return hash.digest('hex');
}