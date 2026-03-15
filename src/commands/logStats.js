import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolvePath } from '../utils/pathResolver.js';
import {
  hasOnlyAllowedOptions,
  requireStringOption,
} from '../utils/argParser.js';
import { InputError } from '../errors.js';

export async function runLogStats(currentDir, options) {
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

  await fs.promises.access(inputPath);

  const fileStat = await fs.promises.stat(inputPath);

  if (fileStat.size === 0) {
    const emptyResult = {
      total: 0,
      levels: {},
      status: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
      topPaths: [],
      avgResponseTimeMs: 0,
    };

    await writeJsonToFile(outputPath, emptyResult);
    return;
  }

  const workerCount = Math.max(1, os.cpus().length);
  const chunks = await createLineAlignedChunks(inputPath, fileStat.size, workerCount);

  const partialResults = await Promise.all(
    chunks.map((chunk) => runWorker(inputPath, chunk.start, chunk.end)),
  );

  const finalStats = mergeStats(partialResults);

  await writeJsonToFile(outputPath, finalStats);
}

async function createLineAlignedChunks(filePath, fileSize, workerCount) {
  const approxChunkSize = Math.ceil(fileSize / workerCount);
  const handle = await fs.promises.open(filePath, 'r');

  try {
    const chunks = [];
    let start = 0;

    for (let index = 0; index < workerCount && start < fileSize; index += 1) {
      let end;

      if (index === workerCount - 1) {
        end = fileSize - 1;
      } else {
        const tentativeEnd = Math.min(start + approxChunkSize - 1, fileSize - 1);
        end = await moveEndToLineBoundary(handle, tentativeEnd, fileSize);
      }

      if (end < start) {
        end = fileSize - 1;
      }

      chunks.push({ start, end });
      start = end + 1;
    }

    return chunks.filter((chunk) => chunk.start <= chunk.end);
  } finally {
    await handle.close();
  }
}

async function moveEndToLineBoundary(handle, tentativeEnd, fileSize) {
  let position = tentativeEnd;

  if (position >= fileSize - 1) {
    return fileSize - 1;
  }

  const buffer = Buffer.alloc(1);

  while (position < fileSize - 1) {
    const { bytesRead } = await handle.read(buffer, 0, 1, position);

    if (bytesRead === 0) {
      return fileSize - 1;
    }

    if (buffer[0] === 0x0a) {
      return position;
    }

    position += 1;
  }

  return fileSize - 1;
}

function runWorker(filePath, start, end) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/logWorker.js', import.meta.url),
      {
        workerData: { filePath, start, end },
      },
    );

    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

function mergeStats(partials) {
  const merged = {
    total: 0,
    levels: {},
    status: {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    },
    pathCounts: {},
    responseTimeSum: 0,
    responseTimeCount: 0,
  };

  for (const part of partials) {
    merged.total += part.total;
    merged.responseTimeSum += part.responseTimeSum;
    merged.responseTimeCount += part.responseTimeCount;

    for (const [level, count] of Object.entries(part.levels)) {
      merged.levels[level] = (merged.levels[level] ?? 0) + count;
    }

    for (const [statusGroup, count] of Object.entries(part.status)) {
      merged.status[statusGroup] = (merged.status[statusGroup] ?? 0) + count;
    }

    for (const [routePath, count] of Object.entries(part.pathCounts)) {
      merged.pathCounts[routePath] = (merged.pathCounts[routePath] ?? 0) + count;
    }
  }

  const topPaths = Object.entries(merged.pathCounts)
    .map(([routePath, count]) => ({ path: routePath, count }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.path.localeCompare(b.path);
    })
    .slice(0, 10);

  return {
    total: merged.total,
    levels: merged.levels,
    status: merged.status,
    topPaths,
    avgResponseTimeMs:
      merged.responseTimeCount === 0
        ? 0
        : Number((merged.responseTimeSum / merged.responseTimeCount).toFixed(2)),
  };
}

async function writeJsonToFile(filePath, data) {
  const content = `${JSON.stringify(data, null, 2)}\n`;

  await pipeline(
    Readable.from([content]),
    fs.createWriteStream(filePath),
  );
}