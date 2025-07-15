import {SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction} from 'discord.js';
import {getBaidFromDiscordId, unlinkDiscordFromBaid} from '@database/queries/userDiscord.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {EMBED_COLOUR} from '@constants/discord.js';

const COMMAND_NAME = 'Unlink';


module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlink')
        .setDescription('Unlinks your discord account to an AccessCode')
    ,
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.user;
        if (await getBaidFromDiscordId(user.id) === undefined) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, 'Your account is not linked to an EGTS profile yet');
            return;
        }

        await unlinkDiscordFromBaid(user.id);
        await interaction.reply({
            embeds: [{
                title: 'Successfully unlinked discord account',
                color: EMBED_COLOUR,
                author: {
                    name: COMMAND_NAME
                }
            }], flags: MessageFlags.Ephemeral
        });
    },
};