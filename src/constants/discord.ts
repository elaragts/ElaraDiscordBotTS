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