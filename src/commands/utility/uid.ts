import {SlashCommandBuilder, MessageFlags} from 'discord.js';
import {replyWithErrorMessage, returnSongAutocomplete as autocomplete, validateSongInput} from '@utils/discord.js';
import {getSongInfo} from '@utils/datatable.js';
import {ALL_CONTEXTS, EMBED_COLOUR} from '@constants/discord.js';
import {Language} from '@constants/datatable.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';


const COMMAND_NAME = 'ID';

const data = new SlashCommandBuilder()
    .setName('uid')
    .setDescription('Get Song Id/Song from Id')
    .setContexts(ALL_CONTEXTS)
    .addStringOption(option =>
        option.setName('song')
            .setDescription('Song name')
            .setRequired(false)
            .setAutocomplete(true))
    .addIntegerOption(option =>
        option.setName('id')
            .setDescription('Song UniqueId')
            .setRequired(false)
            .setMinValue(0)
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    const songInput = interaction.options.getString('song');
    const idInput = interaction.options.getInteger('id');
    let uniqueId;
    let lang = Language.JAPANESE;
    if (songInput !== null) {
        const songValidationResult = await validateSongInput(interaction, songInput, COMMAND_NAME);
        if (songValidationResult === undefined) return;
        uniqueId = songValidationResult.uniqueId;
        lang = songValidationResult.lang;
    } else if (idInput !== null) {
        uniqueId = idInput;
    } else {
        await replyWithErrorMessage(interaction, COMMAND_NAME, '曲名かUIDを入力してください');
        return;
    }
    const songInfo = getSongInfo(uniqueId);
    if (songInfo === undefined) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, `uid \`${uniqueId}\` は存在しません`);
        return;
    }
    const returnEmbed = {
        description: `\`${songInfo.songTitles[lang]}\` Unique ID: \`${uniqueId}\` Song ID: \`${songInfo.musicinfo.id}\``,
        color: EMBED_COLOUR,
        author: {
            name: COMMAND_NAME
        },
    };
    await interaction.reply({embeds: [returnEmbed], flags: MessageFlags.Ephemeral});
}

export const command: Command = {
    data,
    execute,
    autocomplete
};