import {SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction} from "discord.js";
import {replyWithErrorMessage, returnSongAutocomplete as autocomplete, validateSongInput} from "../../utils/discord";
import {getSongInfo} from "../../utils/datatable";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("uid")
        .setDescription("Get Song Id/Song from Id")
        .addStringOption(option =>
            option.setName("song")
                .setDescription("Song name")
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName("id")
                .setDescription("Song UniqueId")
                .setRequired(false)
                .setMinValue(0)
        )
    ,
    async execute(interaction: ChatInputCommandInteraction) {
        const songInput = interaction.options.getString("song");
        const idInput = interaction.options.getInteger("id");
        let uniqueId;
        let lang = 0;
        if (songInput !== null) {
            const songValidationResult = await validateSongInput(interaction, songInput, "Uid");
            if (songValidationResult === undefined) return;
            [uniqueId, lang] = songValidationResult;
        } else if (idInput !== null) {
            uniqueId = idInput;
        } else {
            await replyWithErrorMessage(interaction, "uid", "曲名かUIDを入力してください");
            return;
        }
        const songInfo = getSongInfo(uniqueId);
        if (songInfo === undefined) {
            await replyWithErrorMessage(interaction, "uid", `uid \`${uniqueId}\` は存在しません`);
            return;
        }
        const returnEmbed = {
            description: `\`${songInfo.songTitles[lang]}\` Unique ID: \`${uniqueId}\` Song ID: \`${songInfo.musicinfo.id}\``,
            color: 15410003,
            author: {
                name: "uid"
            },
        };
        await interaction.reply({embeds: [returnEmbed], flags: MessageFlags.Ephemeral});
    },
    autocomplete
};