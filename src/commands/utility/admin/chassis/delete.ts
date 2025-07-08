import {
    deleteChassisById,
    getChassisIdFromDiscordId,
    getDiscordIdFromChassisId,
    setChassisStatus
} from "../../../../database/queries/chassis";
import {replyWithErrorMessage} from "../../../../utils/discord";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, MessageFlags} from "discord.js";

export async function execute(interaction: ChatInputCommandInteraction)  {
    let discordId, chassisId;
    const userOption = interaction.options.getUser('user');
    const chassisIdOption = interaction.options.getNumber('chassisid');

    if (userOption) {
        discordId = userOption.id;
        chassisId = await getChassisIdFromDiscordId(discordId);
        if (chassisId === undefined) {
            return await replyWithErrorMessage(interaction, 'Delete ChassisID', `User <@${discordId}> does not have a ChassisID`);
        }
    } else if (chassisIdOption) {
        chassisId = chassisIdOption;
        discordId = await getDiscordIdFromChassisId(chassisId);
        if (discordId === undefined) {
            return await replyWithErrorMessage(interaction, 'Delete ChassisID', `ChassisID \`${chassisId}\` not found`);
        }
    } else {
        return await replyWithErrorMessage(interaction, 'Delete ChassisID', 'ChassisID or user option required');
    }

    await setChassisStatus(chassisId, true);
    const confirmEmbed = {
        description: `Are you sure you want to delete <@${discordId}>'s ChassisID \`${chassisId}\`?\nThis will allow the user to register a new chassisID`,
        color: 15410003,
        author: {
            name: "Delete ChassisID"
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
            await i.reply({content: "Only the initiator can interact with this message", flags: MessageFlags.Ephemeral});
            return;
        }
        if (i.customId === 'confirm') {
            const result = await deleteChassisById(chassisId)
            if (result > 0) {
                await interaction.editReply({
                    embeds: [{
                        description: `Deleted <@${discordId}>'s ChassisID \`${chassisId}\``,
                        color: 15410003,
                        author: {
                            name: "Delete ChassisID"
                        },
                    }], components: []
                });
            } else {
                await interaction.editReply({
                    embeds: [{
                        description: `Failed to delete chassis ID`,
                        color: 15410003,
                        author: {
                            name: "Delete ChassisID"
                        },
                    }], components: []
                });
            }
            responseCollector.stop();
        } else {
            await interaction.editReply({
                embeds: [{
                    description: `Cancelled Interaction`,
                    color: 15410003,
                    author: {
                        name: "Delete ChassisID"
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
                    color: 15410003,
                    author: {
                        name: "Delete ChassisID"
                    },
                }], components: []
            });
        }
    });
}