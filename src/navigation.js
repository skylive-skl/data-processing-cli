import { resolvePath } from "./utils/pathResolver.js";
import { readdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function goUp(currentDir) {
    const parentDir = dirname(currentDir);

    if (parentDir === currentDir) {
        return currentDir;
    }

    return parentDir;
}

export async function changeDirectory(currentDir, targetPath) {
    const resolvedPath = resolvePath(currentDir, targetPath);
    const stats = await stat(resolvedPath);
    if (!stats.isDirectory()) {
        throw new Error('Not a directory');
    }

    return resolvedPath;
}

export async function listDirectory(currentDir) {
    const dirents = await readdir(currentDir, { withFileTypes: true });

    const items = dirents.map((dirent) => ({
        name: dirent.name,
        type: dirent.isDirectory() ? 'folder' : 'file',
    }));

    items.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
    });

    for (const item of items) {
        console.log(`${item.name.padEnd(30)} [${item.type}]`);
    }
}
