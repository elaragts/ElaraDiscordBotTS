import {db} from '../index';
import {LeaderboardEntry} from "../../models/queries";

export async function getLeaderboard(uniqueId: number, difficulty: number, offset: number): Promise<LeaderboardEntry[]> {
    return await db
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
        .limit(10)
        .offset(offset)
        .execute();
}