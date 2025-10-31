import {db} from '@database/index.js';
import {Difficulty} from "@constants/datatable.js";

export async function getUserTop50(baid: number) {
    return await db
        .selectFrom('user_top_50')
        .selectAll()
        .where('baid', '=', baid)
        .orderBy('song_rate', 'desc')
        .limit(50)
        .execute();
}

export async function getUserRatingSummary(baid: number) {
    return await db
        .selectFrom('user_rating_summary')
        .selectAll()
        .where('baid', '=', baid)
        .executeTakeFirst();
}

export async function getUserRatingHistory(
    baid: number,
    startDate?: Date,
    endDate?: Date
) {
    let query = db
        .selectFrom('user_rating_history')
        .selectAll()
        .where('baid', '=', baid);

    if (startDate) {
        query = query.where('rating_date', '>=', startDate);
    }

    if (endDate) {
        query = query.where('rating_date', '<=', endDate);
    }

    return await query
        .orderBy('rating_date', 'asc')
        .execute();
}

export async function getUserRatingBeforeDate(baid: number, date: Date) {
    const result =  await db
        .selectFrom('user_rating_history')
        .select('rating')
        .where((eb) => eb.and([
            eb('baid', '=', baid),
            eb('rating_date', '<=', date),
        ]))
        .orderBy('rating_date', 'desc')
        .executeTakeFirst();
    return result?.rating
}

export async function getUserSongRating(baid: number, song_id: number, difficulty: Difficulty) {
    const result = await db
        .selectFrom('user_song_rate')
        .select('song_rate')
        .where((eb) => eb.and([
            eb('baid', '=', baid),
            eb('song_id', '=', song_id),
            eb('external_difficulty', '=', difficulty)
            ]))
        .executeTakeFirst();

    return result?.song_rate;
}
