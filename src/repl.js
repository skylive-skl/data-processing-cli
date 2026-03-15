import { createInterface } from 'node:readline';
import os from 'node:os';
import { changeDirectory, goUp, listDirectory } from './navigation.js';

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
        cd: async (targetPath) => {
            currentDir = await changeDirectory(currentDir, targetPath);
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
    }

    rl.prompt();
    printCurrentDir(currentDir);

    rl.on('line', async (line) => {
        try {
            const commandLine = line.trim();
            const [command, ...args] = commandLine.split(' ');
            if (commands[command]) {
                await commands[command](...args);
            } else {
                console.log('Unknown command');
            }
            if (command !== 'exit') {
                rl.prompt();
            }
        } catch (error) {
            console.error('Operation failed');
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
