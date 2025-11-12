import {AttachmentBuilder, SlashCommandBuilder} from 'discord.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {getCostume, getMyDonName} from '@database/queries/userData.js';
import {ALL_CONTEXTS, ALL_INTEGRATION_TYPES, EMBED_COLOUR} from '@constants/discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';
import {getBattleStats, getLatestBattles} from '@database/queries/battle.js';
import {PAGE_LIMIT} from '@constants/common.js';
import {createCostumeAvatar} from '@utils/costume.js';

const COMMAND_NAME = 'Battle Stats';

const data = new SlashCommandBuilder()
    .setName('battlestats')
    .setDescription('Battle Stats')
    .setContexts(ALL_CONTEXTS)
    .setIntegrationTypes(ALL_INTEGRATION_TYPES)
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to obtain the stats from')
            .setRequired(false)
    )
    .addUserOption(option =>
        option.setName('opponent')
            .setDescription('The opponent of your battles')
            .setRequired(false)
    )
    .addIntegerOption(option =>
        option.setName('page')
            .setDescription('Battle Log Page')
            .setRequired(false)
            .setMinValue(1)
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    let baid, opponentBaid, opponentDonName = undefined;
    const page = interaction.options.getInteger('page') || 1;
    const userOption = interaction.options.getUser('user');
    if (userOption) {
        baid = await getBaidFromDiscordId(userOption.id);
        if (baid === undefined) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, 'This user has not linked their discord account to their card yet!');
            return;
        }
    } else {
        baid = await getBaidFromDiscordId(interaction.user.id);
        if (baid === undefined) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, 'You have not linked your discord account to your card yet!');
            return;
        }
    }
    const userDonName = await getMyDonName(baid);
    const opponentOption = interaction.options.getUser('opponent');
    if (opponentOption) {
        opponentBaid = await getBaidFromDiscordId(opponentOption.id);
        if (opponentBaid === undefined) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, 'This opponent has not linked their discord account to their card yet!');
            return;
        }
        opponentDonName = await getMyDonName(opponentBaid);
    }
    await interaction.deferReply();

    const battleStats = await getBattleStats(baid, opponentBaid);

    const offset = (page - 1) * PAGE_LIMIT;
    const latestBattles = await getLatestBattles(baid, {opponentBaid, offset});

    let title;
    if (opponentBaid) {
        title = `${userDonName} VS. ${opponentDonName} Battle Stats`;
    } else {
        title = `${userDonName} Battle Stats`;
    }

    let description = `Battles played: ${battleStats.total_battles}`
    description += `\nBattles Won: ${battleStats.battles_won}`
    description += '\n\nBattle Log:'
    if (latestBattles.length > 0) {
        for (const i in latestBattles) {
            const unixSeconds = Math.floor(latestBattles[i].battle_at.getTime() / 1000);
            if (opponentBaid != latestBattles[i].opponent_baid) {
                opponentDonName = await getMyDonName(latestBattles[i].opponent_baid)
            }
            description += `\n${(page - 1) * PAGE_LIMIT + parseInt(i) + 1}. ${userDonName} vs ${opponentDonName}: **${latestBattles[i].winner_baid == baid ? '🟢 WON' : '🔴 LOST'}** at <t:${unixSeconds}:f>`
        }
    } else {
        description += '\nNo Battles Found'
    }

    const costumeData = (await getCostume(baid))!;
    const avatar = await createCostumeAvatar(costumeData);
    const attachment = new AttachmentBuilder(avatar, {name: 'avatar.png'});

    const returnEmbed = {
        title: title,
        color: EMBED_COLOUR,
        description: description,
        thumbnail: {
            url: 'attachment://avatar.png',
        }, author: {
            name: COMMAND_NAME
        }
    };
    await interaction.editReply({embeds: [returnEmbed], files: [attachment]});
}

export const command: Command = {
    data,
    execute
};