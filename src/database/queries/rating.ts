import {db} from '@database/index.js';

export async function getUserTop50(baid: number) {
    return await db
        .selectFrom('user_top50')
        .selectAll()
        .where('baid', '=', baid)
        .orderBy('song_rate', 'desc')
        .limit(50)
        .execute();
}

export async function getUserRatingSummary(baid: number) {
    return await db
        .selectFrom('user_rating_summaries')
        .selectAll()
        .where('baid', '=', baid)
        .executeTakeFirst();
}