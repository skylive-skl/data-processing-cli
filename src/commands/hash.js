import { access, writeFile } from 'node:fs/promises';
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

export async function runHash(currentDir, options) {
  if (!hasOnlyAllowedOptions(options, ['input', 'algorithm', 'save'])) {
    throw new InputError();
  }

  if (!requireStringOption(options, 'input')) {
    throw new InputError();
  }

  if (options.save !== undefined && options.save !== true) {
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
  await access(inputPath);

  const digest = await calculateFileHash(inputPath, algorithm);

  console.log(`${algorithm}: ${digest}`);

  if (options.save === true) {
    const hashFilePath = `${inputPath}.${algorithm}`;
    await writeFile(hashFilePath, digest);
  }
}