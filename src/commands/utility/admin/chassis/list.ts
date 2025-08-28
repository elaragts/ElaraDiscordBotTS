import {
    getChassisIdFromDiscordId,
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
            desc += `${i + 1}. \`${result[i].chassis_id}\` - Assigned to: <@${result[i].discord_id}> - Last used: ${result[i].last_used.toDateString()}\n`;
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
        const offset = (page - 1) * PAGE_LIMIT;
        const result = await getUserChassisList(chassisId, offset);
        let desc = result.length > 0 ? `ChassisID: \`${chassisId}\`\n` : 'No results found';
        for (let i in result) {
            desc += `${i + 1}. baid: \`${result[i].baid}\` (${result[i].my_don_name}) - ${result[i].discord_id ? `<@${result[i].discord_id}> - ` : ''}Last used: ${result[i].last_used.toDateString()}\n`;
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