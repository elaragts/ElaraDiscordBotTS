import {db} from "../index";
import {CostumeData} from "../../models/queries";

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

export async function getCostume(baid: number): Promise<CostumeData | undefined> {
    return await db
        .selectFrom("user_data")
        .select([
            "current_body",
            "current_face",
            "current_head",
            "current_kigurumi",
            "current_puchi",
            "color_body",
            "color_face",
        ])
        .where("baid", "=", baid)
        .executeTakeFirst();
}

export async function GetMyDonName(baid: number): Promise<string | undefined> {
    const row = await db
        .selectFrom('user_data')
        .select(['my_don_name'])
        .where('baid', '=', baid)
        .executeTakeFirst();

    return row?.my_don_name;

}