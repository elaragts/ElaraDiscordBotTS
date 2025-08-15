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
        .where('rating_date', '<=', date)
        .where((eb) => eb.and([
            eb('baid', '=', baid),
            eb('rating_date', '<=', date),
        ]))
        .orderBy('rating_date', 'desc')
        .executeTakeFirst();
    return result?.rating
}
