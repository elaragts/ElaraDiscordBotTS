import {AutocompleteInteraction, ChatInputCommandInteraction, Client, MessageFlags} from "discord.js";
import {doesUniqueIdExist, isValidLang, searchSong, searchSongSync} from "./datatable";
import logger from "./logger";
import {songResultSeparator} from "../constants/datatable";
import {client} from "../bot/client";
import {guildId, adminRoleId, serverBoostRoleId} from "../../config.json"
import {
    ChatInputCommandInteractionExtended, chatInputCommandInteractionExtensions,
    ClientExtended,
    SearchSongResult,
    SongValidationResult
} from "../models/discord";
import {ERROR_COLOUR} from "../constants/discord";

export const getExtendedClient = (client: Client): ClientExtended => client as ClientExtended;

export function getExtendedChatInputCommandInteraction(interaction: ChatInputCommandInteraction): ChatInputCommandInteractionExtended {
    return Object.assign(interaction, chatInputCommandInteractionExtensions)
}

export async function replyWithErrorMessage(interaction: ChatInputCommandInteraction, author: string, reason: string): Promise<void> {
    const errorEmbed = {
        title: 'Error',
        description: reason,
        color: ERROR_COLOUR,
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
        color: ERROR_COLOUR,
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
    const timeoutPromise: Promise<SearchSongResult[]> = new Promise((resolve) => setTimeout(() => resolve([]), 2500)); // 2.5 seconds

    // Autocomplete promise
    const autocompletePromise = searchSong(focusedValue);

    // Race the autocomplete and timeout promises
    const filteredPromise = Promise.race([autocompletePromise, timeoutPromise]);

    filteredPromise.then(filtered => {
        // Send result back to Discord
        interaction.respond(
            filtered.map(choice => ({name: choice.title, value: choice.songOutput}))
        ).catch(err => {
            logger.error({err: err}, 'Error responding to interaction');
        });
    }).catch(err => {
        logger.error({err: err}, 'Error in autocomplete or timeout');
    });
}

export async function validateSongInput(interaction: ChatInputCommandInteraction, songInput: string, commandName: string): Promise<SongValidationResult | undefined> {
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
        return {uniqueId: uniqueId, lang: lang};
    } else { //search without autocomplete
        let searchResult = searchSongSync(songInput);
        if (searchResult.length === 0) {
            await editReplyWithErrorMessage(interaction, commandName, `Song ${songInput} not found!`);
            return undefined;
        }
        const resultOutput = searchResult[0].songOutput;
        //parse search result
        return await validateSongInput(interaction, resultOutput, commandName);
    }
}

export function isUserBoostingServer(userId: string): boolean {
    const guild = client.guilds.cache.get(guildId)!;
    const member = guild.members.cache.get(userId);
    if (member) {
        return member.roles.cache.has(serverBoostRoleId) || member.roles.cache.has(adminRoleId);
    }
    return false;
}