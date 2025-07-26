import {Difficulty} from '@constants/datatable.js';

export const EMBED_COLOUR = parseInt("EB2353", 16);

export const ERROR_COLOUR = parseInt("CC0000", 16);

export const DIFFICULTY_CHOICES = [
    {name: 'かんたん/Easy', value: Difficulty.EASY.toString()},
    {name: 'ふつう/Normal', value: Difficulty.NORMAL.toString()},
    {name: 'むずかしい/Hard', value: Difficulty.HARD.toString()},
    {name: 'おに/Oni', value: Difficulty.ONI.toString()},
    {name: 'おに (裏)/Ura Oni', value: Difficulty.URA.toString()}
]

export enum BattleWinCondition {
    SCORE = 'score',
    ACCURACY = 'accuracy',
    GOOD_COUNT = 'good_count',
    OK_COUNT = 'ok_count',
    MISS_COUNT = 'miss_count',
    DRUMROLL_COUNT = 'drumroll_count',
    COMBO_COUNT = 'combo_count',
}

export const BattleWinConditionLabel = {
    [BattleWinCondition.SCORE]: 'Score (Highest) (Default)',
    [BattleWinCondition.ACCURACY]: 'Accuracy (Highest)',
    [BattleWinCondition.GOOD_COUNT]: 'Good Count (Highest)',
    [BattleWinCondition.OK_COUNT]: 'Ok Count (Lowest)',
    [BattleWinCondition.MISS_COUNT]: 'Miss Count (Lowest)',
    [BattleWinCondition.DRUMROLL_COUNT]: 'Drum Roll (Highest)',
    [BattleWinCondition.COMBO_COUNT]: 'Max Combo (Highest)'
};