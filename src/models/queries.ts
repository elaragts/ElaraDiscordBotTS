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

export type UserProfile = {
    my_don_name: string;
    title: string;
    achievement_display_difficulty: number;
    current_body: number;
    current_face: number;
    current_head: number;
    current_kigurumi: number;
    current_puchi: number;
    color_body: number;
    color_face: number;
    play_count: number;
    dan_id: number;
    clear_state: number;
    bestscorerank_1: number;
    bestscorerank_2: number;
    bestscorerank_3: number;
    bestscorerank_4: number;
    bestscorerank_5: number;
    bestscorerank_6: number;
    bestscorerank_7: number;
    bestscorerank_8: number;
    bestcrown_1: number;
    bestcrown_2: number;
    bestcrown_3: number;
}

export type SongPlay = {
    id: number;
    combo_count: number;
    crown: number;
    drumroll_count: number;
    good_count: number;
    miss_count: number;
    ok_count: number;
    score: number;
    score_rank: number;
}

export type UserChassisUserListItem = {
    baid: number;
    my_don_name: string;
    discord_id: string | null;
    last_used: Date;
}
export type UserChassisChassisListItem = {
    chassis_id: number;
    discord_id: string | null;
    last_used: Date;
}
