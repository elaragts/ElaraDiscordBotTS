import {getDbSafe} from '@database/index.js';
import type {BattleLog, BattleStats} from '@models/queries.js';
import {PAGE_LIMIT} from '@constants/common.js';

const PLAYER_BAID_COLUMNS = [
    'player_one_baid',
    'player_two_baid',
    'player_three_baid',
    'player_four_baid',
] as const;

export async function addBattle(uniqueId: number, playerBaids: number[], winner: number) {
    const [baidOne, baidTwo, baidThree = null, baidFour = null] = playerBaids;
    if (baidOne === undefined || baidTwo === undefined) {
        throw new Error('Battle must have at least two players');
    }

    await getDbSafe().insertInto('battle')
        .values({
            'song_number': uniqueId,
            'player_one_baid': baidOne,
            'player_two_baid': baidTwo,
            'player_three_baid': baidThree,
            'player_four_baid': baidFour,
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
        const base = buildPlayerCondition(eb, baid);

        if (opponentBaid !== undefined) {
            return eb.and([
                base,
                buildPlayerCondition(eb, opponentBaid),
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
            const base = eb.and([
                eb('winner_baid', '=', baid),
                buildPlayerCondition(eb, baid),
            ]);

            if (opponentBaid !== undefined) {
                return eb.and([
                    base,
                    buildPlayerCondition(eb, opponentBaid),
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
            'player_three_baid',
            'player_four_baid',
        ])
        .where((eb) => {
            const base = buildPlayerCondition(eb, baid);

            if (opponentBaid !== undefined) {
                return eb.and([
                    base,
                    buildPlayerCondition(eb, opponentBaid),
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
        opponent_baids: [
            row.player_one_baid,
            row.player_two_baid,
            row.player_three_baid,
            row.player_four_baid,
        ].filter((playerBaid): playerBaid is number => playerBaid !== null && playerBaid !== baid),
    }));
}

function buildPlayerCondition(eb: any, baid: number) {
    return eb.or(PLAYER_BAID_COLUMNS.map(column => eb(column, '=', baid)));
}
