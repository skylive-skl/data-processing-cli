import { createInterface } from 'node:readline';
import os from 'node:os';
import { changeDirectory, goUp, listDirectory } from './navigation.js';
import { parseCommandLine } from './utils/argParser.js';
import { runCount } from './commands/count.js';
import { InputError } from './errors.js';
import { runHash } from './commands/hash.js';
import { runHashCompare } from './commands/hashCompare.js';
import { runCsvToJson } from './commands/csvToJson.js';
import { runJsonToCsv } from './commands/jsonToCsv.js';
import { runEncrypt } from './commands/encrypt.js';
import { runDecrypt } from './commands/decrypt.js';
import { runLogStats } from './commands/logStats.js';

const startRepl = async () => {
	let currentDir = os.homedir();
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '> '
	});

	const commands = {
		".exit": () => exitProgram(rl),
		cd: async (options, args) => {
			currentDir = await changeDirectory(currentDir, args[0]);
			printCurrentDir(currentDir);
		},
		up: async () => {
			currentDir = await goUp(currentDir);
			printCurrentDir(currentDir);
		},
		ls: async () => {
			await listDirectory(currentDir);
			printCurrentDir(currentDir);
		},
		count: async (options, args) => {
			await runCount(currentDir, options, args);
			printCurrentDir(currentDir);
		},
		hash: async (options, args) => {
			await runHash(currentDir, options, args);
			printCurrentDir(currentDir);
		},
		"hash-compare": async (options, args) => {
			await runHashCompare(currentDir, options, args);
			printCurrentDir(currentDir);
		},
		"csv-to-json": async (options, args) => {
			await runCsvToJson(currentDir, options, args);
			printCurrentDir(currentDir);
		},
		"json-to-csv": async (options, args) => {
			await runJsonToCsv(currentDir, options, args);
			printCurrentDir(currentDir);
		},
		encrypt: async (options, args) => {
			await runEncrypt(currentDir, options, args);
			printCurrentDir(currentDir);
		},
		decrypt: async (options, args) => {
			await runDecrypt(currentDir, options, args);
			printCurrentDir(currentDir);
		},
		"log-stats": async (options, args) => {
			await runLogStats(currentDir, options, args);
			printCurrentDir(currentDir);
		},
	}

	rl.prompt();
	printCurrentDir(currentDir);

	rl.on('line', async (line) => {
		try {
			const commandLine = line.trim();

			const { command, args, options } = parseCommandLine(commandLine);
			if (commands[command]) {
				await commands[command](options, args);
			} else {
				console.log('Unknown command');
			}
			if (command !== '.exit') {
				rl.prompt();
			}
		} catch (error) {
			if (error instanceof InputError) {
				console.error(error.message);
			} else {
				console.error('Operation failed', error?.message ?? error);
			}
			rl.prompt();
		}
	});

	rl.on('SIGINT', () => {
		exitProgram(rl);
	});
};
function printCurrentDir(currentDir) {
	console.log(`You are currently in ${currentDir}`);
}

function exitProgram(rl) {
	console.log('Thank you for using Data Processing CLI!');
	rl.close();
	process.exit(0);
}

export default startRepl;
