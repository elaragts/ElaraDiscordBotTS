import {SlashCommandBuilder, MessageFlags} from 'discord.js';
import {getBaidFromDiscordId, unlinkDiscordFromBaid} from '@database/queries/userDiscord.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {ALL_CONTEXTS, ALL_INTEGRATION_TYPES, EMBED_COLOUR} from '@constants/discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';

const COMMAND_NAME = 'Unlink';

const data = new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlinks your discord account to an AccessCode')
    .setContexts(ALL_CONTEXTS)
    .setIntegrationTypes(ALL_INTEGRATION_TYPES);
async function execute(interaction: ChatInputCommandInteractionExtended) {
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
}

export const command: Command = {
    data,
    execute
};