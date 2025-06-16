import {SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction} from "discord.js";
import {guildId, botChannelId} from "../../../config.json";
import {generateAndRegisterChassis, getChassisIdFromDiscordId} from "../../database/queries/chassis";
import {replyWithErrorMessage} from "../../utils/discord";

module.exports = {
    data: new SlashCommandBuilder()
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
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.user;
        const existingChassisId = await getChassisIdFromDiscordId(user.id);
        if (interaction.options.getSubcommand() === 'request') {
            if (existingChassisId !== undefined) {
                await interaction.reply({
                    embeds: [{
                        description: `You already have a chassisId: \`${existingChassisId}\``,
                        color: 15410003,
                        author: {
                            name: 'Link'
                        }
                    }], flags: MessageFlags.Ephemeral
                });
                return
            }
            if (interaction.guildId !== guildId || interaction.channelId !== botChannelId) {
                const link = `https://discord.com/channels/${guildId}/${botChannelId}`
                await replyWithErrorMessage(interaction, 'Request ChassisID', `Command must be used in ${link}`);
                return;
            }
            const newChassisId = await generateAndRegisterChassis(user.id)
            await interaction.reply({
                embeds: [{
                    title: 'Successfully registered ChassisID',
                    color: 15410003,
                    description: `Your ChassisID: \`${newChassisId}\`\n\nHint: Use \`/chassisid view\` to view your ChassisID again`,
                    author: {
                        name: 'Request ChassisID'
                    }
                }], flags: [MessageFlags.Ephemeral],
            });
        } else { //view
            if (existingChassisId === undefined) {
                await replyWithErrorMessage(interaction, 'View ChassisID', 'You do not have a ChassisID');
                return;
            }
            await interaction.reply({
                embeds: [{
                    color: 15410003,
                    description: `Your ChassisID is: \`${existingChassisId}\``,
                    author: {
                        name: 'View ChassisID'
                    }
                }], flags: MessageFlags.Ephemeral
            });
        }
    },
};