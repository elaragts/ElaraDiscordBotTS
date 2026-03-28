import {getDbSafe} from "@database/index.js";

export async function isUserRival(baid: number, rivalBaid: number) {
    const result = await getDbSafe()
        .selectFrom('user_rival')
        .select('baid')
        .where('baid', '=', baid)
        .where('rival_baid', '=', rivalBaid)
        .executeTakeFirst();

    return result !== undefined;
}

export async function addUserRival(baid: number, rivalBaid: number) {

    const inserted = await getDbSafe()
        .insertInto('user_rival')
        .values({ baid, rival_baid: rivalBaid })
        .onConflict((oc) => oc.columns(['baid', 'rival_baid']).doNothing())
        .returning('baid')
        .executeTakeFirst();

    return inserted !== undefined;
}

export async function removeUserRival(baid: number, rivalBaid: number) {
    const deleted = await getDbSafe()
        .deleteFrom('user_rival')
        .where('baid', '=', baid)
        .where('rival_baid', '=', rivalBaid)
        .returning('baid')
        .executeTakeFirst();

    return deleted !== undefined;
}

export async function getUserRivalCount(baid: number): Promise<number> {
    const result = await getDbSafe()
        .selectFrom('user_rival')
        .select(({ fn }) => fn.count<number>('rival_baid').as('count'))
        .where('baid', '=', baid)
        .executeTakeFirst();

    return Number(result?.count ?? 0);
}

