import {
    getChassisIdsByDiscordId,
    getDiscordIdFromChassisId,
    setChassisStatus
} from '@database/queries/chassis.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {ChatInputCommandInteraction} from 'discord.js';
import {EMBED_COLOUR} from '@constants/discord.js';
import {insertModLog} from "@database/queries/modlog.js";
import {ModlogTypes} from "@constants/modlog.js";

const COMMAND_NAME = 'Enable ChassisID';


export async function execute(interaction: ChatInputCommandInteraction) {
    let discordId, chassisId;
    const userOption = interaction.options.getUser('user');
    const chassisIdOption = interaction.options.getNumber('chassisid');

    if (userOption) {
        discordId = userOption.id;
        const chassisIds = await getChassisIdsByDiscordId(discordId);
        if (chassisIds.length === 0) {
            return await replyWithErrorMessage(interaction, COMMAND_NAME, `User <@${discordId}> does not have a ChassisID`);
        }
        if (chassisIds.length > 1) {
            return await replyWithErrorMessage(interaction, COMMAND_NAME, 'This user owns multiple chassis; specify a Chassis ID.');
        }
        chassisId = chassisIds[0];
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
    await insertModLog({
        action_type: ModlogTypes.ENABLE_CHASSISID,
        mod_user_id: interaction.user.id,
        target_user_id: discordId,
        target_chassis_id: chassisId,
        reason: '/admin chassisid enable used'
    });

    const returnEmbed = {
        description: `Enabled <@${discordId}>'s ChassisID \`${chassisId}\``,
        color: EMBED_COLOUR,
        author: {
            name: COMMAND_NAME
        },
    };
    await interaction.reply({embeds: [returnEmbed]});
}
