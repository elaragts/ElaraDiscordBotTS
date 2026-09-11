import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import type {Command} from '@models/discord.js';

export type DiscoveredCommand = {
    command: Command;
    filePath: string;
};

async function listCommandFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, {withFileTypes: true});
    const files = await Promise.all(entries.map(async entry => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return await listCommandFiles(entryPath);
        if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) && !entry.name.endsWith('.d.ts')) {
            return [entryPath];
        }
        return [];
    }));
    return files.flat();
}

export async function discoverCommands(commandsRoot: string): Promise<DiscoveredCommand[]> {
    const discovered: DiscoveredCommand[] = [];
    const files = await listCommandFiles(commandsRoot);
    const indexDirectories = new Set(files
        .filter(filePath => path.parse(filePath).name === 'index')
        .map(filePath => path.dirname(filePath)));
    const commandFiles = files.filter(filePath => {
        if (path.parse(filePath).name === 'index') return true;
        const sameNamedDirectory = filePath.slice(0, -path.extname(filePath).length);
        return !indexDirectories.has(sameNamedDirectory);
    });

    for (const filePath of commandFiles) {
        const module = await import(pathToFileURL(filePath).href);
        if (module.command) discovered.push({command: module.command as Command, filePath});
    }
    return discovered;
}
