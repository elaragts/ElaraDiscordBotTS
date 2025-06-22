import {Difficulty} from "../constants/datatable";

export type DifficultyMap<T> = {
    [key in Difficulty]: T;
};

export interface MusicinfoItem {
    id: string;
    uniqueId: number;
    stars: DifficultyMap<number>;
    maxCombos: DifficultyMap<number>;
    genreNo: number;
    papamama: boolean;
}

export interface SongInfo {
    songTitles: [string, string];
    musicinfo: MusicinfoItem;
}

