import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder} from "discord.js";
import {getBaidFromAccessCode, getBaidFromDiscordId, getDiscordIdFromBaid} from "../../database/queries/userDiscord";
import {replyWithErrorMessage} from "../../utils/discord";
import {linkDiscordToBaid} from "../../database/queries/userDiscord";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("link")
        .setDescription("Links your discord account to an AccessCode")
        .addStringOption(option =>
            option.setName("code")
                .setDescription("accessCode you use to login to TaikoWeb")
                .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.user;
        if (await getBaidFromDiscordId(user.id) !== undefined) {
            await replyWithErrorMessage(interaction, "link", "Your account is already linked to an AccessCode (use /unlink to unlink your account)");
            return;
        }
        const accessCode = interaction.options.getString("code")!;
        const baid = await getBaidFromAccessCode(accessCode);
        if (baid === undefined) {
            await replyWithErrorMessage(interaction, "link", `AccessCode ${accessCode} doesn\'t exist!`);
            return;
        }
        if (await getDiscordIdFromBaid(baid) !== undefined) {
            await replyWithErrorMessage(interaction, "link", "This Taiko profile is already linked to another discord account");
            return;
        }
        await linkDiscordToBaid(user.id, baid);
        await interaction.reply({
            embeds: [{
                title: "Successfully linked discord account",
                color: 13369344,
                author: {
                    name: "Link"
                }
            }], flags: MessageFlags.Ephemeral
        });
    },
};