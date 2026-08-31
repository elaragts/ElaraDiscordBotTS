import {InteractionContextType, SlashCommandBuilder} from 'discord.js';
import type {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';
import {execute as executeList} from './list.js';
import {execute as executeCreate} from './create.js';
import {execute as executeRename} from './rename.js';
import {execute as executeResetSecret} from './resetSecret.js';
import {autocompleteChassis} from './shared.js';

const data = new SlashCommandBuilder()
    .setName('chassis')
    .setDescription('Manage your chassis')
    .setContexts([InteractionContextType.Guild])
    .addSubcommand(subcommand => subcommand.setName('list').setDescription('List your chassis'))
    .addSubcommand(subcommand => subcommand
        .setName('create')
        .setDescription('Create a chassis')
        .addStringOption(option => option.setName('nickname').setDescription('Optional nickname').setMaxLength(32)))
    .addSubcommand(subcommand => subcommand
        .setName('rename')
        .setDescription('Set or remove a chassis nickname')
        .addStringOption(option => option.setName('chassis').setDescription('Chassis to rename').setRequired(true).setAutocomplete(true))
        .addStringOption(option => option.setName('nickname').setDescription('Omit to remove the nickname').setMaxLength(32)))
    .addSubcommand(subcommand => subcommand
        .setName('reset-secret')
        .setDescription('Replace a chassis secret')
        .addStringOption(option => option.setName('chassis').setDescription('Chassis whose secret should be reset').setRequired(true).setAutocomplete(true)));

async function execute(interaction: ChatInputCommandInteractionExtended): Promise<void> {
    switch (interaction.options.getSubcommand()) {
        case 'list': return await executeList(interaction);
        case 'create': return await executeCreate(interaction);
        case 'rename': return await executeRename(interaction);
        case 'reset-secret': return await executeResetSecret(interaction);
    }
}

export const command: Command = {data, execute, autocomplete: autocompleteChassis, global: true};
