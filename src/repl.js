import { createInterface } from 'node:readline';
import os from 'node:os';

const startRepl = () => {
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
    }

    rl.prompt();
    printCurrentDir(currentDir);

    rl.on('line', (line) => {
        const command = line.trim();
        if (commands[command]) {
            commands[command]();
        } else {
            console.log('Unknown command');
        }
        if (command !== 'exit') {
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
