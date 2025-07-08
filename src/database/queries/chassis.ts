import {db} from "../index";
import {PgError} from "../../models/errors"

export async function getChassisIdFromDiscordId(discordId: string): Promise<number | undefined> {
    const row = await db
        .selectFrom("chassis")
        .select(["chassis_id"])
        .where("discord_id", "=", discordId)
        .executeTakeFirst();

    return row?.chassis_id;
}

export async function getDiscordIdFromChassisId(chassisId: number): Promise<string | undefined> {
    const row = await db
        .selectFrom("chassis")
        .select(["discord_id"])
        .where("chassis_id", "=", chassisId)
        .executeTakeFirst();
    return row?.discord_id;
}

export async function getChassisIdStatus(chassisId: number): Promise<boolean | undefined> {
    const row = await db
        .selectFrom("chassis")
        .select(["active"])
        .where("chassis_id", "=", chassisId)
        .executeTakeFirst();
    return row?.active;
}

export async function setChassisStatus(chassisId: number, status: boolean): Promise<void> {
    await db
        .updateTable("chassis")
        .set({ active: status })
        .where("chassis_id", "=", chassisId)
        .execute();
}

export async function deleteChassisById(chassisId: number): Promise<number> {
    const result = await db
        .deleteFrom("chassis")
        .where("chassis_id", "=", chassisId)
        .executeTakeFirst();

    return Number(result.numDeletedRows) ?? 0;
}

export async function generateAndRegisterChassis(discordId: string): Promise<string> {
    const randomString = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    const chassisId = "284111" + randomString;
    try {
        await db
            .insertInto('chassis')
            .values({
                "chassis_id": parseInt(chassisId),
                "discord_id": discordId,
                "active": true
            })
            .executeTakeFirst();
        return chassisId
    } catch (err) {
        if ((err as PgError).code === "23505") {
            return generateAndRegisterChassis(discordId);
        } else {
            throw err;
        }
    }
}