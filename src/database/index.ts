import {Kysely, PostgresDialect} from 'kysely';
import {Pool, Client, types} from 'pg';
import type {DB} from '@models/taiko.d.js';
import {handleDatabaseEvent} from "@events/index.js";
import {DatabaseEvent} from "@models/events.js";
import logger from "@utils/logger.js";

export let db: Kysely<DB> | null = null;

export async function initializeDatabase() {
    // Parse types first (safe to call multiple times)
    types.setTypeParser(20, val => parseInt(val, 10));

    //@ts-ignore
    types.setTypeParser(1016, val =>
        val
            .slice(1, -1)
            .split(',')
            .map(n => parseInt(n, 10))
    );

    const dbConfig = {
        host: process.env.DB_HOST!,
        port: Number(process.env.DB_PORT!),
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        database: process.env.DB_NAME!,
    };

    db = new Kysely<DB>({
        dialect: new PostgresDialect({pool: new Pool(dbConfig)}),
    });

    const client = new Client(dbConfig);
    await client.connect();

    await client.query('LISTEN rival_events');
    logger.info('Listening for rival events...');

    client.on('notification', msg => {
        const payload: DatabaseEvent = JSON.parse(msg.payload!);
        handleDatabaseEvent(payload);
    });

    client.on('error', err => {
        logger.error({ err }, 'Database listener error');
    });
}

export function getDbSafe(): Kysely<DB> {
    if (db === null) {
        throw new Error("Database has not been initialized yet.");
    }
    return db;
}