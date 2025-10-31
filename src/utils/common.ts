import {Difficulty, Genre, Language} from "@constants/datatable.js";
import { DateRangeTypes } from "@constants/discord.js";
import {startOfDay, startOfMonth, startOfYear, subDays} from 'date-fns';

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


export function getDateRangeFromType(type: DateRangeTypes): { startDate: Date, endDate: Date } {
    const now = new Date();
    const startOfToday = startOfDay(now)
    switch (type) {
        case DateRangeTypes.TO_DATE:
            return { startDate: new Date(0), endDate: startOfToday };
        case DateRangeTypes.YEAR:
            return { startDate: startOfDay(subDays(now, 365)), endDate: startOfToday };
        case DateRangeTypes.YTD:
            return { startDate: startOfYear(now), endDate: startOfToday };
        case DateRangeTypes.MONTH:
            return { startDate: startOfDay(subDays(now, 30)), endDate: startOfToday };
        case DateRangeTypes.MTD:
            return { startDate: startOfMonth(now), endDate: startOfToday };
        case DateRangeTypes.TODAY:
            return { startDate: startOfDay(now), endDate: startOfToday };
        default:
            return { startDate: new Date(0), endDate: startOfToday };
    }

}

export function getMaxPotentialRatingFromInternalDifficulty(interalDifficulty: number): number {
    const RATING_COEFFICIENT = Math.PI
    const DIFFICULTY_POWER = 1.268
    const MAX_RANK_BONUS = 1.15 //SSS+ (全良)
    const MAX_RESULT_BONUS = 1.05 //Full Combo
    return RATING_COEFFICIENT * (interalDifficulty ** DIFFICULTY_POWER) * MAX_RANK_BONUS * MAX_RESULT_BONUS
}