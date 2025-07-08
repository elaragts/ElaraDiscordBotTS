import {ChatInputCommandInteraction} from "discord.js";
import {getDiscordIdFromChassisId, getChassisIdStatus} from "../../../../database/queries/chassis";

export async function execute(interaction: ChatInputCommandInteraction)  {
    const chassisId = interaction.options.getNumber('chassisid')!
    const discordId = await getDiscordIdFromChassisId(chassisId)
    let returnEmbed;
    if (discordId === undefined) {
        returnEmbed = {
            description: `ChassisID \`${chassisId}\` was not found`,
            color: 15410003,
            author: {
                name: "ChassisID Whois"
            },
        };
    } else {
        let status = (await getChassisIdStatus(chassisId))! ? 'Active' : 'Disabled';
        returnEmbed = {
            description: `ChassisID \`${chassisId}\` belongs to <@${discordId}>, status: \`${status}\``,
            color: 15410003,
            author: {
                name: "ChassisID Whois"
            },
        };
    }
    await interaction.reply({embeds: [returnEmbed]});
}