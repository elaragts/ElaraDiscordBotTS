import type {MessageComponentInteraction, User} from 'discord.js';
import type {BattleWinCondition} from '@constants/discord.js';
import type {Language} from '@constants/datatable.js';
import type {SongPlay} from '@models/queries.js';

export type BattlePlayer = {
    user: User;
    baid: number;
    name: string;
};

export type BattleRequest = {
    uniqueId: number;
    lang: Language;
    songName: string;
    difficulty: number;
    songStars: number;
    noteCount: number;
    winCondition: BattleWinCondition;
    invertWinConditionLogic: boolean;
};

export type JoinedBattle = {
    interaction: MessageComponentInteraction;
    player: BattlePlayer;
};

export type StartedBattle = {
    interaction: MessageComponentInteraction;
};

export type BattleSubmissionState = {
    playerOnePlay?: SongPlay;
    playerTwoPlay?: SongPlay;
};

export type BattleWinner = {
    winnerBaid: number;
    winnerName?: string;
    isDraw: boolean;
};
