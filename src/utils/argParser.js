export function parseCommandLine(input) {
    const tokens = tokenize(input.trim());

    if (tokens.length === 0) {
        return { command: '', args: [], options: {} };
    }

    const command = tokens[0];
    const args = [];
    const options = {};

    let index = 1;

    while (index < tokens.length) {
        const token = tokens[index];

        if (token.startsWith('--')) {
            const key = token.slice(2);

            if (!key) {
                throw new Error('Invalid option');
            }

            const nextToken = tokens[index + 1];

            if (!nextToken || nextToken.startsWith('--')) {
                options[key] = true;
                index += 1;
            } else {
                options[key] = nextToken;
                index += 2;
            }
        } else {
            args.push(token);
            index += 1;
        }
    }

    return { command, args, options };
}

function tokenize(input) {
    const tokens = [];
    let current = '';
    let quote = null;

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];

        if ((char === '"' || char === "'")) {
            if (quote === null) {
                quote = char;
                continue;
            }

            if (quote === char) {
                quote = null;
                continue;
            }
        }

        if (char === ' ' && quote === null) {
            if (current) {
                tokens.push(current);
                current = '';
            }
            continue;
        }

        current += char;
    }

    if (quote !== null) {
        throw new Error('Unclosed quote');
    }

    if (current) {
        tokens.push(current);
    }

    return tokens;
}