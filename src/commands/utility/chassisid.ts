import {InteractionContextType, MessageFlags, SlashCommandBuilder} from 'discord.js';
import type {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';
import {EMBED_COLOUR} from '@constants/discord.js';

const data = new SlashCommandBuilder()
    .setName('chassisid')
    .setDescription('Legacy ChassisID commands')
    .setContexts([InteractionContextType.Guild])
    .addSubcommand(subcommand => subcommand.setName('request').setDescription('Request a ChassisID'))
    .addSubcommand(subcommand => subcommand.setName('view').setDescription('View your ChassisID'));

async function execute(interaction: ChatInputCommandInteractionExtended) {
    await interaction.reply({
        embeds: [{
            description: 'This command has been replaced. Please use `/chassis` instead.',
            color: EMBED_COLOUR,
            author: {name: 'ChassisID'}
        }],
        flags: MessageFlags.Ephemeral
    });
}

export const command: Command = {data, execute, global: true};
