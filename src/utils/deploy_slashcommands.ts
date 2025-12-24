import {REST, Routes} from 'discord.js';
import config from '#config' with {type: 'json'};
import {command as adminCommand} from '../commands/utility/admin/index.js';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import dotenv from 'dotenv';
import {Command} from '@models/discord.js';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({path: path.join(__dirname, '..', '..', '.env')});

const commands = [];

// Read command folders
const foldersPath = path.join(__dirname, '..', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);

        // Skip if it's a directory
        if (fs.statSync(filePath).isDirectory()) {
            continue;
        }

        // Dynamically import ESM module
        const module = await import(pathToFileURL(filePath).href);
        const command: Command = module.command;

        if (command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
    throw new Error('BOT_TOKEN & CLIENT_ID environment variables required');
}

// Construct REST client
const rest = new REST().setToken(process.env.BOT_TOKEN);

try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        {body: commands}
    );

    await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, config.guildId),
        {
            body: config.deployment === 'production' ? [adminCommand.data] : commands
        }
    );

    console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
} catch (error) {
    console.error(error);
}
