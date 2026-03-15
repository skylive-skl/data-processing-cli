import { createReadStream } from 'node:fs';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parentPort, workerData } from 'node:worker_threads';

const { filePath, start, end } = workerData;

async function run() {
  const stats = {
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

  let leftover = '';

  const parser = new Writable({
    write(chunk, encoding, callback) {
      try {
        const text = leftover + chunk;
        const lines = text.split('\n');
        leftover = lines.pop() ?? '';

        for (const rawLine of lines) {
          processLine(rawLine, stats);
        }

        callback();
      } catch (error) {
        callback(error);
      }
    },

    final(callback) {
      try {
        if (leftover.length > 0) {
          processLine(leftover, stats);
        }

        callback();
      } catch (error) {
        callback(error);
      }
    },
  });

  await pipeline(
    createReadStream(filePath, { start, end, encoding: 'utf8' }),
    parser,
  );

  parentPort.postMessage(stats);
}

function processLine(line, stats) {
  const trimmed = line.trim();

  if (!trimmed) {
    return;
  }

  const parts = trimmed.split(' ');

  if (parts.length < 7) {
    return;
  }

  const level = parts[1];
  const statusCode = Number(parts[3]);
  const responseTime = Number(parts[4]);
  const path = parts.slice(6).join(' ');

  stats.total += 1;

  stats.levels[level] = (stats.levels[level] ?? 0) + 1;

  if (statusCode >= 200 && statusCode < 300) {
    stats.status['2xx'] += 1;
  } else if (statusCode >= 300 && statusCode < 400) {
    stats.status['3xx'] += 1;
  } else if (statusCode >= 400 && statusCode < 500) {
    stats.status['4xx'] += 1;
  } else if (statusCode >= 500 && statusCode < 600) {
    stats.status['5xx'] += 1;
  }

  stats.pathCounts[path] = (stats.pathCounts[path] ?? 0) + 1;

  if (!Number.isNaN(responseTime)) {
    stats.responseTimeSum += responseTime;
    stats.responseTimeCount += 1;
  }
}

run()