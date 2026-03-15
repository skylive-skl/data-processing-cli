import { access, readFile } from 'node:fs/promises';
import { resolvePath } from '../utils/pathResolver.js';
import {
  hasOnlyAllowedOptions,
  requireStringOption,
} from '../utils/argParser.js';
import { InputError } from '../errors.js';
import {
  calculateFileHash,
  SUPPORTED_HASH_ALGORITHMS,
} from '../utils/fileHash.js';

export async function runHashCompare(currentDir, options) {
  if (!hasOnlyAllowedOptions(options, ['input', 'hash', 'algorithm'])) {
    throw new InputError();
  }

  if (!requireStringOption(options, 'input')) {
    throw new InputError();
  }

  if (!requireStringOption(options, 'hash')) {
    throw new InputError();
  }

  const algorithm = options.algorithm ?? 'sha256';

  if (typeof algorithm !== 'string') {
    throw new InputError();
  }

  if (!SUPPORTED_HASH_ALGORITHMS.includes(algorithm)) {
    throw new Error('Unsupported algorithm');
  }

  const inputPath = resolvePath(currentDir, options.input);
  const hashFilePath = resolvePath(currentDir, options.hash);

  await access(inputPath);
  await access(hashFilePath);

  const actualHash = await calculateFileHash(inputPath, algorithm);
  const expectedHash = await readFile(hashFilePath, 'utf8');

  const normalizedActual = actualHash.trim().toLowerCase();
  const normalizedExpected = expectedHash.trim().toLowerCase();

  console.log(normalizedActual === normalizedExpected ? 'OK' : 'MISMATCH');
}