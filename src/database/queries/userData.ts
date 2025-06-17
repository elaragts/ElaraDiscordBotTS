import {db} from "../index";

export async function getFavouriteSongsArray(baid: number): Promise<number[] | undefined> {
    const row = await db
        .selectFrom("user_data")
        .select(["favorite_songs_array"])
        .where("baid", "=", baid)
        .executeTakeFirst();

    return row?.favorite_songs_array;
}

export async function setFavouriteSongsArray(baid: number, songArray: number[]): Promise<void> {
    await db
        .updateTable("user_data")
        .set({"favorite_songs_array": songArray})
        .where("baid", "=", baid)
        .executeTakeFirst();
}