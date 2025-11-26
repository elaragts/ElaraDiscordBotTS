import {getDbSafe} from '@database/index.js';
import type {LeaderboardEntry, SongPlay} from '@models/queries.js';
import {sql} from 'kysely';
import {Difficulty} from '@constants/datatable.js';
import {PAGE_LIMIT, QueryGranularity} from '@constants/common.js';

export async function getLeaderboard(uniqueId: number, difficulty: number, offset: number): Promise<LeaderboardEntry[]> {
    return await getDbSafe()
        .selectFrom('song_best_data as sbd')
        .innerJoin('user_data as ud', 'sbd.baid', 'ud.baid')
        .select([
            'ud.my_don_name',
            'sbd.baid',
            'sbd.best_score',
            'sbd.best_crown',
            'sbd.best_score_rank'
        ])
        .where('sbd.song_id', '=', uniqueId)
        .where('sbd.difficulty', '=', difficulty)
        .orderBy('sbd.best_score', 'desc')
        .limit(PAGE_LIMIT)
        .offset(offset)
        .execute();
}

export async function getBestScore(uniqueId: number, difficulty: number, baid: number) {
    const score = await getDbSafe()
        .with('count_cte', (qb) =>
            qb
                .selectFrom('song_play_data')
                .select(({fn}) => [
                    'baid',
                    fn.countAll().as('total_count'),
                    sql<number>`SUM(CASE WHEN crown = 1 THEN 1 ELSE 0 END)`.as('clear_count'),
                    sql<number>`SUM(CASE WHEN crown = 2 THEN 1 ELSE 0 END)`.as('full_combo_count'),
                    sql<number>`SUM(CASE WHEN crown = 3 THEN 1 ELSE 0 END)`.as('all_perfect_count'),

                ])
                .where('song_id', '=', uniqueId)
                .where('difficulty', '=', difficulty)
                .where('baid', '=', baid)
                .groupBy('baid')
        )
        .selectFrom(['song_best_data as s'])
        .innerJoin('count_cte as c', 's.baid', 'c.baid')
        .select([
            's.best_score',
            's.best_crown',
            'c.clear_count',
            'c.total_count as play_count',
            'c.full_combo_count',
            'c.all_perfect_count',
        ])
        .where('s.song_id', '=', uniqueId)
        .where('s.difficulty', '=', difficulty)
        .where('s.baid', '=', baid)
        .executeTakeFirst();

    if (!score) return undefined;

    const ret = await getDbSafe()
        .selectFrom('song_play_data as spd')
        .innerJoin('user_data as ud', 'spd.baid', 'ud.baid')
        .innerJoin('card as c', 'spd.baid', 'c.baid')
        .select([
            'ud.my_don_name',
            'spd.play_time',
            'spd.score',
            'spd.combo_count',
            'spd.crown',
            'spd.score_rank',
            'spd.drumroll_count',
            'spd.good_count',
            'spd.miss_count',
            'spd.ok_count',
            'c.access_code',
            sql<number>`(SELECT COUNT(*) + 1
                         FROM song_best_data
                         WHERE song_id = ${uniqueId}
                           AND difficulty = ${difficulty}
                           AND best_score > ${score.best_score})`.as('leaderboard_position'),
        ])
        .where('spd.song_id', '=', uniqueId)
        .where('spd.difficulty', '=', difficulty)
        .where('spd.baid', '=', baid)
        .where('spd.score', '=', score.best_score)
        .orderBy('spd.id')
        .executeTakeFirst();

    if (!ret) return undefined;

    return {
        ...ret,
        crown: score.best_crown,
        play_count: score.play_count,
        clear_count: score.clear_count,
        full_combo_count: score.full_combo_count,
        all_perfect_count: score.all_perfect_count,
    };
}

export async function getPlayCount(
    baid: number,
    granularity: QueryGranularity,
    startDate?: Date,
    endDate?: Date
): Promise<{ period: string; play_count: number }[]> {
    let dateFormat: string;
    switch (granularity) {
        case QueryGranularity.DAY:
            dateFormat = 'YYYY-MM-DD';
            break;
        case QueryGranularity.MONTH:
            dateFormat = 'YYYY-MM';
            break;
        default:
            throw new Error('Unsupported granularity');
    }

    let query = getDbSafe()
        .selectFrom('song_play_data')
        .select([
            sql<string>`TO_CHAR(play_time, ${sql.raw(`'${dateFormat}'`)})`.as('period'),
            sql<number>`COUNT(*)`.as('play_count'),
        ])
        .where('baid', '=', baid);

    if (startDate) {
        query = query.where('play_time', '>=', startDate);
    }
    if (endDate) {
        query = query.where('play_time', '<=', endDate);
    }

    return await query
        .groupBy(sql`TO_CHAR(play_time, ${sql.raw(`'${dateFormat}'`)})`)
        .orderBy('period')
        .execute();
}


export async function getMaxSongPlayDataId(): Promise<number> {
    const row = await getDbSafe()
        .selectFrom('song_play_data')
        .select(({fn}) => fn.max('id').as('max_id'))
        .executeTakeFirst();
    return row?.max_id || 0;
}

export async function getLatestUserPlay(baid: number, uniqueId: number, difficulty: Difficulty): Promise<SongPlay | undefined> {
    const result = await getDbSafe()
        .selectFrom('song_play_data')
        .select([
            'id',
            'score',
            'score_rank',
            'crown',
            'good_count',
            'ok_count',
            'miss_count',
            'drumroll_count',
            'combo_count'
        ])
        .where('baid', '=', baid)
        .where('song_id', '=', uniqueId)
        .where('difficulty', '=', difficulty)
        .orderBy('id', 'desc')
        .executeTakeFirst();

    return result ? {...result, accuracy: 0} : undefined
}