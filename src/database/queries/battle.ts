import {db} from '@database/index.js';

export async function addBattle(uniqueId: number, baidOne: number, baidTwo: number, winner: number) {
    await db.insertInto('battle')
        .values({
            'song_number': uniqueId,
            'player_one_baid': baidOne,
            'player_two_baid': baidTwo,
            'winner_baid': winner,
            'battle_at': new Date().toISOString()
        })
        .executeTakeFirst();
}