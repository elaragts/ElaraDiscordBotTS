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
        const guild = client.guilds.cache.get(config.guildId)!;

        const channel = client.channels.cache.get(config.modlogChannelId);

        const activeChassis = await getAllActiveChassis();
        let count = 0;
        for (const chassisItem of activeChassis) {
            const member = await guild.members.fetch(chassisItem.discord_id);
            if (member && member.roles.cache.has(config.donderRoleId)) {
                continue;
            }
            await setChassisStatus(chassisItem.chassis_id, false);

            await insertModLog({
                action_type: ModlogTypes.DISABLE_CHASSISID,
                mod_user_id: EGTS_BOT_MOD_USER_ID,
                target_user_id: member.id,
                target_chassis_id: chassisItem.chassis_id,
                reason: 'Disable Chassis Sweep'
            });

            if (channel && channel instanceof TextChannel) {
                await channel.send({
                    content: `Disabled <@${chassisItem.discord_id}>'s ChassisID \`${chassisItem.chassis_id}\` REASON: Chassis Sweep`
                });
            }
            count++;
        }
        const seconds = ((Date.now() - start) / 1000).toFixed(2);
        logger.info(`[TASK] disableChassisSweep | Finished Disable Chassis Sweep, Checked ${activeChassis.length}, Disabled ${count} chassisID, took ${seconds} seconds`);
    } catch (err) {
        logger.error({err: err}, `There was an error while executing Chassis sweep`);
    }
}