import { createReadStream } from 'node:fs';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { resolvePath } from '../utils/pathResolver.js';
import {
  hasOnlyAllowedOptions,
  requireStringOption,
} from '../utils/argParser.js';

import { InputError } from '../errors.js';
import { access, writeFile } from 'node:fs/promises';

const SUPPORTED_ALGORITHMS = ['sha256', 'md5', 'sha512'];

export async function runHash(currentDir, options) {
  if (!hasOnlyAllowedOptions(options, ['input', 'algorithm', 'save'])) {
    throw new InputError();
  }

  if (!requireStringOption(options, 'input')) {
    throw new InputError();
  }

  const algorithm = options.algorithm ?? 'sha256';

  if (typeof algorithm !== 'string') {
    throw new InputError();
  }

  if (options.save !== undefined && options.save !== true) {
    throw new InputError();
  }

  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    throw new Error('Unsupported algorithm');
  }


  const inputPath = resolvePath(currentDir, options.input);

  await access(inputPath);

  const hash = crypto.createHash(algorithm);

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
    createReadStream(inputPath),
    sink,
  );

  const digest = hash.digest('hex');

  console.log(`${algorithm}: ${digest}`);

  if (options.save === true) {
    const hashFilePath = `${inputPath}.${algorithm}`;
    await writeFile(hashFilePath, digest);
  }
}