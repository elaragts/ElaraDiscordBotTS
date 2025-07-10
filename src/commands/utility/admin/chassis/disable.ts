import {getChassisIdFromDiscordId, getDiscordIdFromChassisId, setChassisStatus} from "../../../../database/queries/chassis";
import {replyWithErrorMessage} from "../../../../utils/discord";
import {ChatInputCommandInteraction} from "discord.js";
import {EMBED_COLOUR} from "../../../../constants/discord";

const COMMAND_NAME = "Disable ChassisID"

export async function execute(interaction: ChatInputCommandInteraction)  {
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
    await setChassisStatus(chassisId, false);
    const returnEmbed = {
        description: `Disabled <@${discordId}>'s ChassisID \`${chassisId}\``,
        color: EMBED_COLOUR,
        author: {
            name: COMMAND_NAME
        },
    };
    await interaction.reply({embeds: [returnEmbed]});
}