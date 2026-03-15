import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Writable, Readable } from 'node:stream';
import { resolvePath } from '../utils/pathResolver.js';
import {
  hasOnlyAllowedOptions,
  requireStringOption,
} from '../utils/argParser.js';
import { InputError } from '../errors.js';
import { access } from 'node:fs/promises';

export async function runJsonToCsv(currentDir, options) {
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

  const jsonText = await readFileAsText(inputPath);

  let data;

  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (!Array.isArray(data)) {
    throw new Error('JSON root must be an array');
  }

  if (data.some((item) => item === null || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('JSON array must contain objects');
  }

  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  const csvLines = [];

  if (headers.length > 0) {
    csvLines.push(headers.map(escapeCsvValue).join(','));

    for (const row of data) {
      const values = headers.map((header) => escapeCsvValue(row[header] ?? ''));
      csvLines.push(values.join(','));
    }
  }

  const csvContent = csvLines.join('\n') + (csvLines.length > 0 ? '\n' : '');

  await pipeline(
    Readable.from([csvContent]),
    createWriteStream(outputPath),
  );
}

async function readFileAsText(filePath) {
  let result = '';

  const collector = new Writable({
    write(chunk, encoding, callback) {
      try {
        result += chunk.toString('utf8');
        callback();
      } catch (error) {
        callback(error);
      }
    },
  });

  await pipeline(
    createReadStream(filePath),
    collector,
  );

  return result;
}

function escapeCsvValue(value) {
  const stringValue = String(value);

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}