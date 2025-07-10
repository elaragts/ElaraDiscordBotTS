import {
    Client,
    Collection,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    AutocompleteInteraction
} from "discord.js";

export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export class ExtendedClient extends Client {
    public commands: Collection<string, Command> = new Collection();
    public ongoingBattles: Set<string> = new Set();
    public playerFavouriteSongs: Map<number, number[]> = new Map();
}

export type SongValidationResult = {
    uniqueId: number;
    lang: number;
}

export type SearchSongResult = {
    title: string;
    songOutput: string;
}