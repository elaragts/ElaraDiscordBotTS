import {ChatInputCommandInteraction} from 'discord.js';
import {listChassisByOwner} from '@database/queries/chassis.js';
import {EMBED_COLOUR} from '@constants/discord.js';

const COMMAND_NAME = 'View ChassisID';

export async function execute(interaction: ChatInputCommandInteraction) {
    const discordId = interaction.options.getUser('user', true).id;
    const chassis = await listChassisByOwner(discordId);
    const description = chassis.length === 0
        ? `User <@${discordId}> does not have a ChassisID`
        : chassis.map(item => `ChassisID \`${item.chassis_id}\` (${item.nickname ?? 'Unnamed'}), status: \`${item.active ? 'Active' : 'Disabled'}\``).join('\n');
    await interaction.reply({embeds: [{description, color: EMBED_COLOUR, author: {name: COMMAND_NAME}}]});
}
