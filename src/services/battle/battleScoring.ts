import type {BattleWinCondition} from '@constants/discord.js';
import type {SongPlay} from '@models/queries.js';
import type {BattleWinner} from './types.js';

export function calculateAccuracy(play: SongPlay, noteCount: number): number {
    const accuracyCoefficient = 100 / noteCount;
    return play.good_count * accuracyCoefficient + play.ok_count * accuracyCoefficient / 2;
}

export function getBattleWinner(
    playerOnePlay: SongPlay,
    playerTwoPlay: SongPlay,
    winCondition: BattleWinCondition,
    invertWinConditionLogic: boolean,
    playerOneBaid: number,
    playerTwoBaid: number,
    playerOneName: string,
    playerTwoName: string,
): BattleWinner {
    const playerOneValue = playerOnePlay[winCondition];
    const playerTwoValue = playerTwoPlay[winCondition];

    if (playerOneValue === playerTwoValue) {
        return {winnerBaid: -1, isDraw: true};
    }

    const playerOneWins = (!invertWinConditionLogic && playerOneValue > playerTwoValue)
        || (invertWinConditionLogic && playerOneValue < playerTwoValue);

    return {
        winnerBaid: playerOneWins ? playerOneBaid : playerTwoBaid,
        winnerName: playerOneWins ? playerOneName : playerTwoName,
        isDraw: false,
    };
}
