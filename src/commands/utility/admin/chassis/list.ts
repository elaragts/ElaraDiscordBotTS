import {
    getChassisIdFromDiscordId,
    getDiscordIdFromChassisId,
    getUserChassisList,
} from "../../../../database/queries/chassis";
import {replyWithErrorMessage} from "../../../../utils/discord";
import {ChatInputCommandInteraction} from "discord.js";

export async function execute(interaction: ChatInputCommandInteraction)  {
    let discordId, chassisId;
    const userOption = interaction.options.getUser('user');
    const chassisIdOption = interaction.options.getNumber('chassisid');
    const page = interaction.options.getInteger('page') || 1;

    if (userOption) {
        discordId = userOption.id;
        chassisId = await getChassisIdFromDiscordId(discordId);
        if (chassisId === undefined) {
            return await replyWithErrorMessage(interaction, 'ChassisID List', `User <@${discordId}> does not have a ChassisID`);
        }
    } else if (chassisIdOption) {
        chassisId = chassisIdOption;
        discordId = await getDiscordIdFromChassisId(chassisId);
        if (discordId === undefined) {
            return await replyWithErrorMessage(interaction, 'ChassisID List', `ChassisID \`${chassisId}\` not found`);
        }
    } else {
        return await replyWithErrorMessage(interaction, 'ChassisID List', 'ChassisID or user option required');
    }
    const result = await getUserChassisList(chassisId, (page-1)*10);
    let desc = result.length > 0 ? '' : 'No results found';
    for (let i in result) {
        desc += `${i+1}. baid: ${result[i].baid} (${result[i].my_don_name}) - ${result[i].discord_id ? `<@${result[i].discord_id}> - ` : ''}Last used: ${result[i].last_used.toDateString()}\n`;
    }
    const returnEmbed = {
        description: desc,
        color: 15410003,
        author: {
            name: "ChassisID List"
        },
    };
    await interaction.reply({embeds: [returnEmbed]});
}