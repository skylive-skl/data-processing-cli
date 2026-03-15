import { createReadStream, createWriteStream } from 'node:fs';
import { access, unlink } from 'node:fs/promises';
import crypto from 'node:crypto';
import { finished } from 'node:stream/promises';
import { resolvePath } from '../utils/pathResolver.js';
import {
  hasOnlyAllowedOptions,
  requireStringOption,
} from '../utils/argParser.js';
import { InputError } from '../errors.js';
import { deriveKey } from '../utils/deriveKey.js';
import {
  SALT_LENGTH,
  IV_LENGTH,
  CIPHER_ALGORITHM,
} from '../utils/cryptoConstants.js';

export async function runEncrypt(currentDir, options) {
  if (!hasOnlyAllowedOptions(options, ['input', 'output', 'password'])) {
    throw new InputError();
  }

  if (!requireStringOption(options, 'input')) {
    throw new InputError();
  }

  if (!requireStringOption(options, 'output')) {
    throw new InputError();
  }

  if (!requireStringOption(options, 'password')) {
    throw new InputError();
  }

  const inputPath = resolvePath(currentDir, options.input);
  const outputPath = resolvePath(currentDir, options.output);

  await access(inputPath);

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = await deriveKey(options.password, salt);

  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);
  const inputStream = createReadStream(inputPath);
  const outputStream = createWriteStream(outputPath);

  try {
    await writeToStream(outputStream, Buffer.concat([salt, iv]));

    inputStream.pipe(cipher).pipe(outputStream, { end: false });

    await finished(cipher, { cleanup: true });

    const authTag = cipher.getAuthTag();
    await writeToStream(outputStream, authTag);
    await endStream(outputStream);
  } catch (error) {
    inputStream.destroy();
    cipher.destroy();
    outputStream.destroy();

    try {
      await unlink(outputPath);
    } catch { }

    throw error;
  }
}

function writeToStream(stream, chunk) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onDrain = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      stream.off('error', onError);
      stream.off('drain', onDrain);
    };

    stream.on('error', onError);

    if (stream.write(chunk)) {
      cleanup();
      resolve();
    } else {
      stream.on('drain', onDrain);
    }
  });
}

function endStream(stream) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onFinish = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      stream.off('error', onError);
      stream.off('finish', onFinish);
    };

    stream.on('error', onError);
    stream.on('finish', onFinish);
    stream.end();
  });
}