import {Difficulty} from '@constants/datatable.js';
import {InteractionContextType} from "discord.js";

export const EMBED_COLOUR = parseInt('EB2353', 16);

export const ERROR_COLOUR = parseInt('CC0000', 16);

export const DIFFICULTY_CHOICES = [
    {name: 'かんたん/Easy', value: Difficulty.EASY.toString()},
    {name: 'ふつう/Normal', value: Difficulty.NORMAL.toString()},
    {name: 'むずかしい/Hard', value: Difficulty.HARD.toString()},
    {name: 'おに/Oni', value: Difficulty.ONI.toString()},
    {name: 'おに (裏)/Ura Oni', value: Difficulty.URA.toString()}
];

export enum GraphTypes {
    PLAYCOUNT = 'playcount',
    RATING = 'rating'
}

export const GRAPH_TYPE_CHOICES = [
    {name: 'Playcount', value: GraphTypes.PLAYCOUNT},
    {name: 'Rating', value: GraphTypes.RATING},
];

export enum DateRangeTypes {
    TO_DATE = 'to_date',
    YEAR = 'year',
    YTD = 'YTD',
    MONTH = 'month',
    MTD = 'MTD',
    TODAY = 'today',
}

export const DATE_RANGE_CHOICES = [
    {name: 'To Date', value: DateRangeTypes.TO_DATE},
    {name: 'Year', value: DateRangeTypes.YEAR},
    {name: 'Year To Date', value: DateRangeTypes.YTD},
    {name: 'Month', value: DateRangeTypes.MONTH},
    {name: 'Month To Date', value: DateRangeTypes.MTD},
    {name: 'Today', value: DateRangeTypes.TODAY},
];


export enum BattleWinCondition {
    SCORE = 'score',
    ACCURACY = 'accuracy',
    GOOD_COUNT = 'good_count',
    OK_COUNT = 'ok_count',
    MISS_COUNT = 'miss_count',
    DRUMROLL_COUNT = 'drumroll_count',
    COMBO_COUNT = 'combo_count',
}

export enum BattleWinDirection {
    HIGHEST = 'HIGHEST',
    LOWEST = 'LOWEST'
}

export const BattleWinConditionLabel = {
    [BattleWinCondition.SCORE]: 'Score',
    [BattleWinCondition.ACCURACY]: 'Accuracy',
    [BattleWinCondition.GOOD_COUNT]: 'Good Count',
    [BattleWinCondition.OK_COUNT]: 'Ok Count',
    [BattleWinCondition.MISS_COUNT]: 'Miss Count',
    [BattleWinCondition.DRUMROLL_COUNT]: 'Drum Roll',
    [BattleWinCondition.COMBO_COUNT]: 'Max Combo'
};

export const BattleWinDirectionLabel = {
    [BattleWinDirection.HIGHEST]: 'Highest',
    [BattleWinDirection.LOWEST]: 'Lowest',
};

export const ALL_CONTEXTS = [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel]