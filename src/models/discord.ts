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
}

