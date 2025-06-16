export interface MusicinfoItem {
    id: string;
    uniqueId: number;
    starEasy: number;
    starNormal: number;
    starHard: number;
    starMania: number;
    starUra: number;
    genreNo: number;
    papamama: boolean;
}

export interface SongInfo {
    songTitles: [string, string];
    musicinfo: MusicinfoItem;
}