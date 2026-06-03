import {MessageFlags, type InteractionResponse, type MessageComponentInteraction} from 'discord.js';
import type {ClientExtended, ChatInputCommandInteractionExtended} from '@models/discord.js';
import type {BattlePlayer, BattleRequest, BattleSubmissionState, JoinedBattle, StartedBattle} from './types.js';
import {
    buildCancelledEmbed,
    buildConfirmComponents,
    buildConfirmEmbed,
    buildInProgressEmbed,
    buildJoinComponents,
    buildJoinEmbed,
    buildJoinTimedOutEmbed,
    buildSubmissionEmbed,
    buildSubmissionTimedOutEmbed,
    buildSubmitComponents,
    CANCEL_BATTLE_ID,
    CONFIRM_TIMEOUT_MS,
    JOIN_BATTLE_ID,
    JOIN_TIMEOUT_MS,
    START_BATTLE_ID,
    SUBMISSION_TIMEOUT_MS,
    SUBMIT_SCORE_ID,
} from './battleMessages.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {getFavouriteSongsArray, getMyDonName, setFavouriteSongsArray} from '@database/queries/userData.js';
import {getLatestUserPlay, getMaxSongPlayDataId} from '@database/queries/songPlayBestData.js';
import {addBattle} from '@database/queries/battle.js';
import {calculateAccuracy, getBattleWinner} from './battleScoring.js';
import logger from '@utils/logger.js';
import type {SongPlay} from '@models/queries.js';

type BattleSessionArgs = {
    client: ClientExtended;
    interaction: ChatInputCommandInteractionExtended;
    host: BattlePlayer;
    request: BattleRequest;
};

export class BattleSession {
    private readonly client: ClientExtended;
    private readonly interaction: ChatInputCommandInteractionExtended;
    private readonly host: BattlePlayer;
    private readonly request: BattleRequest;
    private readonly reservedUserIds = new Set<string>();
    private readonly originalFavouriteSongs = new Map<number, number[]>();

    public constructor(args: BattleSessionArgs) {
        this.client = args.client;
        this.interaction = args.interaction;
        this.host = args.host;
        this.request = args.request;
    }

    public async start(): Promise<void> {
        this.reservePlayer(this.host.user.id);

        try {
            const response = await this.interaction.reply({
                embeds: [buildJoinEmbed({request: this.request, playerOneName: this.host.name})],
                components: buildJoinComponents().map(row => row.toJSON()),
            });

            const joined = await this.waitForJoin(response);
            if (joined === undefined) return;

            this.reservePlayer(joined.player.user.id);

            const started = await this.waitForHostConfirmation(response, joined);
            if (started === undefined) return;

            await this.runBattle(response, started, joined.player);
        } finally {
            await this.restoreFavouriteSongs();
            this.releasePlayers();
        }
    }

    private async waitForJoin(response: InteractionResponse): Promise<JoinedBattle | undefined> {
        return new Promise(resolve => {
            let settled = false;
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
                        embeds: [buildCancelledEmbed(`${this.host.name} VS. TBD`)],
                        components: [],
                    });
                    collector.stop('battle_canceled');
                    resolve(undefined);
                    return;
                }

                if (interaction.customId !== JOIN_BATTLE_ID) {
                    return;
                }

                const joiner = await this.validateJoiner(interaction);
                if (joiner === undefined) return;

