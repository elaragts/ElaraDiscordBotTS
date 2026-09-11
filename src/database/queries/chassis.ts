import {createHash, randomBytes, randomInt} from 'node:crypto';
import {sql, type Transaction} from 'kysely';
import {getDbSafe} from '@database/index.js';
import type {DB} from '@models/taiko.d.js';
import type {ChassisItem, UserChassisChassisListItem, UserChassisUserListItem} from '@models/queries.js';

const CHASSIS_ID_PREFIX = '284111';
const CHASSIS_ID_ATTEMPTS = 10;
const CHASSIS_SECRET_PATTERN = /^elar_[A-Za-z0-9_-]{43}$/;
const AUTH_FAILURE_LIMIT = 10;
const AUTH_FAILURE_WINDOW_MS = 60_000;
const authenticationFailures = new Map<string, {count: number; resetAt: number}>();

export type OwnedChassis = {
    active: boolean;
    chassis_id: number;
    created_at: Date;
    nickname: string | null;
    secret: string | null;
    secret_rotated_at: Date | null;
};

export type CreatedChassis = {
    chassisId: number;
    nickname: string | null;
    secret: string;
};

export type CreateChassisResult =
    | {created: CreatedChassis; count: number; limit: number}
    | {created: null; count: number; limit: number};

export function generateChassisSecret(): string {
    return `elar_${randomBytes(32).toString('base64url')}`;
}

export function hashChassisSecret(secret: string): string {
    return `sha256$${createHash('sha256').update(secret, 'utf8').digest('hex')}`;
}

export function isValidChassisSecret(secret: string): boolean {
    return CHASSIS_SECRET_PATTERN.test(secret);
}

export async function listChassisByOwner(discordId: string): Promise<OwnedChassis[]> {
    return await getDbSafe()
        .selectFrom('chassis')
        .select(['active', 'chassis_id', 'created_at', 'nickname', 'secret', 'secret_rotated_at'])
        .where('discord_id', '=', discordId)
        .orderBy('created_at', 'asc')
        .orderBy('chassis_id', 'asc')
        .execute();
}

export async function getChassisIdsByDiscordId(discordId: string): Promise<number[]> {
    const rows = await getDbSafe()
        .selectFrom('chassis')
        .select('chassis_id')
        .where('discord_id', '=', discordId)
        .orderBy('created_at', 'asc')
        .orderBy('chassis_id', 'asc')
        .execute();
    return rows.map(row => row.chassis_id);
}

export async function getChassisByIdForOwner(chassisId: number, discordId: string): Promise<OwnedChassis | undefined> {
    return await getDbSafe()
        .selectFrom('chassis')
        .select(['active', 'chassis_id', 'created_at', 'nickname', 'secret', 'secret_rotated_at'])
        .where('chassis_id', '=', chassisId)
        .where('discord_id', '=', discordId)
        .executeTakeFirst();
}

export async function getEffectiveChassisLimit(discordId: string): Promise<number> {
    const row = await getDbSafe()
        .selectFrom('discord_chassis_limit')
        .select('max_chassis_count')
        .where('discord_id', '=', discordId)
        .executeTakeFirst();
    return row?.max_chassis_count ?? 1;
}

async function insertChassisWithUniqueId(
    trx: Transaction<DB>,
    discordId: string,
    nickname: string | null,
    secretHash: string
): Promise<number> {
    for (let attempt = 0; attempt < CHASSIS_ID_ATTEMPTS; attempt++) {
        const chassisId = Number(`${CHASSIS_ID_PREFIX}${String(randomInt(0, 1_000_000)).padStart(6, '0')}`);
        const inserted = await trx
            .insertInto('chassis')
            .values({
                active: true,
                chassis_id: chassisId,
                discord_id: discordId,
                nickname,
                secret: secretHash,
                secret_rotated_at: new Date()
            })
            .onConflict(conflict => conflict.column('chassis_id').doNothing())
            .returning('chassis_id')
            .executeTakeFirst();
        if (inserted) return inserted.chassis_id;
    }
    throw new Error(`Unable to allocate a chassis ID after ${CHASSIS_ID_ATTEMPTS} attempts`);
}

export async function createChassisForOwner(discordId: string, nickname: string | null): Promise<CreateChassisResult> {
    return await getDbSafe().transaction().execute(async trx => {
        // The advisory lock also serializes users with no override row, for whom SELECT FOR UPDATE cannot lock anything.
        await sql`select pg_advisory_xact_lock(hashtext(${discordId}))`.execute(trx);
        const limitRow = await trx
            .selectFrom('discord_chassis_limit')
            .select('max_chassis_count')
            .where('discord_id', '=', discordId)
            .forUpdate()
            .executeTakeFirst();
        const limit = limitRow?.max_chassis_count ?? 1;
        const countRow = await trx
            .selectFrom('chassis')
            .select(({fn}) => fn.countAll<number>().as('count'))
            .where('discord_id', '=', discordId)
            .executeTakeFirstOrThrow();
        const count = Number(countRow.count);
        if (count >= limit) return {created: null, count, limit};

        const secret = generateChassisSecret();
        const chassisId = await insertChassisWithUniqueId(trx, discordId, nickname, hashChassisSecret(secret));
        return {created: {chassisId, nickname, secret}, count: count + 1, limit};
    });
}

