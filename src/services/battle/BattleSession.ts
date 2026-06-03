import {MessageFlags, type InteractionResponse, type MessageComponentInteraction} from 'discord.js';
import type {ClientExtended, ChatInputCommandInteractionExtended} from '@models/discord.js';
import type {BattlePlayer, BattleRequest, BattleSubmissionState, StartedBattle} from '@services/battle/types.js';
import {
    buildCancelledEmbed,
    buildInProgressEmbed,
    buildJoinComponents,
    buildJoinEmbed,
    buildJoinTimedOutEmbed,
    buildSubmissionEmbed,
    buildSubmissionTimedOutEmbed,
    buildSubmitComponents,
    CANCEL_BATTLE_ID,
    JOIN_BATTLE_ID,
    JOIN_TIMEOUT_MS,
    START_BATTLE_ID,
    SUBMISSION_TIMEOUT_MS,
    SUBMIT_SCORE_ID,
} from '@services/battle/battleMessages.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {getFavouriteSongsArray, getMyDonName, setFavouriteSongsArray} from '@database/queries/userData.js';
import {getLatestUserPlay, getMaxSongPlayDataId} from '@database/queries/songPlayBestData.js';
import {addBattle} from '@database/queries/battle.js';
import {calculateAccuracy, getBattleWinner} from '@services/battle/battleScoring.js';
import type {SongPlay} from '@models/queries.js';

const MIN_BATTLE_PLAYERS = 2;
const MAX_BATTLE_PLAYERS = 4;

type BattleSessionArgs = {
    client: ClientExtended;
    interaction: ChatInputCommandInteractionExtended;
    host: BattlePlayer;
    request: BattleRequest;
};

export class BattleSession {
    private static readonly activeSessions = new Set<BattleSession>();

    private readonly client: ClientExtended;
    private readonly interaction: ChatInputCommandInteractionExtended;
    private readonly host: BattlePlayer;
    private readonly request: BattleRequest;
    private readonly reservedUserIds = new Set<string>();
    private readonly originalFavouriteSongs = new Map<number, number[]>();
    private restorePromise?: Promise<void>;

    public constructor(args: BattleSessionArgs) {
        this.client = args.client;
        this.interaction = args.interaction;
        this.host = args.host;
        this.request = args.request;
    }

    public async start(): Promise<void> {
        BattleSession.activeSessions.add(this);
        this.reservePlayer(this.host.user.id);

        try {
            const response = await this.interaction.reply({
                embeds: [buildJoinEmbed({request: this.request, players: [this.host]})],
                components: buildJoinComponents().map(row => row.toJSON()),
            });

            const started = await this.waitForPlayers(response);
            if (started === undefined) return;

            await this.runBattle(response, started);
        } finally {
            await this.restoreFavouriteSongs();
            this.releasePlayers();
            BattleSession.activeSessions.delete(this);
        }
    }

    public static async restoreActiveFavouriteSongs(): Promise<void> {
        await Promise.all([...BattleSession.activeSessions].map(session => session.restoreFavouriteSongs()));
    }

    private async waitForPlayers(response: InteractionResponse): Promise<StartedBattle | undefined> {
        return new Promise(resolve => {
            let settled = false;
            const players = [this.host];
            const collector = response.createMessageComponentCollector({
                filter: () => true,
                time: JOIN_TIMEOUT_MS,
            });

            collector.on('collect', async interaction => {
                if (interaction.customId === CANCEL_BATTLE_ID) {
                    if (interaction.user.id !== this.host.user.id) {
                        await interaction.reply({content: 'Only the host can cancel the battle', flags: MessageFlags.Ephemeral});
                        return;
                    }

                    settled = true;
                    await interaction.update({
                        embeds: [buildCancelledEmbed(this.formatBattleTitle(players))],
                        components: [],
                    });
                    collector.stop('battle_canceled');
                    resolve(undefined);
                    return;
                }

                if (interaction.customId === START_BATTLE_ID) {
                    if (interaction.user.id !== this.host.user.id) {
                        await interaction.reply({content: 'Only the host can start the battle', flags: MessageFlags.Ephemeral});
                        return;
                    }

                    if (players.length < MIN_BATTLE_PLAYERS) {
                        await interaction.reply({content: 'At least one opponent must join before starting the battle', flags: MessageFlags.Ephemeral});
                        return;
                    }

                    settled = true;
                    collector.stop('battle_started');
                    resolve({interaction, players: [...players]});
                    return;
                }

                if (interaction.customId !== JOIN_BATTLE_ID) {
                    return;
                }

                if (players.length >= MAX_BATTLE_PLAYERS) {
                    await interaction.reply({content: 'This battle is already full', flags: MessageFlags.Ephemeral});
                    return;
                }

                const joiner = await this.validateJoiner(interaction, players);
                if (joiner === undefined) return;

                players.push(joiner);
                this.reservePlayer(joiner.user.id);
                await interaction.update({
                    embeds: [buildJoinEmbed({
                        request: this.request,
                        players,
                        latestJoinedName: joiner.name,
                    })],
                    components: buildJoinComponents(players.length).map(row => row.toJSON()),
                });
            });

            collector.on('end', async (_, reason) => {
                if (!settled && reason === 'time') {
                    settled = true;
                    await this.interaction.editReply({
                        embeds: players.length < MIN_BATTLE_PLAYERS
                            ? [buildJoinTimedOutEmbed(this.host.name)]
                            : [buildCancelledEmbed(this.formatBattleTitle(players))],
                        components: [],
                    });
                    resolve(undefined);
                }
            });
        });
    }

