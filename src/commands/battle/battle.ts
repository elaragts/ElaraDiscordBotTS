import {SlashCommandBuilder} from 'discord.js';
import {client} from '@bot/client.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {getMyDonName} from '@database/queries/userData.js';
import {getSongNoteCount, getSongStars, getSongTitle} from '@utils/datatable.js';
import {replyWithErrorMessage, returnSongAutocomplete as autocomplete, validateSongInput} from '@utils/discord.js';
import {
    ALL_CONTEXTS,
    ALL_INTEGRATION_TYPES,
    BattleWinCondition,
    BattleWinConditionLabel,
    BattleWinDirection,
    BattleWinDirectionLabel,
    DIFFICULTY_CHOICES,
} from '@constants/discord.js';
import type {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';
import {BattleSession} from '@services/battle/BattleSession.js';
import type {BattleRequest} from '@services/battle/types.js';

const COMMAND_NAME = 'Battle';

const data = new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Battle against another user')
    .setContexts(ALL_CONTEXTS)
    .setIntegrationTypes(ALL_INTEGRATION_TYPES)
    .addStringOption(option =>
        option.setName('song')
            .setDescription('Song name')
            .setRequired(true)
            .setAutocomplete(true))
    .addStringOption(option =>
        option.setName('difficulty')
            .setDescription('Difficulty of the map')
            .setRequired(true)
            .addChoices(DIFFICULTY_CHOICES)
    )
    .addStringOption(option =>
        option.setName('judgement')
            .setDescription('Judgement condition')
            .setRequired(false)
            .setChoices(
                Object.entries(BattleWinConditionLabel).map(([value, name]) => ({
                    name,
                    value
                }))
            )
    )
    .addStringOption(option =>
        option.setName('direction')
            .setDescription('Highest/Lowest wins')
            .setRequired(false)
            .setChoices(
                Object.entries(BattleWinDirectionLabel).map(([value, name]) => ({
                    name,
                    value
                }))
            ));

async function execute(interaction: ChatInputCommandInteractionExtended) {
    if (client.ongoingBattles.has(interaction.user.id)) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'You are already in a battle');
        return;
    }

    const baid = await getBaidFromDiscordId(interaction.user.id);
    if (baid === undefined) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'You have not linked your discord account to your card yet!');
        return;
    }

    const name = await getMyDonName(baid);

    const request = await buildBattleRequest(interaction);
    if (request === undefined) return;

    await new BattleSession({
        client,
        interaction,
        host: {
            user: interaction.user,
            baid,
            name,
        },
        request,
    }).start();
}

async function buildBattleRequest(interaction: ChatInputCommandInteractionExtended): Promise<BattleRequest | undefined> {
    const songInput = interaction.options.getString('song', true);
    const difficulty = Number.parseInt(interaction.options.getString('difficulty', true), 10);
    const winCondition = (interaction.options.getString('judgement') as BattleWinCondition | null)
        ?? BattleWinCondition.SCORE;
    const winDirectionOption = interaction.options.getString('direction') as BattleWinDirection | null;
    const invertWinConditionLogic = winDirectionOption === BattleWinDirection.LOWEST
        || (winDirectionOption === null && [BattleWinCondition.OK_COUNT, BattleWinCondition.MISS_COUNT].includes(winCondition));

    const songValidationResult = await validateSongInput(interaction, songInput, COMMAND_NAME);
    if (songValidationResult === undefined) return undefined;

    const uniqueId = songValidationResult.uniqueId;
    const songStars = getSongStars(uniqueId, difficulty);
    if (!songStars) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'This song does not have a chart for this difficulty');
        return undefined;
    }

    return {
        uniqueId,
        lang: songValidationResult.lang,
        songName: getSongTitle(uniqueId, songValidationResult.lang),
        difficulty,
        songStars,
        noteCount: getSongNoteCount(uniqueId, difficulty),
        winCondition,
        invertWinConditionLogic,
    };
}

export const command: Command = {
    data,
    execute,
    autocomplete
};
