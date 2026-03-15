import path from 'node:path';

export function resolvePath(currentDir, targetPath) {
    return path.isAbsolute(targetPath)
        ? path.normalize(targetPath)
        : path.resolve(currentDir, targetPath);
}