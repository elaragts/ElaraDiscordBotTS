import {getDbSafe} from '@database/index.js';
import type {BattleLog, BattleStats} from '@models/queries.js';
import {PAGE_LIMIT} from '@constants/common.js';

export async function addBattle(uniqueId: number, baidOne: number, baidTwo: number, winner: number) {
    await getDbSafe().insertInto('battle')
        .values({
            'song_number': uniqueId,
            'player_one_baid': baidOne,
            'player_two_baid': baidTwo,
            'winner_baid': winner,
            'battle_at': new Date().toISOString()
        })
        .executeTakeFirst();
}

export async function getBattleStats(
    baid: number,
    opponentBaid?: number
): Promise<BattleStats> {
    const battleConditions = (eb: any) => {
        const base = eb.or([
            eb('player_one_baid', '=', baid),
            eb('player_two_baid', '=', baid),
        ]);

        if (opponentBaid !== undefined) {
            return eb.and([
                base,
                eb.or([
                    eb('player_one_baid', '=', opponentBaid),
                    eb('player_two_baid', '=', opponentBaid),
                ]),
            ]);
        }

        return base;
    };

    const totalBattlesQuery = getDbSafe()
        .selectFrom('battle')
        .select(({fn}) => fn.countAll().as('total_battles'))
        .where(battleConditions);

    const totalWinsQuery = getDbSafe()
        .selectFrom('battle')
        .select(({fn}) => fn.countAll().as('total_wins'))
        .where((eb) => {
            const base = eb('winner_baid', '=', baid);

            if (opponentBaid !== undefined) {
                return eb.and([
                    base,
                    eb.or([
                        eb('player_one_baid', '=', opponentBaid),
                        eb('player_two_baid', '=', opponentBaid),
                    ]),
                ]);
            }

            return base;
        });

    const result = await getDbSafe()
        .selectFrom([
            totalBattlesQuery.as('battles_count'),
            totalWinsQuery.as('wins_count'),
        ])
        .select([
            'battles_count.total_battles',
            'wins_count.total_wins',
        ])
        .executeTakeFirst();

    return {
        total_battles: Number(result?.total_battles ?? 0),
        battles_won: Number(result?.total_wins ?? 0),
    };
}
export async function getLatestBattles(
    baid: number,
    options: {
        opponentBaid?: number;
        offset?: number;
    }
): Promise<BattleLog[]> {
    const { opponentBaid, offset = 0 } = options ?? {};

    const query = getDbSafe()
        .selectFrom('battle')
        .select([
            'winner_baid',
            'battle_at',
            'player_one_baid',
            'player_two_baid',
        ])
        .where((eb) => {
            const base = eb.or([
                eb('player_one_baid', '=', baid),
                eb('player_two_baid', '=', baid),
            ]);

            if (opponentBaid !== undefined) {
                return eb.and([
                    base,
                    eb.or([
                        eb('player_one_baid', '=', opponentBaid),
                        eb('player_two_baid', '=', opponentBaid),
                    ]),
                ]);
            }

            return base;
        })
        .orderBy('battle_at', 'desc')
        .offset(offset)
        .limit(PAGE_LIMIT);

    const rawResults = await query.execute();

    return rawResults.map(row => ({
        winner_baid: row.winner_baid,
        battle_at: row.battle_at,
        opponent_baid: opponentBaid ?? (
            row.player_one_baid === baid
                ? row.player_two_baid
                : row.player_one_baid
        ),
    }));
}
