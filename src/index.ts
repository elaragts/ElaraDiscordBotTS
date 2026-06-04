import {client} from '@bot/client.js';
import dotenv from 'dotenv';
import {registerHandlers} from '@bot/handlers.js';
import {validateConfig} from '@utils/config.js';
import {initializeDatatable} from '@utils/datatable.js';
import {initializeDatabase} from "@database/index.js";
import {BattleSession} from '@services/battle/BattleSession.js';
import logger from '@utils/logger.js';

let shuttingDown = false;

async function gracefulShutdown(signal: NodeJS.Signals): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal}; restoring active battle favourite songs`);
    try {
        await BattleSession.restoreActiveFavouriteSongs();
        client.destroy();
        logger.info('Shutdown cleanup complete');
        process.exit(signal === 'SIGINT' ? 130 : 143);
    } catch (error) {
        logger.error(error, 'Shutdown cleanup failed');
        process.exit(1);
    }
}

process.once('SIGINT', signal => {
    void gracefulShutdown(signal);
});

process.once('SIGTERM', signal => {
    void gracefulShutdown(signal);
});

dotenv.config();
validateConfig();
initializeDatatable();
await initializeDatabase();
await registerHandlers(client);
client.login(process.env.BOT_TOKEN);
