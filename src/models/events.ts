import {Difficulty} from "@constants/datatable.js";

export enum DATABASE_EVENT_TYPE {
    USER_BEATS_RIVAL = 'user_beats_rival',
    RIVAL_BEATS_USER = 'rival_beats_user',
}

export type RivalScoreNotificationData = {
    song_id: number,
    difficulty: Difficulty
    user_baid: number
    rival_baid: number
    user_score: number
    rival_score: number
    user_rank: number
    rival_rank: number
    user_leaderboard_position: number
    rival_leaderboard_position: number
    user_leaderboard_position_delta: number
    rival_leaderboard_position_delta: number
}
export type DatabaseEvent = {
    type: DATABASE_EVENT_TYPE
    data: RivalScoreNotificationData
}