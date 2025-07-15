import {
    Client,
    Collection,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    AutocompleteInteraction, MessageFlags
} from 'discord.js';
import {ERROR_COLOUR} from '@constants/discord.js';

export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export class ClientExtended extends Client {
    public commands: Collection<string, Command> = new Collection();
    public ongoingBattles: Set<string> = new Set();
    public playerFavouriteSongs: Map<number, number[]> = new Map();
}

export const chatInputCommandInteractionExtensions = {
    async replyWithError(this: ChatInputCommandInteraction, author: string, reason: string): Promise<void> {
        const errorEmbed = {
            title: 'Error',
            description: reason,
            color: ERROR_COLOUR,
            author: {
                name: author
            }
        };
        await this.reply({embeds: [errorEmbed], flags: MessageFlags.Ephemeral});
    }
};

export type ChatInputCommandInteractionExtended =
    ChatInputCommandInteraction
    & typeof chatInputCommandInteractionExtensions

export type SongValidationResult = {
    uniqueId: number;
    lang: number;
}

export type SearchSongResult = {
    title: string;
    songOutput: string;
}