export async function renameChassisForOwner(chassisId: number, discordId: string, nickname: string | null) {
    return await getDbSafe()
        .updateTable('chassis')
        .set({nickname})
        .where('chassis_id', '=', chassisId)
        .where('discord_id', '=', discordId)
        .returning(['chassis_id', 'nickname'])
        .executeTakeFirst();
}

export async function resetChassisSecretForOwner(chassisId: number, discordId: string) {
    const secret = generateChassisSecret();
    const row = await getDbSafe()
        .updateTable('chassis')
        .set({secret: hashChassisSecret(secret), secret_rotated_at: new Date()})
        .where('chassis_id', '=', chassisId)
        .where('discord_id', '=', discordId)
        .returning(['active', 'chassis_id', 'nickname'])
        .executeTakeFirst();
    return row ? {...row, secret} : undefined;
}

export async function authenticateChassis(secretHash: string) {
    return await getDbSafe()
        .selectFrom('chassis')
        .selectAll()
        .where('secret', '=', secretHash)
        .where('active', '=', true)
        .executeTakeFirst();
}

/** Validates and authenticates a submitted plaintext secret with a generic failure result. */
export async function authenticateChassisSecret(secret: string, rateLimitKey: string) {
    const now = Date.now();
    const failures = authenticationFailures.get(rateLimitKey);
    if (failures && failures.resetAt > now && failures.count >= AUTH_FAILURE_LIMIT) return undefined;
    if (failures && failures.resetAt <= now) authenticationFailures.delete(rateLimitKey);

    const chassis = isValidChassisSecret(secret)
        ? await authenticateChassis(hashChassisSecret(secret))
        : undefined;
    if (chassis) {
        authenticationFailures.delete(rateLimitKey);
        return chassis;
    }
    const current = authenticationFailures.get(rateLimitKey);
    authenticationFailures.set(rateLimitKey, current && current.resetAt > now
        ? {...current, count: current.count + 1}
        : {count: 1, resetAt: now + AUTH_FAILURE_WINDOW_MS});
    return undefined;
}

export async function getDiscordIdFromChassisId(chassisId: number): Promise<string | undefined> {
    const row = await getDbSafe().selectFrom('chassis').select('discord_id').where('chassis_id', '=', chassisId).executeTakeFirst();
    return row?.discord_id;
}

export async function getChassisIdStatus(chassisId: number): Promise<boolean | undefined> {
    const row = await getDbSafe().selectFrom('chassis').select('active').where('chassis_id', '=', chassisId).executeTakeFirst();
    return row?.active;
}

export async function setChassisStatus(chassisId: number, status: boolean): Promise<void> {
    await getDbSafe().updateTable('chassis').set({active: status}).where('chassis_id', '=', chassisId).execute();
}

export async function setAllChassisStatusByDiscordId(discordId: string, status: boolean): Promise<number[]> {
    const rows = await getDbSafe()
        .updateTable('chassis')
        .set({active: status})
        .where('discord_id', '=', discordId)
        .where('active', '!=', status)
        .returning('chassis_id')
        .execute();
    return rows.map(row => row.chassis_id);
}

export async function deleteChassisById(chassisId: number): Promise<number> {
    const result = await getDbSafe().deleteFrom('chassis').where('chassis_id', '=', chassisId).executeTakeFirst();
    return Number(result.numDeletedRows) ?? 0;
}

export async function getUserChassisList(chassisId: number, offset: number): Promise<UserChassisUserListItem[]> {
    return await getDbSafe().selectFrom('user_chassis')
        .innerJoin('user_data', 'user_chassis.baid', 'user_data.baid')
        .leftJoin('user_discord', 'user_chassis.baid', 'user_discord.baid')
        .select(['user_chassis.baid as baid', 'user_data.my_don_name as my_don_name', 'user_discord.discord_id as discord_id', 'user_chassis.last_used as last_used'])
        .where('user_chassis.chassis_id', '=', chassisId).limit(10).offset(offset).execute();
}

export async function getUserUsedChassisList(baid: number, offset: number): Promise<UserChassisChassisListItem[]> {
    return await getDbSafe().selectFrom('user_chassis')
        .leftJoin('chassis', 'chassis.chassis_id', 'user_chassis.chassis_id')
        .select(['user_chassis.chassis_id as chassis_id', 'chassis.discord_id as discord_id', 'user_chassis.last_used as last_used'])
        .where('user_chassis.baid', '=', baid).limit(10).offset(offset).execute();
}

export async function getAllActiveChassis(): Promise<ChassisItem[]> {
    return await getDbSafe().selectFrom('chassis').selectAll().where('active', '=', true).execute();
}
