import {ChatInputCommandInteraction} from "discord.js";
import {getChassisIdFromDiscordId, getChassisIdStatus} from "../../../../database/queries/chassis";

export async function execute(interaction: ChatInputCommandInteraction)  {
    const discordId = interaction.options.getUser('user')!.id
    const chassisId = await getChassisIdFromDiscordId(discordId)
    let returnEmbed;
    if (chassisId === undefined) {
        returnEmbed = {
            description: `User <@${discordId}> does not have a ChassisID`,
            color: 15410003,
            author: {
                name: "View ChassisID"
            },
        };
    } else {
        let status = (await getChassisIdStatus(chassisId))! ? 'Active' : 'Disabled';
        returnEmbed = {
            description: `ChassisID \`${chassisId}\` belongs to <@${discordId}>, status: \`${status}\``,
            color: 15410003,
            author: {
                name: "View ChassisID"
            },
        };
    }
    await interaction.reply({embeds: [returnEmbed]});
}