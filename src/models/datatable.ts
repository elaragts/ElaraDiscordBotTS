import {Difficulty} from "@constants/datatable.js";

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

export interface InternalDifficultyItem {
    bpm: number;
    bpmChange?: string;
    star: number;
    difficulty: number;
}