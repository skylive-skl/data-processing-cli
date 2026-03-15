import { createInterface } from 'node:readline';
import os from 'node:os';
import { changeDirectory, goUp, listDirectory } from './navigation.js';
import { parseCommandLine } from './utils/argParser.js';
import { runCount } from './commands/count.js';
import { InputError } from './errors.js';
import { runHash } from './commands/hash.js';
import { runHashCompare } from './commands/hashCompare.js';
import { runCsvToJson } from './commands/csvToJson.js';

const startRepl = async () => {
	let currentDir = os.homedir();
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '> '
	});

	const commands = {
		uptime: () => console.log(`Uptime: ${process.uptime().toFixed(2)}s`),
		cwd: () => console.log(currentDir),
		date: () => console.log(new Date().toISOString()),
		exit: () => exitProgram(rl),
		cd: async (options, args) => {
			currentDir = await changeDirectory(currentDir, args[0]);
			printCurrentDir(currentDir);
		},
		up: async (options, args) => {
			currentDir = await goUp(currentDir);
			printCurrentDir(currentDir);
		},
		ls: async (options, args) => {
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
	}

	rl.prompt();
	printCurrentDir(currentDir);

	rl.on('line', async (line) => {
		try {
			const commandLine = line.trim();

			const { command, args, options } = parseCommandLine(commandLine);
			console.log(command, args, options)
			if (commands[command]) {
				await commands[command](options, args);
			} else {
				console.log('Unknown command');
			}
			if (command !== 'exit') {
				rl.prompt();
			}
		} catch (error) {
			if (error instanceof InputError) {
				console.error(error.message);
			} else {
				console.error('Operation failed', error.message);
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
