import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Collection,
    Events,
    InteractionContextType,
    MessageFlags
} from 'discord.js';
import {Command, ClientExtended} from '@models/discord.js';
import path from 'node:path';
import { readdir } from "fs/promises";
import logger from '@utils/logger.js';
import {
    getExtendedClient,
    getExtendedChatInputCommandInteraction,
    safeGetSubcommand,
    replyWithErrorMessage
} from '@utils/discord.js';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerHandlers(client: ClientExtended) {
    client.once(Events.ClientReady, readyClient => {
        logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
    });

    client.on(Events.InteractionCreate, async interaction => {
        try {
            if (interaction.isChatInputCommand()) await handleChatInputCommand(interaction);
            if (interaction.isAutocomplete()) await handleAutocomplete(interaction);
        } catch (err) {
            logger.error(err);
        }
    });

    client.commands = new Collection();
    const foldersPath = path.join(__dirname, "..", "commands");
    const commandFolders = await readdir(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = (await readdir(commandsPath)).filter(file => file.endsWith(".ts") || file.endsWith(".js"));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const module = await import(filePath);
            const command: Command = module.command;

            if (command) {
                client.commands.set(command.data.name, command);
            } else {
                logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    const adminModule = await import("../commands/utility/admin/index.js");
    client.commands.set("admin", adminModule.command);
}


async function handleChatInputCommand(baseInteraction: ChatInputCommandInteraction) {
    const interaction = getExtendedChatInputCommandInteraction(baseInteraction);
    const client = getExtendedClient(interaction.client);
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found`);
        return;
    }

    //interaction.guild is null if bot is not installed in the server used
    if (interaction.context === InteractionContextType.Guild && interaction.guild == null) {
        await replyWithErrorMessage(interaction, interaction.commandName, 'EGTS Bot is not installed in this server!')
        return
    }
    const subcommand = safeGetSubcommand(interaction);
    const fullCommandName = `${interaction.commandName}${subcommand ? ` ${subcommand}` : ''}`;
    logger.info(`[COMMAND] /${fullCommandName} | by: ${interaction.user.id} (${interaction.user.username})`);

    try {
        await command.execute(interaction);
    } catch (err) {
        logger.error({err: err}, `There was an error while executing ${fullCommandName}`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

async function handleAutocomplete(interaction: AutocompleteInteraction) {
    const client = getExtendedClient(interaction.client);
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found`);
        return;
    }
    if (command.autocomplete === undefined) {
        logger.error(`Command ${interaction.commandName} does not have an autocomplete handler`);
        return;
    }
    try {
        await command.autocomplete(interaction);
    } catch (err) {
        logger.error({err: err}, `There was an error while executing ${interaction.commandName} autocomplete handler`);
    }
}