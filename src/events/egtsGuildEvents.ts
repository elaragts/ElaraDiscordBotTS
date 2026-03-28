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
    if (reaction.message.channel.id === config.introductionChannelId
        && config.whitelistedAdmins.includes(user.id)
        && (reaction.emoji.name === "👋" || reaction.emoji.name === "👍")
    ) {
        const targetId = reaction.message.author!.id
        const guild = client.guilds.cache.get(config.guildId)!;
        const guildMember = guild.members.cache.get(targetId);
        if (!guildMember || guildMember.roles.cache.has(config.donderRoleId)) {
            return; //member left server
        }
        await addRoleToGuildMember(config.donderRoleId, guildMember);
        const channel = client.channels.cache.get(config.modlogChannelId);
        const invalidChannel = channel === undefined || !(channel instanceof TextChannel);
        await insertModLog({
            action_type: ModlogTypes.GIVE_DONDER,
            mod_user_id: user.id,
            target_user_id: targetId,
            reason: 'Introduction message reaction add'
        });

        if (invalidChannel) {
            logger.error({}, 'Invalid modlog channel');
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
    }
}