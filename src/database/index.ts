import {Kysely, PostgresDialect} from 'kysely';
import {Pool, types} from 'pg';
import type {DB} from '@models/taiko.d.js';


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

// int8[] → number[]
// @ts-ignore (for some reason the id enum doesn't have int8[] id)
types.setTypeParser(1016, val =>
    val
        .slice(1, -1)         // remove curly braces {}
        .split(',')           // split into elements
        .map(n => parseInt(n, 10))
);