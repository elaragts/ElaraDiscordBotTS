import {Kysely, PostgresDialect} from 'kysely';
import {Pool, types} from 'pg';
import type {DB} from '@models/taiko.d.js';

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
}

export function getDbSafe(): Kysely<DB> {
    if (db === null) {
        throw new Error("Database has not been initialized yet.");
    }
    return db;
}