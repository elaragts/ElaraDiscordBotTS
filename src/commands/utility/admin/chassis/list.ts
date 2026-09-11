import {
    getChassisIdsByDiscordId,
    getDiscordIdFromChassisId,
    getUserChassisList, getUserUsedChassisList,
} from '@database/queries/chassis.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {ChatInputCommandInteraction, APIEmbed} from 'discord.js';
import {doesBaidExist, getMyDonName} from '@database/queries/userData.js';
import {EMBED_COLOUR} from '@constants/discord.js';
import {PAGE_LIMIT} from '@constants/common.js';

const COMMAND_NAME = 'List ChassisID';


export async function execute(interaction: ChatInputCommandInteraction) {
    let discordId, chassisId;
    const userOption = interaction.options.getUser('user');
    const chassisIdOption = interaction.options.getNumber('chassisid');
    const page = interaction.options.getInteger('page') || 1;
    const baid = interaction.options.getNumber('baid');
    let returnEmbed: APIEmbed;
    if (baid) {
        if (!await doesBaidExist(baid)) {
            return replyWithErrorMessage(interaction, COMMAND_NAME, `baid ${baid} does not exist`);
        }
        const myDonName = (await getMyDonName(baid))!;
        const offset = (page - 1) * PAGE_LIMIT;
        const result = await getUserUsedChassisList(baid, offset);
        let desc = result.length > 0 ? '' : 'No results found';
        for (let i in result) {
            desc += `${(page - 1) * PAGE_LIMIT + parseInt(i) + 1}. \`${result[i].chassis_id}\` - Assigned to: <@${result[i].discord_id}> - Last used: ${result[i].last_used.toDateString()}\n`;
        }
        returnEmbed = {
            title: `baid: ${baid} (${myDonName})`,
            description: desc,
            color: EMBED_COLOUR,
            author: {
                name: COMMAND_NAME
            },
        };
    } else {
        if (userOption) {
            discordId = userOption.id;
            const chassisIds = await getChassisIdsByDiscordId(discordId);
            if (chassisIds.length === 0) {
                return await replyWithErrorMessage(interaction, COMMAND_NAME, `User <@${discordId}> does not have a ChassisID`);
            }
            const offset = (page - 1) * PAGE_LIMIT;
            const results = await Promise.all(chassisIds.map(async id => ({id, users: await getUserChassisList(id, offset)})));
            const description = results.map(result => {
                const users = result.users.length === 0
                    ? 'No results found'
                    : result.users.map((item, index) => `${offset + index + 1}. baid: \`${item.baid}\` (${item.my_don_name}) - ${item.discord_id ? `<@${item.discord_id}> - ` : ''}Last used: ${item.last_used.toDateString()}`).join('\n');
                return `ChassisID: \`${result.id}\`\n${users}`;
            }).join('\n\n');
            await interaction.reply({embeds: [{description, color: EMBED_COLOUR, author: {name: COMMAND_NAME}}]});
            return;
        } else if (chassisIdOption) {
            chassisId = chassisIdOption;
            discordId = await getDiscordIdFromChassisId(chassisId);
            if (discordId === undefined) {
                return await replyWithErrorMessage(interaction, COMMAND_NAME, `ChassisID \`${chassisId}\` not found`);
            }
        } else {
            return await replyWithErrorMessage(interaction, COMMAND_NAME, 'ChassisID or user option required');
        }
        const offset = (page - 1) * PAGE_LIMIT;
        const result = await getUserChassisList(chassisId, offset);
        let desc = result.length > 0 ? `ChassisID: \`${chassisId}\`\n` : 'No results found';
        for (let i in result) {
            desc += `${(page - 1) * PAGE_LIMIT + parseInt(i) + 1}. baid: \`${result[i].baid}\` (${result[i].my_don_name}) - ${result[i].discord_id ? `<@${result[i].discord_id}> - ` : ''}Last used: ${result[i].last_used.toDateString()}\n`;
        }
        returnEmbed = {
            description: desc,
            color: EMBED_COLOUR,
            author: {
                name: COMMAND_NAME
            },
        };
    }
    await interaction.reply({embeds: [returnEmbed]});
}
