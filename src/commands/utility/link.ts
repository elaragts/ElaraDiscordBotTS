import {MessageFlags, SlashCommandBuilder} from 'discord.js';
import {getBaidFromAccessCode, getBaidFromDiscordId, getDiscordIdFromBaid} from '@database/queries/userDiscord.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {linkDiscordToBaid} from '@database/queries/userDiscord.js';
import {ALL_CONTEXTS, EMBED_COLOUR} from '@constants/discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';

const COMMAND_NAME = 'Link';

const data = new SlashCommandBuilder()
    .setName('link')
    .setDescription('Links your discord account to an AccessCode')
    .setContexts(ALL_CONTEXTS)
    .addStringOption(option =>
        option.setName('code')
            .setDescription('accessCode you use to login to TaikoWeb')
            .setRequired(true));

async function execute(interaction: ChatInputCommandInteractionExtended) {
    const accessCode = interaction.options.getString('code')!;
    const user = interaction.user;

    if (await getBaidFromDiscordId(user.id) !== undefined) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'Your account is already linked to an AccessCode (use /unlink to unlink your account)');
        return;
    }
    const baid = await getBaidFromAccessCode(accessCode);
    if (baid === undefined) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, `AccessCode ${accessCode} doesn\'t exist!`);
        return;
    }
    if (await getDiscordIdFromBaid(baid) !== undefined) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'This Taiko profile is already linked to another discord account');
        return;
    }
    await linkDiscordToBaid(user.id, baid);
    await interaction.reply({
        embeds: [{
            title: 'Successfully linked discord account',
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