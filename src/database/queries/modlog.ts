import {InsertModLog} from "@models/queries.js";
import {getDbSafe} from "@database/index.js";

export async function insertModLog(data: InsertModLog) {
    return await getDbSafe()
        .insertInto("mod_log")
        .values({
            action_type: data.action_type,
            mod_user_id: data.mod_user_id,
            target_user_id: data.target_user_id,
            reason: data.reason ?? null,
            target_chassis_id: data.target_chassis_id ?? null,
        })
        .returningAll()
        .executeTakeFirst();
}