    private async runBattle(
        response: InteractionResponse,
        started: StartedBattle,
    ): Promise<void> {
        const minSongPlayId = await getMaxSongPlayDataId();
        for (const player of started.players) {
            await this.replaceFavouriteSongs(player.baid);
        }

        const context = {
            request: this.request,
            players: started.players,
        };

        await started.interaction.update({
            embeds: [buildInProgressEmbed(context)],
            components: buildSubmitComponents().map(row => row.toJSON()),
        });

        const state: BattleSubmissionState = {};

        await new Promise<void>(resolve => {
            const collector = response.createMessageComponentCollector({
                filter: interaction => started.players.some(player => player.user.id === interaction.user.id),
                time: SUBMISSION_TIMEOUT_MS,
            });

            collector.on('collect', async interaction => {
                if (interaction.customId !== SUBMIT_SCORE_ID) return;

                const submission = await this.getSubmission(interaction, started.players, minSongPlayId, state);
                if (submission === undefined) return;

                state[submission.player.baid] = submission.play;

                const submittedPlays = started.players
                    .map(player => {
                        const play = state[player.baid];
                        return play === undefined ? undefined : {player, play};
                    })
                    .filter(submission => submission !== undefined);
                const winner = submittedPlays.length === started.players.length
                    ? getBattleWinner(
                        submittedPlays,
                        this.request.winCondition,
                        this.request.invertWinConditionLogic,
                    )
                    : undefined;

                await interaction.update({
                    embeds: [buildSubmissionEmbed(context, state, winner)],
                    components: winner === undefined ? buildSubmitComponents().map(row => row.toJSON()) : [],
                });

                if (winner !== undefined) {
                    await addBattle(this.request.uniqueId, started.players.map(player => player.baid), winner.winnerBaid);
                    collector.stop('battle_finished');
                }
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'time') {
                    await this.interaction.editReply({
                        embeds: [buildSubmissionTimedOutEmbed(started.players)],
                        components: [],
                    });
                }
                resolve();
            });
        });
    }

    private async validateJoiner(
        interaction: MessageComponentInteraction,
        players: BattlePlayer[],
    ): Promise<BattlePlayer | undefined> {
        if (players.some(player => player.user.id === interaction.user.id)) {
            await interaction.reply({content: 'You are already in this battle!', flags: MessageFlags.Ephemeral});
            return undefined;
        }

        if (this.client.ongoingBattles.has(interaction.user.id)) {
            await interaction.reply({content: 'You are already in a battle!', flags: MessageFlags.Ephemeral});
            return undefined;
        }

        const baid = await getBaidFromDiscordId(interaction.user.id);
        if (baid === undefined) {
            await interaction.reply({content: 'You haven\'t linked your account yet', flags: MessageFlags.Ephemeral});
            return undefined;
        }

        const name = await getMyDonName(baid);
        if (name === undefined) {
            await interaction.reply({content: 'Could not find your Donder profile', flags: MessageFlags.Ephemeral});
            return undefined;
        }

        return {
            user: interaction.user,
            baid,
            name,
        };
    }

    private async getSubmission(
        interaction: MessageComponentInteraction,
        players: BattlePlayer[],
        minSongPlayId: number,
        state: BattleSubmissionState,
    ): Promise<{player: BattlePlayer; play: SongPlay} | undefined> {
        const player = players.find(battlePlayer => battlePlayer.user.id === interaction.user.id);
        if (player === undefined) {
            await interaction.reply({content: 'You are not in this battle', flags: MessageFlags.Ephemeral});
            return undefined;
        }

        if (state[player.baid] !== undefined) {
            await interaction.reply({content: 'You already submitted a score', flags: MessageFlags.Ephemeral});
            return undefined;
        }

        const songPlay = await getLatestUserPlay(player.baid, this.request.uniqueId, this.request.difficulty);
        if (songPlay === undefined || songPlay.id <= minSongPlayId) {
            await interaction.reply({content: 'No score submitted', flags: MessageFlags.Ephemeral});
            return undefined;
        }

        return {
            player,
            play: {
                ...songPlay,
                accuracy: calculateAccuracy(songPlay, this.request.noteCount),
            },
        };
    }

    private reservePlayer(userId: string): void {
        this.reservedUserIds.add(userId);
        this.client.ongoingBattles.add(userId);
    }

    private releasePlayers(): void {
        for (const userId of this.reservedUserIds) {
            this.client.ongoingBattles.delete(userId);
        }
        this.reservedUserIds.clear();
    }

    private async replaceFavouriteSongs(baid: number): Promise<void> {
        const original = await getFavouriteSongsArray(baid);
        this.originalFavouriteSongs.set(baid, original ?? []);
        await setFavouriteSongsArray(baid, [this.request.uniqueId]);
    }

    private async restoreFavouriteSongs(): Promise<void> {
        this.restorePromise ??= this.restoreFavouriteSongsOnce();
        await this.restorePromise;
    }

    private async restoreFavouriteSongsOnce(): Promise<void> {
        try {
            for (const [baid, songs] of this.originalFavouriteSongs.entries()) {
                await setFavouriteSongsArray(baid, songs);
            }
        } finally {
            this.originalFavouriteSongs.clear();
        }
    }

    private formatBattleTitle(players: BattlePlayer[]): string {
        if (players.length === 1) {
            return `${players[0].name} VS. ???`;
        }

        return players.map(player => player.name).join(' VS. ');
    }
}
