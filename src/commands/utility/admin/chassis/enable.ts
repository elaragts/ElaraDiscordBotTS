import {getChassisIdFromDiscordId, getDiscordIdFromChassisId, setChassisStatus} from "../../../../database/queries/chassis";
import {replyWithErrorMessage} from "../../../../utils/discord";
import {ChatInputCommandInteraction} from "discord.js";

export async function execute(interaction: ChatInputCommandInteraction)  {
    let discordId, chassisId;
    const userOption = interaction.options.getUser('user');
    const chassisIdOption = interaction.options.getNumber('chassisid');

    if (userOption) {
        discordId = userOption.id;
        chassisId = await getChassisIdFromDiscordId(discordId);
        if (chassisId === undefined) {
            return await replyWithErrorMessage(interaction, 'Enable ChassisID', `User <@${discordId}> does not have a ChassisID`);
        }
    } else if (chassisIdOption) {
        chassisId = chassisIdOption;
        discordId = await getDiscordIdFromChassisId(chassisId);
        if (discordId === undefined) {
            return await replyWithErrorMessage(interaction, 'Enable ChassisID', `ChassisID \`${chassisId}\` not found`);
        }
    } else {
        return await replyWithErrorMessage(interaction, 'Enable ChassisID', 'ChassisID or user option required');
    }
    await setChassisStatus(chassisId, true);
    const returnEmbed = {
        description: `Enabled <@${discordId}>'s ChassisID \`${chassisId}\``,
        color: 15410003,
        author: {
            name: "Enable ChassisID"
        },
    };
    await interaction.reply({embeds: [returnEmbed]});
}