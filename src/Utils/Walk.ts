export function walk(dir: string, callback: (filePath: string, isDir: boolean) => void): string[] {
    callback(dir, true);
    const files: string[] = [];
    for (const entry of Deno.readDirSync(dir)) {
        const fullPath = `${dir}/${entry.name}`;
        if (entry.isDirectory) {
            walk(fullPath, callback);
        } else if (entry.isFile) {
            callback(fullPath, false);
        }
    }
    return files;
}
