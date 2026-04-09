import {
    GuildMember,
    MessageReaction,
    PartialGuildMember,
    PartialMessageReaction,
    PartialUser,
    TextChannel,
    User
} from "discord.js";
import config from '#config' with {type: 'json'};
import {getChassisIdFromDiscordId, getChassisIdStatus, setChassisStatus} from "@database/queries/chassis.js";
import {client} from "@bot/client.js";
import logger from "@utils/logger.js";
import {insertModLog} from "@database/queries/modlog.js";
import {EGTS_BOT_MOD_USER_ID, ModlogTypes} from "@constants/modlog.js";
import {addRoleToGuildMember} from "@utils/discord.js";
import {EMBED_COLOUR} from "@constants/discord.js";

export async function handleEgtsGuildMemberRemove(guildMember: GuildMember | PartialGuildMember) {
    await disableChassisIfActive(guildMember.id, 'Left server');
}

export async function handleEgtsGuildMemberUpdate(oldGuildMember: GuildMember | PartialGuildMember, newGuildMember: GuildMember) {
    const hadDonderRoleBefore = oldGuildMember.roles.cache.has(config.donderRoleId);
    const hasDonderRoleNow = newGuildMember.roles.cache.has(config.donderRoleId);
    if (hadDonderRoleBefore && !hasDonderRoleNow) {
        await disableChassisIfActive(newGuildMember.id, 'Donder role removed');
    }
    if (!hadDonderRoleBefore && hasDonderRoleNow) {
        await enableChassisIfDisabled(newGuildMember.id, 'Donder role added');
    }
}

async function disableChassisIfActive(memberId: string, reason: string) {
    const chassisId = await getChassisIdFromDiscordId(memberId);
    if (chassisId === undefined || !(await getChassisIdStatus(chassisId))) {
        return;
    }

    await setChassisStatus(chassisId, false);
    await insertModLog({
        action_type: ModlogTypes.DISABLE_CHASSISID,
        mod_user_id: EGTS_BOT_MOD_USER_ID,
        target_user_id: memberId,
        target_chassis_id: chassisId,
        reason: 'Donder role removed'
    });

    const channel = client.channels.cache.get(config.modlogChannelId);
    if (channel === undefined || !(channel instanceof TextChannel)) {
        logger.error({}, 'Invalid modlog channel');
        return;
    }
    await channel.send({
        content: `Disabled <@${memberId}>'s ChassisID \`${chassisId}\` REASON: ${reason}`
    });
}

async function enableChassisIfDisabled(memberId: string, reason: string) {
    const chassisId = await getChassisIdFromDiscordId(memberId);
    if (chassisId === undefined) {
        return;
    }
    const channel = client.channels.cache.get(config.modlogChannelId);
    const invalidChannel = channel === undefined || !(channel instanceof TextChannel);
    if (await getChassisIdStatus(chassisId) && !invalidChannel) {
        await channel.send({
            content: `WARNING: <@${memberId}>'s ChassisID \`${chassisId}\` was already enabled`,
        });
        return;
    }
    await setChassisStatus(chassisId, true);
    await insertModLog({
        action_type: ModlogTypes.ENABLE_CHASSISID,
        mod_user_id: EGTS_BOT_MOD_USER_ID,
        target_user_id: memberId,
        target_chassis_id: chassisId,
        reason: 'Donder role added'
    });

    if (invalidChannel) {
        logger.error({}, 'Invalid modlog channel');
        return;
    }
    await channel.send({
        content: `Enabled <@${memberId}>'s ChassisID \`${chassisId}\` REASON: ${reason}`
    });
}

export async function handleEgtsMessageReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    if (reaction.message.channel.id !== config.introductionChannelId || !config.whitelistedAdmins.includes(user.id)) return;
    const targetId = reaction.message.author!.id
    const guild = client.guilds.cache.get(config.guildId)!;
    const guildMember = guild.members.cache.get(targetId);
    if (!guildMember || guildMember.roles.cache.has(config.donderRoleId)) {
        return; //member left server or member already has donder role
    }
    if (reaction.emoji.name === "👋" || reaction.emoji.name === "👍") {
        await addRoleToGuildMember(config.donderRoleId, guildMember);
        const channel = client.channels.cache.get(config.donderLogChannelId);
        const invalidChannel = channel === undefined || !(channel instanceof TextChannel);
        await insertModLog({
            action_type: ModlogTypes.GIVE_DONDER,
            mod_user_id: user.id,
            target_user_id: targetId,
            reason: `Introduction message reaction add; MESSAGE: ${reaction.message.content ?? 'empty introduction message'}`
        });

        if (invalidChannel) {
            logger.error({}, 'Invalid donderLog channel');
            return;
        }
        const returnEmbed = {
            description: reaction.message.content ?? 'empty introduction message',
            color: EMBED_COLOUR,
            author: {
                name: reaction.message.author!.username,
                iconURL: reaction.message.author!.avatarURL(),
                URL: reaction.message!.url
            }
        };

        await channel.send({
            content: `Gave <@${targetId}> (${reaction.message.author!.username}) Donder Role, REASON: Reaction Add by <@${user.id}>`,
            embeds: [returnEmbed]
        });
    } else if (reaction.emoji.id === config.ALLNetBADEmojiId) {
        let description = ''
        // description += '**日本語**\nこの自己紹介は不十分です。ルールを再度ご確認のうえ、適切な自己紹介を行い、紹介者を@メンションしてください'
        // description += '\n\n**ENG**\nThis introduction is insufficient. Please review the rules and provide a proper introduction, including @mentioning your referrer.'
        // description += '\n\n**中文**\n此自我介紹並不完整。請重新閱讀規則並提供完整的自我介紹，同時@提及你的轉介人。'
        description += '**日本語**\nこの自己紹介は不十分です。ルールを再度ご確認のうえ、適切で十分な自己紹介を行ってください。'
        description += '\n\n**ENG**\nThis introduction is insufficient. Please review the rules and provide a proper introduction.'
        description += '\n\n**中文**\n此自我介紹並不完整。請重新閱讀規則並提供一份完整且充分的自我介紹。'
        const returnEmbed = {
            description: description,
            color: EMBED_COLOUR,
            author: {
                name: reaction.message.author!.username,
                iconURL: reaction.message.author!.avatarURL(),
                URL: reaction.message!.url
            }
        };
        await reaction.message!.reply({
            embeds: [returnEmbed]
        })
    }
}