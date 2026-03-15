import { createInterface } from 'node:readline';

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> "
});
rl.prompt();
rl.on("line", (input) => {
    rl.prompt();
});