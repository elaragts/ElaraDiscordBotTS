import {runChassisSweep} from "./disableChassisSweep.js";
import config from '#config' with {type: 'json'};

const ONE_HOUR = 1000 * 60 * 60;

export async function startTasks() {
    if (config.tasks.disableChassisSweep) {
        await runChassisSweep();

        setInterval(async () => {
            await runChassisSweep();
        }, ONE_HOUR);
    }
}