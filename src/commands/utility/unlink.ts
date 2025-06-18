import {SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction} from "discord.js";
import {getBaidFromDiscordId, unlinkDiscordFromBaid} from "../../database/queries/userDiscord";
import {replyWithErrorMessage} from "../../utils/discord";


module.exports = {
    data: new SlashCommandBuilder()
        .setName("unlink")
        .setDescription("Unlinks your discord account to an AccessCode")
    ,
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.user;
        if (await getBaidFromDiscordId(user.id) === undefined) {
            await replyWithErrorMessage(interaction, "link", "Your account is not linked to an EGTS profile yet");
            return;
        }

        await unlinkDiscordFromBaid(user.id);
        await interaction.reply({
            embeds: [{
                title: "Successfully unlinked discord account",
                color: 13369344,
                author: {
                    name: "Unlink"
                }
            }], flags: MessageFlags.Ephemeral
        });
    },
};