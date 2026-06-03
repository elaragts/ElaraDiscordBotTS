import type {BattleWinCondition} from '@constants/discord.js';
import type {SongPlay} from '@models/queries.js';
import type {BattlePlayer, BattleWinner} from '@services/battle/types.js';

type BattleSubmission = {
    player: BattlePlayer;
    play: SongPlay;
};

export function calculateAccuracy(play: SongPlay, noteCount: number): number {
    const accuracyCoefficient = 100 / noteCount;
    return play.good_count * accuracyCoefficient + play.ok_count * accuracyCoefficient / 2;
}

export function getBattleWinner(
    submissions: BattleSubmission[],
    winCondition: BattleWinCondition,
    invertWinConditionLogic: boolean,
): BattleWinner {
    const sortedSubmissions = [...submissions].sort((a, b) => {
        const aValue = a.play[winCondition];
        const bValue = b.play[winCondition];

        return invertWinConditionLogic
            ? aValue - bValue
            : bValue - aValue;
    });
    const winningSubmission = sortedSubmissions[0];
    if (winningSubmission === undefined) {
        return {winnerBaid: -1, isDraw: true};
    }

    const winningValue = winningSubmission.play[winCondition];
    const tiedWinners = sortedSubmissions.filter(submission => submission.play[winCondition] === winningValue);
    if (tiedWinners.length > 1) {
        return {winnerBaid: -1, isDraw: true};
    }

    return {
        winnerBaid: winningSubmission.player.baid,
        winnerName: winningSubmission.player.name,
        isDraw: false,
    };
}
