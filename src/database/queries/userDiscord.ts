import {getDbSafe} from '@database/index.js';

export async function getBaidFromAccessCode(accessCode: string): Promise<number | undefined> {
    const row = await getDbSafe()
        .selectFrom('card')
        .select(['baid'])
        .where('access_code', '=', accessCode)
        .executeTakeFirst();

    return row?.baid;
}

export async function getBaidFromDiscordId(discordId: string): Promise<number | undefined> {
    const row = await getDbSafe()
        .selectFrom('user_discord')
        .select(['baid'])
        .where('discord_id', '=', discordId)
        .executeTakeFirst();

    return row?.baid;
}

export async function getDiscordIdFromBaid(baid: number): Promise<string | undefined> {
    const row = await getDbSafe()
        .selectFrom('user_discord')
        .select(['discord_id'])
        .where('baid', '=', baid)
        .executeTakeFirst();

    return row?.discord_id;
}

export async function linkDiscordToBaid(discordId: string, baid: number): Promise<void> {
    await getDbSafe()
        .insertInto('user_discord')
        .values({
            baid: baid,
            discord_id: discordId,
        })
        .executeTakeFirst();
}

export async function unlinkDiscordFromBaid(discordId: string): Promise<void> {
    await getDbSafe()
        .deleteFrom('user_discord')
        .where('discord_id', '=', discordId)
        .executeTakeFirst();
}