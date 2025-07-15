import {ChatInputCommandInteraction} from 'discord.js';
import {getChassisIdFromDiscordId, getChassisIdStatus} from '@database/queries/chassis.js';
import {EMBED_COLOUR} from '@constants/discord.js';

const COMMAND_NAME = 'View ChassisID';

export async function execute(interaction: ChatInputCommandInteraction) {
    const discordId = interaction.options.getUser('user')!.id;
    const chassisId = await getChassisIdFromDiscordId(discordId);
    let returnEmbed;
    if (chassisId === undefined) {
        returnEmbed = {
            description: `User <@${discordId}> does not have a ChassisID`,
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