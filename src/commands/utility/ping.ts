import {SlashCommandBuilder} from "discord.js";
import {ChatInputCommandInteractionExtended} from '@models/discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction: ChatInputCommandInteractionExtended) {
        await interaction.reply('Pong!');
    },
};