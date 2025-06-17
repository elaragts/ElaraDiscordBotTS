import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {
    isUserBoostingServer,
    replyWithErrorMessage,
    returnSongAutocomplete as autocomplete,
    validateSongInput
} from "../../utils/discord";
import {getBaidFromDiscordId} from "../../database/queries/userDiscord";
import {getFavouriteSongsArray, setFavouriteSongsArray} from "../../database/queries/userData";
import {getSongTitle} from "../../utils/datatable";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("favourite")
        .setDescription("Add/Remove Songs to Favourite Songs")
        .addStringOption(option =>
            option.setName("song")
                .setDescription("Song name")
                .setRequired(true)
                .setAutocomplete(true))
    ,
    //handle autocomplete interaction
    autocomplete
    ,
    async execute(interaction: ChatInputCommandInteraction) {
        if (!isUserBoostingServer(interaction.user.id)) {
            await replyWithErrorMessage(interaction, "Favourite", "You need to be a server booster to use this command!");
            return;
        }
        const baid = await getBaidFromDiscordId(interaction.user.id);
        if (baid === undefined) {
            await replyWithErrorMessage(interaction, "Favourite", "You have not linked your discord account to your card yet!");
            return;
        }
        const songValidationResult = await validateSongInput(interaction, interaction.options.getString("song")!, "Favourite");
        if (songValidationResult === undefined) return;
        const [uniqueId, lang] = songValidationResult;
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
            color: 15410003,
            author: {
                name: "Favourite"
            },
        };
        await interaction.reply({embeds: [returnEmbed]});
    }
};