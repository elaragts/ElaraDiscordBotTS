﻿import {ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {
    isUserBoostingServer,
    replyWithErrorMessage,
    returnSongAutocomplete as autocomplete,
    validateSongInput
} from '@utils/discord.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {getFavouriteSongsArray, setFavouriteSongsArray} from '@database/queries/userData.js';
import {getSongTitle} from '@utils/datatable.js';
import {EMBED_COLOUR} from '@constants/discord.js';

const COMMAND_NAME = 'Favourite';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('favourite')
        .setDescription('Add/Remove Songs to Favourite Songs')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song name')
                .setRequired(true)
                .setAutocomplete(true))
    ,
    //handle autocomplete interaction
    autocomplete
    ,
    async execute(interaction: ChatInputCommandInteraction) {
        const songOption = interaction.options.getString('song')!;
        if (!isUserBoostingServer(interaction.user.id)) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, 'You need to be a server booster to use this command!');
            return;
        }
        const baid = await getBaidFromDiscordId(interaction.user.id);
        if (baid === undefined) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, 'You have not linked your discord account to your card yet!');
            return;
        }
        const songValidationResult = await validateSongInput(interaction, songOption, COMMAND_NAME);
        if (songValidationResult === undefined) return;
        const uniqueId = songValidationResult.uniqueId;
        const lang = songValidationResult.lang;
        let favouriteSongs = (await getFavouriteSongsArray(baid))!;
        const i = favouriteSongs.indexOf(uniqueId);
        const songTitle = getSongTitle(uniqueId, lang);
        let message;
        if (i > -1) {
            favouriteSongs.splice(i, 1);
            message = `Successfully Removed \`${songTitle}\``;
        } else {
            favouriteSongs.push(uniqueId);
            message = `Successfully Added \`${songTitle}\``;
        }
        await setFavouriteSongsArray(baid, favouriteSongs);
        const returnEmbed = {
            description: message,
            color: EMBED_COLOUR,
            author: {
                name: COMMAND_NAME
            },
        };
        await interaction.reply({embeds: [returnEmbed]});
    }
};