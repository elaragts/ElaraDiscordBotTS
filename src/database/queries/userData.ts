import {db} from '@database/index.js';
import {CostumeData, UserProfile} from '@models/queries.js';
import {sql} from 'kysely';
import {QueryResult} from 'pg';

export async function getFavouriteSongsArray(baid: number): Promise<number[] | undefined> {
    const row = await db
        .selectFrom('user_data')
        .select(['favorite_songs_array'])
        .where('baid', '=', baid)
        .executeTakeFirst();

    return row?.favorite_songs_array;
}

export async function setFavouriteSongsArray(baid: number, songArray: number[]): Promise<void> {
    await db
        .updateTable('user_data')
        .set({'favorite_songs_array': songArray})
        .where('baid', '=', baid)
        .executeTakeFirst();
}

export async function getCostume(baid: number): Promise<CostumeData | undefined> {
    return await db
        .selectFrom('user_data')
        .select([
            'current_body',
            'current_face',
            'current_head',
            'current_kigurumi',
            'current_puchi',
            'color_body',
            'color_face',
        ])
        .where('baid', '=', baid)
        .executeTakeFirst();
}

export async function getUserProfile(baid: number): Promise<UserProfile | undefined> {
    const result = await
        sql`
            WITH difficulty_cte AS (SELECT baid, achievement_display_difficulty AS new_difficulty
                                    FROM user_data
                                    WHERE baid = ${baid}
                                    UNION
                                    SELECT baid,
                                           CASE
                                               WHEN achievement_display_difficulty = 5
                                                   THEN achievement_display_difficulty - 1
                                               ELSE achievement_display_difficulty
                                               END AS new_difficulty
                                    FROM user_data
                                    WHERE baid = ${baid}
                                      AND achievement_display_difficulty = 5),
                 achievement_panel_cte AS (SELECT s.baid,
                                                  best_score_rank,
                                                  best_crown,
                                                  COUNT(s.baid) AS count
            FROM song_best_data s
                INNER JOIN difficulty_cte d
            ON s.baid = d.baid AND s.difficulty = d.new_difficulty
            GROUP BY s.baid, best_score_rank, best_crown
                ),
                play_count_cte AS (
            SELECT baid, COUNT (baid) AS play_count
            FROM song_play_data
            WHERE baid = ${baid}
            GROUP BY baid
                )
                    , dan_cte AS (
            SELECT baid, MAX (dan_id) AS dan_id, clear_state
            FROM dan_score_data
            WHERE dan_type = 1
              AND baid = ${baid}
              AND clear_state
                > 0
            GROUP BY baid, clear_state

                )
            SELECT ud.my_don_name,
                   ud.title,
                   ud.achievement_display_difficulty,
                   ud.current_body,
                   ud.current_face,
                   ud.current_head,
                   ud.current_kigurumi,
                   ud.current_puchi,
                   ud.color_body,
                   ud.color_face,
                   pc.play_count,
                   d.dan_id,
                   d.clear_state,
                   bsr.bestscorerank_1,
                   bsr.bestscorerank_2,
                   bsr.bestscorerank_3,
                   bsr.bestscorerank_4,
                   bsr.bestscorerank_5,
                   bsr.bestscorerank_6,
                   bsr.bestscorerank_7,
                   bsr.bestscorerank_8,
                   bcr.bestcrown_1,
                   bcr.bestcrown_2,
                   bcr.bestcrown_3
            FROM user_data ud
                     LEFT JOIN (SELECT baid,
                                       SUM(CASE WHEN best_score_rank = 1 THEN count ELSE 0 END) AS bestscorerank_1,
                                       SUM(CASE WHEN best_score_rank = 2 THEN count ELSE 0 END) AS bestscorerank_2,
                                       SUM(CASE WHEN best_score_rank = 3 THEN count ELSE 0 END) AS bestscorerank_3,
                                       SUM(CASE WHEN best_score_rank = 4 THEN count ELSE 0 END) AS bestscorerank_4,
                                       SUM(CASE WHEN best_score_rank = 5 THEN count ELSE 0 END) AS bestscorerank_5,
                                       SUM(CASE WHEN best_score_rank = 6 THEN count ELSE 0 END) AS bestscorerank_6,
                                       SUM(CASE WHEN best_score_rank = 7 THEN count ELSE 0 END) AS bestscorerank_7,
                                       SUM(CASE WHEN best_score_rank = 8 THEN count ELSE 0 END) AS bestscorerank_8
                                FROM achievement_panel_cte
                                WHERE best_score_rank IS NOT NULL
                                GROUP BY baid) AS bsr ON ud.baid = bsr.baid
                     LEFT JOIN (SELECT baid,
                                       SUM(CASE WHEN best_crown = 1 THEN count ELSE 0 END) AS bestcrown_1,
                                       SUM(CASE WHEN best_crown = 2 THEN count ELSE 0 END) AS bestcrown_2,
                                       SUM(CASE WHEN best_crown = 3 THEN count ELSE 0 END) AS bestcrown_3
                                FROM achievement_panel_cte
                                WHERE best_crown IS NOT NULL
                                GROUP BY baid) AS bcr ON ud.baid = bcr.baid
                     LEFT JOIN play_count_cte pc ON ud.baid = pc.baid
                     LEFT JOIN dan_cte d ON ud.baid = d.baid
            WHERE ud.baid = ${baid}
        `.execute(db) as QueryResult<UserProfile>;
    return result.rows.length > 0 ? result.rows[0] : undefined;


}

export async function getMyDonName(baid: number): Promise<string | undefined> {
    const row = await db
        .selectFrom('user_data')
        .select(['my_don_name'])
        .where('baid', '=', baid)
        .executeTakeFirst();

    return row?.my_don_name;

}

export async function doesBaidExist(baid: number): Promise<boolean> {
    const result = await db
        .selectFrom('user_data')
        .select('baid')
        .where('baid', '=', baid)
        .executeTakeFirst();

    return result !== undefined;
}