                settled = true;
                collector.stop('battle_joined');
                resolve({interaction, player: joiner});
            });

            collector.on('end', async (_, reason) => {
                if (!settled && reason === 'time') {
                    settled = true;
                    await this.interaction.editReply({
                        embeds: [buildJoinTimedOutEmbed(this.host.name)],
                        components: [],
                    });
                    resolve(undefined);
                }
            });
        });
    }

    private async waitForHostConfirmation(
        response: InteractionResponse,
        joined: JoinedBattle,
    ): Promise<StartedBattle | undefined> {
        await joined.interaction.update({
            embeds: [buildConfirmEmbed({
                request: this.request,
                playerOneName: this.host.name,
                playerTwoName: joined.player.name,
            })],
            components: buildConfirmComponents().map(row => row.toJSON()),
        });

        return new Promise(resolve => {
            let settled = false;
            const allowedUserIds = [this.host.user.id, joined.player.user.id];
            const collector = response.createMessageComponentCollector({
                filter: interaction => allowedUserIds.includes(interaction.user.id),
                time: CONFIRM_TIMEOUT_MS,
            });

            collector.on('collect', async interaction => {
                if (interaction.customId === START_BATTLE_ID) {
                    if (interaction.user.id !== this.host.user.id) {
                        await interaction.reply({content: 'Only the host can start the battle', flags: MessageFlags.Ephemeral});
                        return;
                    }

                    settled = true;
                    collector.stop('battle_started');
                    resolve({interaction});
                    return;
                }

                if (interaction.customId === CANCEL_BATTLE_ID) {
                    if (interaction.user.id !== this.host.user.id) {
                        await interaction.reply({content: 'Only the host can cancel the battle', flags: MessageFlags.Ephemeral});
                        return;
                    }

                    settled = true;
                    await interaction.update({
                        embeds: [buildCancelledEmbed(`${this.host.name} VS. ${joined.player.name}`)],
                        components: [],
                    });
                    collector.stop('battle_canceled');
                    resolve(undefined);
                }
            });

            collector.on('end', async (_, reason) => {
                if (!settled && reason === 'time') {
                    settled = true;
                    await this.interaction.editReply({
                        embeds: [buildCancelledEmbed(`${this.host.name} VS. ${joined.player.name}`)],
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
        challenger: BattlePlayer,
    ): Promise<void> {
        const minSongPlayId = await getMaxSongPlayDataId();
        await this.replaceFavouriteSongs(this.host.baid);
        await this.replaceFavouriteSongs(challenger.baid);

        const context = {
            request: this.request,
            playerOneName: this.host.name,
            playerTwoName: challenger.name,
        };

        await started.interaction.update({
            embeds: [buildInProgressEmbed(context)],
            components: buildSubmitComponents().map(row => row.toJSON()),
        });

        const state: BattleSubmissionState = {};

        await new Promise<void>(resolve => {
            const collector = response.createMessageComponentCollector({
                filter: interaction => [this.host.user.id, challenger.user.id].includes(interaction.user.id),
                time: SUBMISSION_TIMEOUT_MS,
            });

            collector.on('collect', async interaction => {
                if (interaction.customId !== SUBMIT_SCORE_ID) return;

                const submission = await this.getSubmission(interaction, challenger, minSongPlayId, state);
                if (submission === undefined) return;

                if (interaction.user.id === this.host.user.id) {
                    state.playerOnePlay = submission;
                } else {
                    state.playerTwoPlay = submission;
                }

                const winner = state.playerOnePlay !== undefined && state.playerTwoPlay !== undefined
                    ? getBattleWinner(
                        state.playerOnePlay,
                        state.playerTwoPlay,
                        this.request.winCondition,
                        this.request.invertWinConditionLogic,
                        this.host.baid,
                        challenger.baid,
                        this.host.name,
                        challenger.name,
                    )
                    : undefined;

                await interaction.update({
                    embeds: [buildSubmissionEmbed(context, state, winner)],
                    components: winner === undefined ? buildSubmitComponents().map(row => row.toJSON()) : [],
                });

                if (winner !== undefined) {
                    await addBattle(this.request.uniqueId, this.host.baid, challenger.baid, winner.winnerBaid);
                    collector.stop('battle_finished');
                }
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'time') {
                    await this.interaction.editReply({
                        embeds: [buildSubmissionTimedOutEmbed(this.host.name, challenger.name)],
                        components: [],
                    });
                }
                resolve();
            });
        });
    }

    private async validateJoiner(interaction: MessageComponentInteraction): Promise<BattlePlayer | undefined> {
        if (interaction.user.id === this.host.user.id) {
            await interaction.reply({content: 'You can\'t join your own battle!', flags: MessageFlags.Ephemeral});
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
        challenger: BattlePlayer,
        minSongPlayId: number,
        state: BattleSubmissionState,
    ): Promise<SongPlay | undefined> {
        const isHost = interaction.user.id === this.host.user.id;
        if ((isHost && state.playerOnePlay !== undefined) || (!isHost && state.playerTwoPlay !== undefined)) {
            await interaction.reply({content: 'You already submitted a score', flags: MessageFlags.Ephemeral});
            return undefined;
        }

        const baid = isHost ? this.host.baid : challenger.baid;
        const songPlay = await getLatestUserPlay(baid, this.request.uniqueId, this.request.difficulty);
        if (songPlay === undefined || songPlay.id <= minSongPlayId) {
            await interaction.reply({content: 'No score submitted', flags: MessageFlags.Ephemeral});
            return undefined;
        }

        return {
            ...songPlay,
            accuracy: calculateAccuracy(songPlay, this.request.noteCount),
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
        this.originalFavouriteSongs.set(baid, this.cleanFavouriteSongs(original ?? []));
        await setFavouriteSongsArray(baid, [this.request.uniqueId]);
    }

    private async restoreFavouriteSongs(): Promise<void> {
        for (const [baid, songs] of this.originalFavouriteSongs.entries()) {
            await setFavouriteSongsArray(baid, songs);
        }
        this.originalFavouriteSongs.clear();
    }

    private cleanFavouriteSongs(songs: number[]): number[] {
        if (!songs.some(song => !Number.isFinite(song))) {
            return songs;
        }

        logger.warn(`Favourite songs array contains invalid number(s): ${songs}`);
        return songs.filter(song => Number.isFinite(song));
    }
}
