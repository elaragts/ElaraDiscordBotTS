import {SlashCommandBuilder, InteractionContextType} from 'discord.js';

import {replyWithErrorMessage} from '@utils/discord.js';
import config from "#config" with { type: "json" };
import {execute as chassisWhois} from './chassis/whois.js';
import {execute as chassisView} from './chassis/view.js';
import {execute as chassisEnable} from './chassis/enable.js';
import {execute as chassisDisable} from './chassis/disable.js';
import {execute as chassisDelete} from './chassis/delete.js';
import {execute as chassisList} from './chassis/list.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';

const data = new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands')
    .setDefaultMemberPermissions(0) //admin only
    .setContexts(InteractionContextType.Guild)
    .addSubcommandGroup(
        subcommandGroup =>
            subcommandGroup
                .setName('chassisid')
                .setDescription('ChassisID related commands')
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName('whois')
                            .setDescription('Get user from ChassisID')
                            .addNumberOption(option =>
                                option
                                    .setName('chassisid')
                                    .setDescription('User\'s ChassisID')
                                    .setRequired(true)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName('view')
                            .setDescription('View user\'s ChassisID')
                            .addUserOption(option =>
                                option
                                    .setName('user')
                                    .setDescription('Target user')
                                    .setRequired(true)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName('delete')
                            .setDescription('Deletes ChassisID/User\'s ChassisID')
                            .addUserOption(option =>
                                option
                                    .setName('user')
                                    .setDescription('Target user')
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName('chassisid')
                                    .setDescription('Target ChassisID')
                                    .setRequired(false)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName('enable')
                            .setDescription('Enables ChassisID/User\'s ChassisID')
                            .addUserOption(option =>
                                option
                                    .setName('user')
                                    .setDescription('Target user')
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName('chassisid')
                                    .setDescription('Target ChassisID')
                                    .setRequired(false)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName('disable')
                            .setDescription('Disables ChassisID/User\'s ChassisID')
                            .addUserOption(option =>
                                option
                                    .setName('user')
                                    .setDescription('Target user')
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName('chassisid')
                                    .setDescription('Target ChassisID')
                                    .setRequired(false)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName('list')
                            .setDescription('Lists baids that used ChassisID/User\'s ChassisID')
                            .addUserOption(option =>
                                option
                                    .setName('user')
                                    .setDescription('Target user')
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName('chassisid')
                                    .setDescription('Target ChassisID')
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName('baid')
                                    .setDescription('Target Baid')
                                    .setRequired(false)
                            )
                            .addIntegerOption(option =>
                                option.setName('page')
                                    .setDescription('Result Page')
                                    .setRequired(false)
                                    .setMinValue(1)
                            )
                )
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    if (!config.whitelistedAdmins.includes(interaction.user.id)) {
        await replyWithErrorMessage(interaction, 'Admin', 'You are not a whitelisted admin!');
        return;
    }
    switch (interaction.options.getSubcommandGroup()) {
        case 'chassisid': {
            switch (interaction.options.getSubcommand()) {
                case 'whois':
                    return await chassisWhois(interaction);
                case 'view':
                    return await chassisView(interaction);
                case 'delete':
                    return await chassisDelete(interaction);
                case 'enable':
                    return await chassisEnable(interaction);
                case 'disable':
                    return await chassisDisable(interaction);
                case 'list':
                    return await chassisList(interaction);
            }
        }
            break;
    }
}

export const command: Command = {
    data,
    execute
}