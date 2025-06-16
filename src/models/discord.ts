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
    public playerFavouriteSongs: Map<string, string> = new Map();
}

