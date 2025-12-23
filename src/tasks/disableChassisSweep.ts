import {getAllActiveChassis, setChassisStatus} from "@database/queries/chassis.js";
import {client} from "@bot/client.js";
import config from '#config' with {type: 'json'};
import {TextChannel} from "discord.js";
import logger from "@utils/logger.js";
import {insertModLog} from "@database/queries/modlog.js";
import {EGTS_BOT_MOD_USER_ID, ModlogTypes} from "@constants/modlog.js";

export async function runChassisSweep() {
    const start = Date.now();
    logger.info(`[TASK] disableChassisSweep | Starting Disable Chassis Sweep`);
    try {
        const guild = await client.guilds.fetch(config.guildId);
        const channel = client.channels.cache.get(config.modlogChannelId);
        const members = guild.members.cache;
        if (members.size === 0) {
            logger.error('disableChassisSweep failed: guild member cache is empty');
            return;
        }
        const activeChassis = await getAllActiveChassis();
        let count = 0;
        for (const chassisItem of activeChassis) {
            let reason;
            if (/\D/.test(chassisItem.discord_id)) {
                logger.info(`[TASK] disableChassisSweep | DiscordID ${chassisItem.discord_id} contains non-numeric characters, skipping...`)
                continue;
            }
            if (!members.has(chassisItem.discord_id)) {
                reason = 'User not in guild';
            } else {
                const member = await guild.members.fetch(chassisItem.discord_id);
                if (!member.roles.cache.has(config.donderRoleId)) {
                    reason = 'Missing Donder Role';
                } else {
                    continue;
                }
            }

            await setChassisStatus(chassisItem.chassis_id, false);

            await insertModLog({
                action_type: ModlogTypes.DISABLE_CHASSISID,
                mod_user_id: EGTS_BOT_MOD_USER_ID,
                target_user_id: chassisItem.discord_id,
                target_chassis_id: chassisItem.chassis_id,
                reason: `Disable Chassis Sweep (${reason})`
            });

            if (channel && channel instanceof TextChannel) {
                await channel.send({
                    content: `Disabled <@${chassisItem.discord_id}>'s ChassisID \`${chassisItem.chassis_id}\` REASON: Chassis Sweep (${reason})`
                });
            }
            count++;
        }
        const seconds = ((Date.now() - start) / 1000).toFixed(2);
        logger.info(`[TASK] disableChassisSweep | Finished Disable Chassis Sweep, Checked ${activeChassis.length}, Disabled ${count} chassisID, took ${seconds} seconds`);
    } catch
        (err) {
        logger.error({err: err}, `disableChassisSweep failed`);
    }
}