import {SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction} from "discord.js";
import {guildId, botChannelId} from "../../../config.json";
import {generateAndRegisterChassis, getChassisIdFromDiscordId} from "../../database/queries/chassis";
import {replyWithErrorMessage} from "../../utils/discord";
import {EMBED_COLOUR} from "../../constants/discord";

const COMMAND_NAME = "ChassisID"

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
                return await replyWithErrorMessage(interaction, COMMAND_NAME, `You already have a chassisId: \`${existingChassisId}\``)
            }
            if (interaction.guildId !== guildId || interaction.channelId !== botChannelId) {
                const link = `https://discord.com/channels/${guildId}/${botChannelId}`
                await replyWithErrorMessage(interaction, COMMAND_NAME, `Command must be used in ${link}`);
                return;
            }
            const newChassisId = await generateAndRegisterChassis(user.id)
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
    },
};