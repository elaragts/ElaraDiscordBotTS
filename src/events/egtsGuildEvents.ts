import {GuildMember, PartialGuildMember, TextChannel} from "discord.js";
import config from '#config' with {type: 'json'};
import {getChassisIdFromDiscordId, getChassisIdStatus, setChassisStatus} from "@database/queries/chassis.js";
import {client} from "@bot/client.js";
import logger from "@utils/logger.js";

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
    if (invalidChannel) {
        logger.error({}, 'Invalid modlog channel');
        return;
    }
    await channel.send({
        content: `Enabled <@${memberId}>'s ChassisID \`${chassisId}\` REASON: ${reason}`
    });
}