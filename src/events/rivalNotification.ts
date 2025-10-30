import {RivalScoreNotificationData} from "@models/events.js";
import {getSongTitle} from "@utils/datatable.js";
import {leaderboardDeltaToString} from "@utils/common.js";
import {difficultyToEmoji, rankIdToEmoji} from "@utils/config.js";
import {EMBED_COLOUR} from "@constants/discord.js";
import {client} from "@bot/client.js";
import config from '#config' with {type: 'json'};
import logger from "@utils/logger.js";
import {AttachmentBuilder, TextChannel} from "discord.js";
import {createCostumeAvatar} from "@utils/costume.js";
import {getCostume, getMyDonName} from "@database/queries/userData.js";
import {getDiscordIdFromBaid} from "@database/queries/userDiscord.js";
import {Language} from "@constants/datatable.js";

export async function sendUserBeatsRivalScoreNotification(eventData: RivalScoreNotificationData) {
    let description = '';
    const userDelta = leaderboardDeltaToString(eventData.user_leaderboard_position_delta);
    const rivalDelta = leaderboardDeltaToString(eventData.rival_leaderboard_position_delta);
    const userDiscordId = await getDiscordIdFromBaid(eventData.user_baid);
    let rivalName = (await getMyDonName(eventData.rival_baid))!;
    const costumeData = (await getCostume(eventData.rival_baid))!;
    const avatar = await createCostumeAvatar(costumeData);
    const attachment = new AttachmentBuilder(avatar, {name: 'avatar.png'});
    const difficultyEmoji = difficultyToEmoji(eventData.difficulty)
    const title = getSongTitle(eventData.song_id, Language.JAPANESE)
    description += `## You beat ${rivalName}'s score`
    description += `\n### ${difficultyEmoji} ${title}`
    description += `\nYour score: ${rankIdToEmoji(eventData.user_rank - 2)}${eventData.user_score} (#${eventData.user_leaderboard_position} ${userDelta})`;
    description += `\n${rivalName}'s score: ${rankIdToEmoji(eventData.rival_rank - 2)}${eventData.rival_score} (#${eventData.rival_leaderboard_position} ${rivalDelta})`;
    const embed = {
        color: EMBED_COLOUR,
        description: description,
        thumbnail: {
            url: 'attachment://avatar.png'
        },
        timestamp: (new Date()).toISOString(),
    };
    const channel = client.channels.cache.get(config.notificationChannelId);
    if (!channel) {
        logger.error({}, 'Notification Channel not found');
        return;
    }
    if (channel instanceof TextChannel) {
        await channel.send({content: userDiscordId ? `<@${userDiscordId}>` : '', embeds: [embed], files: [attachment]});
    }
}


export async function sendRivalBeatUserScoreNotification(eventData: RivalScoreNotificationData) {
    let description = '';
    const userDelta = leaderboardDeltaToString(eventData.user_leaderboard_position_delta);
    const rivalDelta = leaderboardDeltaToString(eventData.rival_leaderboard_position_delta);
    const userDiscordId = await getDiscordIdFromBaid(eventData.user_baid);
    let rivalName = (await getMyDonName(eventData.rival_baid))!;
    const costumeData = (await getCostume(eventData.rival_baid))!;
    const avatar = await createCostumeAvatar(costumeData);
    const attachment = new AttachmentBuilder(avatar, {name: 'avatar.png'});
    const difficultyEmoji = difficultyToEmoji(eventData.difficulty)
    const title = getSongTitle(eventData.song_id, Language.JAPANESE)
    description += `## ${rivalName} beat your score`
    description += `\n### ${difficultyEmoji} ${title}`
    description += `\n${rivalName}'s score: ${rankIdToEmoji(eventData.rival_rank - 2)}${eventData.rival_score} (#${eventData.rival_leaderboard_position} ${rivalDelta})`;
    description += `\nYour Score: ${rankIdToEmoji(eventData.user_rank - 2)}${eventData.user_score} (#${eventData.user_leaderboard_position} ${userDelta})`;
    const embed = {
        color: EMBED_COLOUR,
        description: description,
        thumbnail: {
            url: 'attachment://avatar.png'
        },
        timestamp: (new Date()).toISOString(),
    };
    const channel = client.channels.cache.get(config.notificationChannelId);
    if (!channel) {
        logger.error({}, 'Notification Channel not found');
        return;
    }
    if (channel instanceof TextChannel) {
        await channel.send({content: userDiscordId ? `<@${userDiscordId}>` : '', embeds: [embed], files: [attachment]});
    }
}