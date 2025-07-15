import {Difficulty, Genre, Language} from "@constants/datatable.js";

function isEnumValueInRange<T extends Record<string, string | number>>(enumObj: T, value: number): boolean {
    return Object.values(enumObj)
        .filter(v => typeof v === "number")
        .includes(value);
}


export function genreNumberToName(genreNo: Genre, lang: Language): string {
    if (!isEnumValueInRange(Genre, genreNo)) {
        throw new Error("Invalid genre");
    }
    if (!isEnumValueInRange(Language, lang)) {
        throw new Error("Invalid language");
    }
    switch (lang) {
        case Language.JAPANESE: switch (genreNo) {
            case Genre.POP: return 'ポップス'
            case Genre.ANIME: return 'アニメ'
            case Genre.KIDS: return 'キッズ'
            case Genre.VOCALOID: return 'ボーカロイド™曲'
            case Genre.GAME: return 'ゲームミュージック'
            case Genre.NAMCO_ORIGINAL: return 'ナムコオリジナル'
            case Genre.VARIETY: return 'バラエティ'
            case Genre.CLASSICAL: return 'クラシック'
        }
        case Language.ENGLISH: switch (genreNo) {
            case Genre.POP: return 'POP'
            case Genre.ANIME: return 'Anime'
            case Genre.KIDS: return 'Kids\''
            case Genre.VOCALOID: return 'VOCALOID™ Music'
            case Genre.GAME: return 'Game Music'
            case Genre.NAMCO_ORIGINAL: return 'NAMCO Original'
            case Genre.VARIETY: return 'Variety'
            case Genre.CLASSICAL: return 'Classical'
        }
    }
}

export function difficultyIdToName(difficulty: Difficulty, lang: Language): string {
    if (!isEnumValueInRange(Difficulty, difficulty)) {
        throw new Error("Invalid difficulty");
    }
    if (!isEnumValueInRange(Language, lang)) {
        throw new Error("Invalid language");
    }
    switch (lang) {
        case Language.JAPANESE: switch (difficulty) {
            case Difficulty.EASY: return 'かんたん';
            case Difficulty.NORMAL: return 'ふつう';
            case Difficulty.HARD: return 'むずかしい';
            case Difficulty.ONI: return 'おに';
            case Difficulty.URA: return 'おに（裏）';
        }
        case Language.ENGLISH: switch (difficulty) {
            case Difficulty.EASY: return 'Easy';
            case Difficulty.NORMAL: return 'Normal';
            case Difficulty.HARD: return 'Hard';
            case Difficulty.ONI: return 'Oni';
            case Difficulty.URA: return 'Ura Oni';
        }
    }
}

export function danIdToName(rankId: number): string {
    switch(rankId) {
        case 1:
            return '五級';
        case 2:
            return '四級';
        case 3:
            return '三級';
        case 4:
            return '二級';
        case 5:
            return '一級';
        case 6:
            return '初段';
        case 7:
            return '二段';
        case 8:
            return '三段';
        case 9:
            return '四段';
        case 10:
            return '五段';
        case 11:
            return '六段';
        case 12:
            return '七段';
        case 13:
            return '八段';
        case 14:
            return '九段';
        case 15:
            return '十段';
        case 16:
            return '玄人';
        case 17:
            return '名人';
        case 18:
            return '超人';
        case 19:
            return '達人';
        default:
            return '';
    }
}