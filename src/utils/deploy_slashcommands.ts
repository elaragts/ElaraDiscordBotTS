import {REST, Routes} from 'discord.js';
import config from '#config' with {type: 'json'};
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import {discoverCommands} from '@utils/commandDiscovery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.join(__dirname, '..', '..', '.env')});

if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
    throw new Error('BOT_TOKEN & CLIENT_ID environment variables required');
}

const discovered = await discoverCommands(path.join(__dirname, '..', 'commands'));
const commandNames = new Set<string>();
for (const {command, filePath} of discovered) {
    if (commandNames.has(command.data.name)) {
        throw new Error(`Duplicate command name ${command.data.name} discovered at ${filePath}`);
    }
    commandNames.add(command.data.name);
}

const globalCommands = discovered
    .filter(({command}) => command.global)
    .map(({command}) => command.data.toJSON());
const guildCommands = discovered
    .filter(({command}) => !command.global)
    .map(({command}) => command.data.toJSON());

const rest = new REST().setToken(process.env.BOT_TOKEN);

try {
    console.log(`Refreshing ${globalCommands.length} global and ${guildCommands.length} guild application commands.`);

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {body: globalCommands});
    await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, config.guildId),
        {body: guildCommands}
    );

    console.log(`Reloaded ${globalCommands.length} global and ${guildCommands.length} guild application commands.`);
} catch (error) {
    console.error(error);
}
