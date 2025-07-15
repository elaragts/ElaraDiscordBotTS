import {SlashCommandBuilder} from 'discord.js';
import {returnSongAutocomplete as autocomplete, validateSongInput} from '@utils/discord.js';
import {getLeaderboard} from '@database/queries/songPlayBestData.js';
import {crownIdToEmoji, difficultyToEmoji, rankIdToEmoji} from '@utils/config.js';
import {getDiscordIdFromBaid} from '@database/queries/userDiscord.js';
import {getSongStars, getSongTitle} from '@utils/datatable.js';
import {difficultyIdToName} from '@utils/common.js';
import {EMBED_COLOUR} from '@constants/discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';

const COMMAND_NAME = 'Leaderboard';

const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Song leaderboard')
    .addStringOption(option =>
        option.setName('song')
            .setDescription('Song name')
            .setRequired(true)
            .setAutocomplete(true))
    .addStringOption(option =>
        option.setName('difficulty')
            .setDescription('Difficulty of the map')
            .setRequired(true)
            .addChoices(
                {name: 'かんたん/Easy', value: '1'},
                {name: 'ふつう/Normal', value: '2'},
                {name: 'むずかしい/Hard', value: '3'},
                {name: 'おに/Oni', value: '4'},
                {name: 'おに (裏)/Ura Oni', value: '5'}
            )
    )
    .addIntegerOption(option =>
        option.setName('page')
            .setDescription('Leaderboard Page')
            .setRequired(false)
            .setMinValue(1)
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    const songInput = interaction.options.getString('song')!;
    const difficulty = parseInt(interaction.options.getString('difficulty')!);
    const page = interaction.options.getInteger('page') || 1;
    //error checking
    const songValidationResult = await validateSongInput(interaction, songInput, COMMAND_NAME);
    if (songValidationResult === undefined) return;
    const uniqueId = songValidationResult.uniqueId;
    const lang = songValidationResult.lang;
    //error checking done
    const leaderboard = await getLeaderboard(uniqueId, difficulty, (page - 1) * 10); //taiko DB query result
    let desc = '';

    //iterate over taiko DB return value and create text for the embed ({i}. {player}: :crown:{score})
    for (let i in leaderboard) {
        const crown = crownIdToEmoji(leaderboard[i].best_crown);
        const rank = rankIdToEmoji(leaderboard[i].best_score_rank - 2);
        let name;
        let discordId = await getDiscordIdFromBaid(leaderboard[i].baid);
        if (discordId === undefined) name = leaderboard[i].my_don_name;
        else name = `<@${discordId}>`;
        desc += `${(page - 1) * 10 + parseInt(i) + 1}. ${name}: ${crown}${rank}${leaderboard[i].best_score}\n`;
    }
    //no results
    if (leaderboard.length === 0) {
        if (getSongStars(uniqueId, difficulty) === 0) {
            desc = 'This difficulty does not exist.';
        } else {
            desc = 'No best score data';
        }
    }

    //construct embed
    const returnEmbed = {
        title: `${getSongTitle(uniqueId, lang)} | ${difficultyIdToName(difficulty, lang)}${difficultyToEmoji(difficulty)}★${getSongStars(uniqueId, difficulty)}`,
        description: desc,
        color: EMBED_COLOUR,
        author: {
            name: COMMAND_NAME
        },
        timestamp: new Date().toISOString()
    };
    await interaction.reply({embeds: [returnEmbed]});
}

export const command: Command = {
    data,
    execute,
    autocomplete
};

