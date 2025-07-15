import {
    deleteChassisById,
    getChassisIdFromDiscordId,
    getDiscordIdFromChassisId,
    setChassisStatus
} from '@database/queries/chassis.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, MessageFlags} from 'discord.js';
import {EMBED_COLOUR} from '@constants/discord.js';

const COMMAND_NAME = 'Delete ChassisID';

export async function execute(interaction: ChatInputCommandInteraction) {
    let discordId, chassisId;
    const userOption = interaction.options.getUser('user');
    const chassisIdOption = interaction.options.getNumber('chassisid');

    if (userOption) {
        discordId = userOption.id;
        chassisId = await getChassisIdFromDiscordId(discordId);
        if (chassisId === undefined) {
            return await replyWithErrorMessage(interaction, COMMAND_NAME, `User <@${discordId}> does not have a ChassisID`);
        }
    } else if (chassisIdOption) {
        chassisId = chassisIdOption;
        discordId = await getDiscordIdFromChassisId(chassisId);
        if (discordId === undefined) {
            return await replyWithErrorMessage(interaction, COMMAND_NAME, `ChassisID \`${chassisId}\` not found`);
        }
    } else {
        return await replyWithErrorMessage(interaction, COMMAND_NAME, 'ChassisID or user option required');
    }

    await setChassisStatus(chassisId, true);
    const confirmEmbed = {
        description: `Are you sure you want to delete <@${discordId}>'s ChassisID \`${chassisId}\`?\nThis will allow the user to register a new chassisID`,
        color: 15410003,
        author: {
            name: COMMAND_NAME
        },
    };
    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Primary);

    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

    const joinRow = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);

    const response = await interaction.reply({embeds: [confirmEmbed], components: [joinRow.toJSON()]});
    const responseCollector = response.createMessageComponentCollector({filter: _ => true, time: 300000});

    responseCollector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({
                content: 'Only the initiator can interact with this message',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        if (i.customId === 'confirm') {
            const result = await deleteChassisById(chassisId);
            if (result > 0) {
                await interaction.editReply({
                    embeds: [{
                        description: `Deleted <@${discordId}>'s ChassisID \`${chassisId}\``,
                        color: EMBED_COLOUR,
                        author: {
                            name: COMMAND_NAME
                        },
                    }], components: []
                });
            } else {
                await interaction.editReply({
                    embeds: [{
                        description: `Failed to delete chassis ID`,
                        color: EMBED_COLOUR,
                        author: {
                            name: COMMAND_NAME
                        },
                    }], components: []
                });
            }
            responseCollector.stop();
        } else {
            await interaction.editReply({
                embeds: [{
                    description: `Cancelled Interaction`,
                    color: EMBED_COLOUR,
                    author: {
                        name: COMMAND_NAME
                    },
                }], components: []
            });
            responseCollector.stop();
        }
    });

    responseCollector.on('end', async (_, reason) => {
        if (reason === 'time') {
            await interaction.editReply({
                embeds: [{
                    description: `Interaction timed out`,
                    color: EMBED_COLOUR,
                    author: {
                        name: COMMAND_NAME
                    },
                }], components: []
            });
        }
    });
}