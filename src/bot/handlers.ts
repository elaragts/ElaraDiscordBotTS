import {AutocompleteInteraction, ChatInputCommandInteraction, Collection, Events, MessageFlags} from "discord.js";
import {Command, ExtendedClient} from "../models/discord";
import {getExtendedClient} from "../utils/client";
import path from "node:path";
import fs from "node:fs";
import logger from "../utils/logger";
import {safeGetSubcommand} from "../utils/discord";

export function registerHandlers(client: ExtendedClient) {

    client.once(Events.ClientReady, readyClient => {
        logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
        // backup.backupAndUpload(client)
        // setInterval(() => {
        //     backup.backupAndUpload(client);
        // }, 1000 * 60 * 60);
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
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts"));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command: Command = require(filePath);
            if ("data" in command && "execute" in command) {
                client.commands.set(command.data.name, command);
            } else {
                logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}


async function handleChatInputCommand(interaction: ChatInputCommandInteraction){
    const client = getExtendedClient(interaction.client);
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found`);
        return;
    }
    const subcommand = safeGetSubcommand(interaction);
    logger.info(`[COMMAND] /${interaction.commandName}${subcommand ? ` ${subcommand}` : ''} | by: ${interaction.user.id} (${interaction.user.username})`);

    try {
        await command.execute(interaction);
    } catch (err) {
        logger.error({err: err}, `There was an error while executing ${interaction.commandName}`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.reply({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

async function handleAutocomplete(interaction: AutocompleteInteraction){
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