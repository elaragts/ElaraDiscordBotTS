export type LeaderboardEntry = {
    my_don_name: string,
    baid: number,
    best_score: number,
    best_crown: number,
    best_score_rank: number
}

export type CostumeData = {
    current_body: number;
    current_face: number;
    current_head: number;
    current_kigurumi: number;
    current_puchi: number;
    color_body: number;
    color_face: number;
};

export type MonthlyPlayCount = {
    month: string;
    play_count: number;
};
