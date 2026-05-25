import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from 'discord.js';
import {BattleWinConditionLabel, BattleWinDirection, BattleWinDirectionLabel, EMBED_COLOUR} from '@constants/discord.js';
import {crownIdToEmoji, difficultyToEmoji, judgeIdToEmoji, rankIdToEmoji} from '@utils/config.js';
import type {SongPlay} from '@models/queries.js';
import type {BattleRequest, BattleSubmissionState, BattleWinner} from './types.js';

export const BATTLE_COMMAND_NAME = 'Battle';
export const JOIN_BATTLE_ID = 'join';
export const CANCEL_BATTLE_ID = 'cancel';
export const START_BATTLE_ID = 'start';
export const SUBMIT_SCORE_ID = 'submit';

export const JOIN_TIMEOUT_MS = 10 * 60 * 1000;
export const CONFIRM_TIMEOUT_MS = 5 * 60 * 1000;
export const SUBMISSION_TIMEOUT_MS = 10 * 60 * 1000;

type BattleMessageContext = {
    request: BattleRequest;
    playerOneName: string;
    playerTwoName?: string;
};

export function getJudgementLine(request: BattleRequest): string {
    const direction = request.invertWinConditionLogic ? BattleWinDirection.LOWEST : BattleWinDirection.HIGHEST;
    return `### Judgement: ${BattleWinConditionLabel[request.winCondition]} (${BattleWinDirectionLabel[direction]})`;
}

export function buildJoinComponents() {
    return [
        new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(JOIN_BATTLE_ID)
                    .setLabel('Join Battle')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(CANCEL_BATTLE_ID)
                    .setLabel('Cancel Battle')
                    .setStyle(ButtonStyle.Danger),
            )
    ];
}

export function buildConfirmComponents() {
    return [
        new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(START_BATTLE_ID)
                    .setLabel('Start Battle')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(CANCEL_BATTLE_ID)
                    .setLabel('Cancel Battle')
                    .setStyle(ButtonStyle.Danger),
            )
    ];
}

export function buildSubmitComponents() {
    return [
        new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(SUBMIT_SCORE_ID)
                    .setLabel('Submit Score')
                    .setStyle(ButtonStyle.Success),
            )
    ];
}

export function buildJoinEmbed(context: BattleMessageContext) {
    return {
        title: `${context.playerOneName} VS. TBD`,
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: `${buildSongHeader(context.request)}\n${getJudgementLine(context.request)}\n`,
    };
}

export function buildConfirmEmbed(context: Required<BattleMessageContext>) {
    return {
        title: `${context.playerOneName} VS. ${context.playerTwoName}`,
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: `${buildSongHeader(context.request)}\n${getJudgementLine(context.request)}\n### ${context.playerTwoName} has joined the battle!`,
    };
}

export function buildInProgressEmbed(context: Required<BattleMessageContext>) {
    return {
        title: `${context.playerOneName} VS. ${context.playerTwoName}`,
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: `${buildSongHeader(context.request)}\n${getJudgementLine(context.request)}\n### Instructions:\n1. set number of games to \`1\` in the service menu\n2. go to Liked Songs and find \`${context.request.songName}\`\n3. press submit button once you finish playing (and go back to attract screen)`,
    };
}

export function buildSubmissionEmbed(
    context: Required<BattleMessageContext>,
    state: BattleSubmissionState,
    winner?: BattleWinner,
) {
    const resultLine = winner === undefined
        ? '### Match Ongoing'
        : winner.isDraw
            ? '### Draw!'
            : `### ${winner.winnerName} wins!`;

    return {
        title: `${context.playerOneName} VS. ${context.playerTwoName}`,
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: `${buildSongHeader(context.request)}\n${getJudgementLine(context.request)}\n${resultLine}`,
        fields: [
            {
                name: context.playerOneName,
                value: formatSongPlay(state.playerOnePlay),
                inline: true
            },
            {
                name: context.playerTwoName,
                value: formatSongPlay(state.playerTwoPlay),
                inline: true
            }
        ]
    };
}

export function buildCancelledEmbed(title: string) {
    return {
        title,
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: 'Battle Cancelled',
    };
}

export function buildJoinTimedOutEmbed(playerOneName: string) {
    return {
        title: `${playerOneName} VS. TBD`,
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: 'Battle Cancelled (No one joined)',
    };
}

export function buildSubmissionTimedOutEmbed(playerOneName: string, playerTwoName: string) {
    return {
        title: `${playerOneName} VS. ${playerTwoName}`,
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: "Battle Ended, Someone didn't submit a score in time",
    };
}

function buildSongHeader(request: BattleRequest): string {
    return `## ${request.songName} ${difficultyToEmoji(request.difficulty)}★${request.songStars}`;
}

function formatSongPlay(play?: SongPlay): string {
    if (play === undefined) {
        return 'No score submitted';
    }

    return `${crownIdToEmoji(play.crown)}${rankIdToEmoji(play.score_rank - 2)} ${play.score}
${judgeIdToEmoji(0)}${play.good_count}
${judgeIdToEmoji(1)}${play.ok_count}
${judgeIdToEmoji(2)}${judgeIdToEmoji(3)}${play.miss_count}
**Max Combo:** ${play.combo_count}
**Max Drumroll:** ${play.drumroll_count}
**Accuracy:** ${play.accuracy.toFixed(2)}%`;
}
