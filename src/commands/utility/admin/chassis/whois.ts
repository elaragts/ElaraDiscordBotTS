import {ChatInputCommandInteraction} from "discord.js";
import {getDiscordIdFromChassisId, getChassisIdStatus} from "../../../../database/queries/chassis";
import {EMBED_COLOUR} from "../../../../constants/discord";

const COMMAND_NAME = "ChassisID Whois"
export async function execute(interaction: ChatInputCommandInteraction)  {
    const chassisId = interaction.options.getNumber('chassisid')!
    const discordId = await getDiscordIdFromChassisId(chassisId)
    let returnEmbed;
    if (discordId === undefined) {
        returnEmbed = {
            description: `ChassisID \`${chassisId}\` was not found`,
            color: EMBED_COLOUR,
            author: {
                name: COMMAND_NAME
            },
        };
    } else {
        let status = (await getChassisIdStatus(chassisId))! ? 'Active' : 'Disabled';
        returnEmbed = {
            description: `ChassisID \`${chassisId}\` belongs to <@${discordId}>, status: \`${status}\``,
            color: EMBED_COLOUR,
            author: {
                name: COMMAND_NAME
            },
        };
    }
    await interaction.reply({embeds: [returnEmbed]});
}