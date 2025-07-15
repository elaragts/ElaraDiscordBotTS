import {SlashCommandBuilder} from 'discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';

const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');

async function execute(interaction: ChatInputCommandInteractionExtended) {
    await interaction.reply('Pong!');
}

export const command: Command = {
    data,
    execute
};