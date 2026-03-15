import { createReadStream, createWriteStream } from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolvePath } from '../utils/pathResolver.js';
import {
  hasOnlyAllowedOptions,
  requireStringOption,
} from '../utils/argParser.js';
import { InputError } from '../errors.js';
import { access } from 'node:fs/promises';

export async function runCsvToJson(currentDir, options) {
  if (!hasOnlyAllowedOptions(options, ['input', 'output'])) {
    throw new InputError();
  }

  if (!requireStringOption(options, 'input')) {
    throw new InputError();
  }

  if (!requireStringOption(options, 'output')) {
    throw new InputError();
  }

  const inputPath = resolvePath(currentDir, options.input);
  const outputPath = resolvePath(currentDir, options.output);

  await access(inputPath);

  await pipeline(
    createReadStream(inputPath),
    createCsvToJsonTransform(),
    createWriteStream(outputPath),
  );
}

function createCsvToJsonTransform() {
  let leftover = '';
  let headers = null;
  let isFirstObject = true;

  function processLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return '';

    if (!headers) {
      headers = parseCsvLine(trimmed);
      if (headers.length === 0) throw new Error('Invalid CSV header');
      return '';
    }

    const values = parseCsvLine(trimmed);
    const entry = Object.fromEntries(
      headers.map((key, i) => [key, values[i] ?? '']),
    );

    const prefix = isFirstObject ? '' : ',\n';
    isFirstObject = false;

    return `${prefix}  ${JSON.stringify(entry, null, 2).replaceAll('\n', '\n  ')}`;
  }

  return new Transform({
    transform(chunk, _encoding, callback) {
      try {
        const data = leftover + chunk.toString('utf8');
        const lines = data.split(/\r?\n/);
        leftover = lines.pop() ?? '';

        const needsArrayStart = isFirstObject;
        const result = lines.map(processLine).join('');
        callback(null, (needsArrayStart ? '[\n' : '') + result);
      } catch (error) {
        callback(error);
      }
    },

    flush(callback) {
      try {
        const needsArrayStart = isFirstObject;
        const tail = processLine(leftover);
        callback(null, `${needsArrayStart ? '[\n' : ''}${tail}\n]\n`);
      } catch (error) {
        callback(error);
      }
    },
  });
}

function parseCsvLine(line) {
  return line.split(',').map((value) => value.trim());
}