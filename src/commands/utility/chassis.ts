﻿import {SlashCommandBuilder, MessageFlags} from 'discord.js';
import config from '#config' with {type: 'json'};
import {generateAndRegisterChassis, getChassisIdFromDiscordId} from '@database/queries/chassis.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {EMBED_COLOUR} from '@constants/discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';

const COMMAND_NAME = 'ChassisID';

const data = new SlashCommandBuilder()
    .setName('chassisid')
    .setDescription('ChassisID related commands')
    .addSubcommand(
        subcommand =>
            subcommand
                .setName('request')
                .setDescription('Request a ChassisID')
    )
    .addSubcommand(
        subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your ChassisID')
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    const user = interaction.user;
    const existingChassisId = await getChassisIdFromDiscordId(user.id);
    if (interaction.options.getSubcommand() === 'request') {
        if (existingChassisId !== undefined) {
            return await replyWithErrorMessage(interaction, COMMAND_NAME, `You already have a chassisId: \`${existingChassisId}\``);
        }
        if (interaction.guildId !== config.guildId || interaction.channelId !== config.botChannelId) {
            const link = `https://discord.com/channels/${config.guildId}/${config.botChannelId}`;
            await replyWithErrorMessage(interaction, COMMAND_NAME, `Command must be used in ${link}`);
            return;
        }
        const newChassisId = await generateAndRegisterChassis(user.id);
        await interaction.reply({
            embeds: [{
                title: 'Successfully registered ChassisID',
                color: EMBED_COLOUR,
                description: `Your ChassisID: \`${newChassisId}\`\n\nHint: Use \`/chassisid view\` to view your ChassisID again`,
                author: {
                    name: COMMAND_NAME
                }
            }], flags: [MessageFlags.Ephemeral],
        });
    } else { //view
        if (existingChassisId === undefined) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, 'You do not have a ChassisID');
            return;
        }
        await interaction.reply({
            embeds: [{
                color: EMBED_COLOUR,
                description: `Your ChassisID is: \`${existingChassisId}\``,
                author: {
                    name: COMMAND_NAME
                }
            }], flags: MessageFlags.Ephemeral
        });
    }
}

export const command: Command = {
    data,
    execute
};