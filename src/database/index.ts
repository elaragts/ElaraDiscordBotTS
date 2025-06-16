import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';
import type { DB } from '../models/taiko.d.ts';


export const db = new Kysely<DB>({
    dialect: new PostgresDialect({
        pool: new Pool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        }),
    }),
});

//parse Int8 as TS number
types.setTypeParser(20, val => parseInt(val, 10));