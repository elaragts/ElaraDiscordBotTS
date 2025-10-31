import {SlashCommandBuilder, AttachmentBuilder} from 'discord.js';
import {
    editReplyWithErrorMessage,
    returnSongAutocomplete as autocomplete,
    validateSongInput
} from '@utils/discord.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {getBestScore} from '@database/queries/songPlayBestData.js';
import {getSongInternalDifficulty, getSongStars, getSongTitle} from '@utils/datatable.js';
import {difficultyIdToName, getMaxPotentialRatingFromInternalDifficulty} from '@utils/common.js';
import {crownIdToEmoji, difficultyToEmoji, judgeIdToEmoji, rankIdToEmoji} from '@utils/config.js';
import {getCostume} from '@database/queries/userData.js';
import {createCostumeAvatar} from '@utils/costume.js';
import {DIFFICULTY_CHOICES, EMBED_COLOUR} from '@constants/discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';
import {getUserSongRating} from '@database/queries/rating.js';

const COMMAND_NAME = 'My Stats';

const data = new SlashCommandBuilder()
    .setName('mystats')
    .setDescription(COMMAND_NAME)
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
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to obtain the score from')
            .setRequired(false)
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    await interaction.deferReply();
    const songInput = interaction.options.getString('song')!;
    const difficulty = parseInt(interaction.options.getString('difficulty')!);
    let baid;
    let user;
    const userOption = interaction.options.getUser('user');
    if (userOption) {
        baid = await getBaidFromDiscordId(userOption.id);
        if (baid === undefined) {
            await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'This user has not linked their discord account to their card yet!');
            return;
        }
        user = userOption;
    } else {
        user = interaction.user;
        baid = await getBaidFromDiscordId(interaction.user.id);
        if (baid === undefined) {
            await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'You have not linked your discord account to your card yet!');
            return;
        }
    }
    //error checking
    const songValidationResult = await validateSongInput(interaction, songInput, COMMAND_NAME);
    if (songValidationResult === undefined) return;
    const uniqueId = songValidationResult.uniqueId;
    const lang = songValidationResult.lang;
    const song = await getBestScore(uniqueId, difficulty, baid);
    if (song === undefined) {
        const returnEmbed = {
            title: `${user.username} | ${getSongTitle(uniqueId, lang)} | ${difficultyIdToName(difficulty, lang)}${difficultyToEmoji(difficulty)}★${getSongStars(uniqueId, difficulty)}`,
            description: 'No play data available for this song.',
            color: EMBED_COLOUR,

            author: {
                name: COMMAND_NAME
            },
            timestamp: new Date().toISOString()
        };
        await interaction.editReply({embeds: [returnEmbed]});
        return;
    }

    //error checking done
    const rank = rankIdToEmoji(song.score_rank - 2);
    const crown = crownIdToEmoji(song.crown);
    const rating = await getUserSongRating(baid, uniqueId, difficulty) || 0;
    let desc = `${crown}${rank}`;
    let judgement = '';
    judgement += `${judgeIdToEmoji(0)}${song.good_count}\n`;
    judgement += `${judgeIdToEmoji(1)}${song.ok_count}\n`;
    judgement += `${judgeIdToEmoji(2)}${judgeIdToEmoji(3)}${song.miss_count}`;
    let pointsLabel = '点';
    let judgementLabel = '判定';
    let comboLabel = '最大コンボ数';
    let rendaLabel = '連打数';
    let playCountLabel = 'プレイ回数';
    let clearCountLabel = 'ノルマクリア回数';
    let fullComboLabel = 'フルコンボ回数';
    let zenryouLabel = '全良回数';
    let leaderboardLabel = 'EGTSランキング';
    let leaderboardSuffix = '位';
    let ratingLabel = 'レーティング';
    if (lang === 1) {
        pointsLabel = ' points';
        judgementLabel = 'judgement';
        comboLabel = 'Max Combo';
        rendaLabel = 'Drumroll';
        playCountLabel = 'Play Count';
        clearCountLabel = 'Clear Count';
        fullComboLabel = 'Full Combo Count';
        zenryouLabel = 'Donderful Combo Count';
        leaderboardLabel = 'Leaderboard Placement';
        leaderboardSuffix = '';
        ratingLabel = 'Raw Rating';
    }

    //no results
    if (getSongStars(uniqueId, difficulty) === 0) {
        desc = 'This difficulty does not exist.';
    }

    let description = '';
    description += `${leaderboardLabel}: ${song.leaderboard_position}${leaderboardSuffix}`;
    description += `\n${playCountLabel}: ${song.play_count}`;
    description += `\n${clearCountLabel}: ${song.clear_count}`;
    description += `\n${fullComboLabel}: ${song.full_combo_count}`;
    description += `\n${zenryouLabel}: ${song.all_perfect_count}`;
    if (rating > 0) {
        const internalDifficulty = getSongInternalDifficulty(uniqueId, difficulty);
        description += `\n${ratingLabel}: ${Number(rating).toFixed(2)}/${getMaxPotentialRatingFromInternalDifficulty(internalDifficulty).toFixed(2)}`;
    }
    description += `\n## ${desc}${song.score}${pointsLabel}`;


    //construct avatar
    const costumeData = (await getCostume(baid))!;
    const avatar = await createCostumeAvatar(costumeData);
    const attachment = new AttachmentBuilder(avatar, {name: 'avatar.png'});
    //construct embed
    const returnEmbed = {
        title: `${song.my_don_name} | ${getSongTitle(uniqueId, lang)} | ${difficultyIdToName(difficulty, lang)}${difficultyToEmoji(difficulty)}★${getSongStars(uniqueId, difficulty)}`,
        color: EMBED_COLOUR,
        description: description,
        author: {
            name: COMMAND_NAME
        },
        thumbnail: {
            url: 'attachment://avatar.png'
        },
        timestamp: song.play_time.toISOString(),
        fields: [
            {
                name: judgementLabel,
                value: judgement,
                inline: true
            },
            {
                name: '',
                value: `**${comboLabel}:** ${song.combo_count}\n**${rendaLabel}:** ${song.drumroll_count}`,
                inline: true
            }
        ]
    };
    await interaction.editReply({embeds: [returnEmbed], files: [attachment]});
}

export const command: Command = {
    data,
    execute,
    autocomplete
};