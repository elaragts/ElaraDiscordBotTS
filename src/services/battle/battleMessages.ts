import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from 'discord.js';
import {BattleWinConditionLabel, BattleWinDirection, BattleWinDirectionLabel, EMBED_COLOUR} from '@constants/discord.js';
import {crownIdToEmoji, difficultyToEmoji, judgeIdToEmoji, rankIdToEmoji} from '@utils/config.js';
import type {SongPlay} from '@models/queries.js';
import type {BattlePlayer, BattleRequest, BattleSubmissionState, BattleWinner} from '@services/battle/types.js';

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
    players: BattlePlayer[];
    latestJoinedName?: string;
};

export function getJudgementLine(request: BattleRequest): string {
    const direction = request.invertWinConditionLogic ? BattleWinDirection.LOWEST : BattleWinDirection.HIGHEST;
    return `### Judgement: ${BattleWinConditionLabel[request.winCondition]} (${BattleWinDirectionLabel[direction]})`;
}

export function buildJoinComponents(playerCount = 1) {
    return [
        new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(JOIN_BATTLE_ID)
                    .setLabel('Join Battle')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(playerCount >= 4),
                new ButtonBuilder()
                    .setCustomId(START_BATTLE_ID)
                    .setLabel('Start Battle')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(playerCount < 2),
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
    const joinedLine = context.latestJoinedName === undefined
        ? ''
        : `\n### ${context.latestJoinedName} has joined the battle!`;

    return {
        title: formatBattleTitle(context.players),
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: `${buildSongHeader(context.request)}\n${getJudgementLine(context.request)}\n### Players (${context.players.length}/4)\n${formatPlayerList(context.players)}${joinedLine}`,
    };
}

// no longer used with 2+ player battle
export function buildConfirmEmbed(context: BattleMessageContext) {
    return {
        title: formatBattleTitle(context.players),
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: `${buildSongHeader(context.request)}\n${getJudgementLine(context.request)}\n### Players (${context.players.length}/4)\n${formatPlayerList(context.players)}`,
    };
}

export function buildInProgressEmbed(context: BattleMessageContext) {
    return {
        title: formatBattleTitle(context.players),
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: `${buildSongHeader(context.request)}\n${getJudgementLine(context.request)}\n### Instructions:\n1. set number of games to \`1\` in the service menu\n2. go to Liked Songs and find \`${context.request.songName}\`\n3. press submit button once you finish playing (and go back to attract screen)`,
    };
}

export function buildSubmissionEmbed(
    context: BattleMessageContext,
    state: BattleSubmissionState,
    winner?: BattleWinner,
) {
    const resultLine = winner === undefined
        ? '### Match Ongoing'
        : winner.isDraw
            ? '### Draw!'
            : `### ${winner.winnerName} wins!`;

    return {
        title: formatBattleTitle(context.players),
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: `${buildSongHeader(context.request)}\n${getJudgementLine(context.request)}\n${resultLine}`,
        fields: context.players.map(player => ({
            name: player.name,
            value: formatSongPlay(state[player.baid]),
            inline: true,
        })),
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
        title: `${playerOneName} VS. ???`,
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: 'Battle Cancelled (No one joined)',
    };
}

export function buildSubmissionTimedOutEmbed(players: BattlePlayer[]) {
    return {
        title: formatBattleTitle(players),
        color: EMBED_COLOUR,
        author: {name: BATTLE_COMMAND_NAME},
        description: "Battle Ended, Someone didn't submit a score in time",
    };
}

function buildSongHeader(request: BattleRequest): string {
    return `## ${request.songName} ${difficultyToEmoji(request.difficulty)}★${request.songStars}`;
}

function formatBattleTitle(players: BattlePlayer[]): string {
    const playerNames = players.map(player => player.name);
    if (playerNames.length === 1) {
        return `${playerNames[0]} VS. ???`;
    }

    return playerNames.join(' VS. ');
}

function formatPlayerList(players: BattlePlayer[]): string {
    return players.map((player, index) => `${index + 1}. ${player.name}`).join('\n');
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
