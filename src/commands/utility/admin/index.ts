import {SlashCommandBuilder, InteractionContextType, ChatInputCommandInteraction} from "discord.js";

import {replyWithErrorMessage} from "../../../utils/discord";
import {whitelistedAdmins} from "../../../../config.json";
import {execute as chassisWhois} from "./chassis/whois";
import {execute as chassisView} from "./chassis/view";
import {execute as chassisEnable} from "./chassis/enable";
import {execute as chassisDisable} from "./chassis/disable";
import {execute as chassisDelete} from "./chassis/delete";
import {execute as chassisList} from "./chassis/list";

export const data = new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Admin commands")
    .setDefaultMemberPermissions(0) //admin only
    .setContexts(InteractionContextType.Guild)
    .addSubcommandGroup(
        subcommandGroup =>
            subcommandGroup
                .setName("chassisid")
                .setDescription("ChassisID related commands")
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName("whois")
                            .setDescription("Get user from ChassisID")
                            .addNumberOption(option =>
                                option
                                    .setName("chassisid")
                                    .setDescription("User's ChassisID")
                                    .setRequired(true)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName("view")
                            .setDescription("View user's ChassisID")
                            .addUserOption(option =>
                                option
                                    .setName("user")
                                    .setDescription("Target user")
                                    .setRequired(true)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName("delete")
                            .setDescription("Deletes ChassisID/User's ChassisID")
                            .addUserOption(option =>
                                option
                                    .setName("user")
                                    .setDescription("Target user")
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName("chassisid")
                                    .setDescription("Target ChassisID")
                                    .setRequired(false)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName("enable")
                            .setDescription("Enables ChassisID/User's ChassisID")
                            .addUserOption(option =>
                                option
                                    .setName("user")
                                    .setDescription("Target user")
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName("chassisid")
                                    .setDescription("Target ChassisID")
                                    .setRequired(false)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName("disable")
                            .setDescription("Disables ChassisID/User's ChassisID")
                            .addUserOption(option =>
                                option
                                    .setName("user")
                                    .setDescription("Target user")
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName("chassisid")
                                    .setDescription("Target ChassisID")
                                    .setRequired(false)
                            )
                )
                .addSubcommand(
                    subcommand =>
                        subcommand
                            .setName("list")
                            .setDescription("Lists baids that used ChassisID/User's ChassisID")
                            .addUserOption(option =>
                                option
                                    .setName("user")
                                    .setDescription("Target user")
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName("chassisid")
                                    .setDescription("Target ChassisID")
                                    .setRequired(false)
                            )
                            .addNumberOption(option =>
                                option
                                    .setName("baid")
                                    .setDescription("Target Baid")
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

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!whitelistedAdmins.includes(interaction.user.id)) {
        await replyWithErrorMessage(interaction, "Admin", "You are not a whitelisted admin!");
        return;
    }
    switch (interaction.options.getSubcommandGroup()) {
        case "chassisid": {
            switch (interaction.options.getSubcommand()) {
                case "whois":
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