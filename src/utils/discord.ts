import {AutocompleteInteraction, ChatInputCommandInteraction, MessageFlags} from "discord.js";
import {doesUniqueIdExist, isValidLang, searchSong, searchSongSync} from "./datatable";
import logger from "./logger";
import {songResultSeparator} from "../constants/datatable";
import {client} from "../bot/client";
import {guildId, adminRoleId, serverBoostRoleId} from "../../config.json"

export async function replyWithErrorMessage(interaction: ChatInputCommandInteraction, author: string, reason: string): Promise<void> {
    const errorEmbed = {
        title: 'Error',
        description: reason,
        color: 13369344,
        author: {
            name: author
        }
    };
    await interaction.reply({embeds: [errorEmbed], flags: MessageFlags.Ephemeral});
}

export async function editReplyWithErrorMessage(interaction: ChatInputCommandInteraction, author: string, reason: string): Promise<void> {
    const errorEmbed = {
        title: 'Error',
        description: reason,
        color: 13369344,
        author: {
            name: author
        }
    };
    await interaction.editReply({embeds: [errorEmbed]});
}

export function safeGetSubcommand(interaction: ChatInputCommandInteraction): string {
    try {
        return interaction.options.getSubcommand();
    } catch {
        return '';
    }
}

export async function returnSongAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused(); // Get query

    // Timeout promise
    const timeoutPromise: Promise<Array<[string, string]>> = new Promise((resolve) => setTimeout(() => resolve([]), 2500)); // 2.5 seconds

    // Autocomplete promise
    const autocompletePromise = searchSong(focusedValue);

    // Race the autocomplete and timeout promises
    const filteredPromise = Promise.race([autocompletePromise, timeoutPromise]);

    filteredPromise.then(filtered => {
        // Send result back to Discord
        interaction.respond(
            filtered.map(choice => ({name: choice[0], value: choice[1]}))
        ).catch(err => {
            logger.error({err: err}, 'Error responding to interaction');
        });
    }).catch(err => {
        logger.error({err: err}, 'Error in autocomplete or timeout');
    });
}

export async function validateSongInput(interaction: ChatInputCommandInteraction, songInput: string, commandName: string): Promise<[number, number] | undefined> {
    let uniqueId, lang: number;
    if (songInput.includes(songResultSeparator)) { //search with autocomplete
        const [uniqueIdStr, langStr] = songInput.split(songResultSeparator);
        try {
            lang = parseInt(langStr);
        } catch (err) {
            await replyWithErrorMessage(interaction, commandName, 'Bad input: invalid lang');
            return undefined;
        }
        if (!isValidLang(lang)) {
            await replyWithErrorMessage(interaction, commandName, 'Bad input: invalid lang');
            return undefined;
        }
        try {
            uniqueId = parseInt(uniqueIdStr)
        } catch (err) {
            await replyWithErrorMessage(interaction, commandName, 'Bad input: invalid uniqueID');
            return undefined;
        }

        if (!doesUniqueIdExist(uniqueId)) {
            await replyWithErrorMessage(interaction, commandName, 'Bad input: uniqueID not found');
            return undefined;
        }
    } else { //search without autocomplete
        let searchResult = searchSongSync(songInput);
        if (searchResult.length === 1) {
            await editReplyWithErrorMessage(interaction, commandName, `Song ${songInput} not found!`);
            return undefined;
        }
        const [_, result] = searchResult[0];
        [uniqueId, lang] = (await validateSongInput(interaction, songInput, result))!; //this is stupid but works
    }
    return [uniqueId, lang]
}

export function isUserBoostingServer(userId: string): boolean {
    const guild = client.guilds.cache.get(guildId)!;
    const member = guild.members.cache.get(userId);
    if (member) {
        return member.roles.cache.has(serverBoostRoleId) || member.roles.cache.has(adminRoleId);
    }
    return false;
}