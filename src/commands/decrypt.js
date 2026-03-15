import { createReadStream, createWriteStream } from 'node:fs';
import { access, unlink, open, stat } from 'node:fs/promises';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
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
  AUTH_TAG_LENGTH,
  KEY_LENGTH,
  HEADER_LENGTH,
  CIPHER_ALGORITHM,
} from '../utils/cryptoConstants.js';

export async function runDecrypt(currentDir, options) {
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

  const statInfo = await stat(inputPath);
  const minFileSize = HEADER_LENGTH + AUTH_TAG_LENGTH;

  if (statInfo.size < minFileSize) {
    throw new Error('Invalid encrypted file');
  }

  const fileHandle = await open(inputPath, 'r');

  let salt;
  let iv;
  let authTag;

  try {
    salt = Buffer.alloc(SALT_LENGTH);
    iv = Buffer.alloc(IV_LENGTH);
    authTag = Buffer.alloc(AUTH_TAG_LENGTH);

    await fileHandle.read(salt, 0, SALT_LENGTH, 0);
    await fileHandle.read(iv, 0, IV_LENGTH, SALT_LENGTH);
    await fileHandle.read(
      authTag,
      0,
      AUTH_TAG_LENGTH,
      statInfo.size - AUTH_TAG_LENGTH,
    );
  } finally {
    await fileHandle.close();
  }

  const key = await deriveKey(options.password, salt);
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const ciphertextStart = HEADER_LENGTH;
  const ciphertextEnd = statInfo.size - AUTH_TAG_LENGTH - 1;

  const inputStream = createReadStream(inputPath, {
    start: ciphertextStart,
    end: ciphertextEnd,
  });

  const outputStream = createWriteStream(outputPath);

  try {
    await pipeline(
      inputStream,
      decipher,
      outputStream,
    );
  } catch (error) {
    inputStream.destroy();
    decipher.destroy();
    outputStream.destroy();

    try {
      await unlink(outputPath);
    } catch { }

    throw error;
  }
}