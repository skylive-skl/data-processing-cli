import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { resolvePath } from '../utils/pathResolver.js';
import {
	// hasOnlyAllowedOptions,
	// requireStringOption,
} from '../utils/argParser.js';
import { access } from 'node:fs/promises';

export async function runCount(currentDir, options) {
	// if (!hasOnlyAllowedOptions(options, ['input'])) {
	// 	throw new Error('Invalid input');
	// }

	// if (!requireStringOption(options, 'input')) {
	// 	throw new Error('Invalid input');
	// }

	const inputPath = resolvePath(currentDir, options.input);

	await access(inputPath);

	let lines = 0;
	let words = 0;
	let characters = 0;

	let leftover = '';
	let hasAnyData = false;

	const counter = new Writable({
		write(chunk, encoding, callback) {
			try {
				const chunkText = chunk.toString('utf8');
				const text = leftover + chunkText;

				hasAnyData = true;
				characters += chunkText.length;

				for (const char of chunkText) {
					if (char === '\n') {
						lines += 1;
					}
				}

				const parts = text.split(/\s+/);
				leftover = parts.pop() ?? '';

				for (const part of parts) {
					if (part.length > 0) {
						words += 1;
					}
				}

				callback();
			} catch (error) {
				callback(error);
			}
		},

		final(callback) {
			try {
				if (leftover.trim().length > 0) {
					words += 1;
				}

				if (hasAnyData && lines === 0) {
					lines = 1;
				}

				callback();
			} catch (error) {
				callback(error);
			}
		},
	});

	await pipeline(
		createReadStream(inputPath),
		counter,
	);

	console.log(`Lines: ${lines}`);
	console.log(`Words: ${words}`);
	console.log(`Characters: ${characters}`);
}