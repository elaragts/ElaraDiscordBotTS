import {AttachmentBuilder, SlashCommandBuilder} from 'discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';
import {ALL_CONTEXTS, ALL_INTEGRATION_TYPES, EMBED_COLOUR} from "@constants/discord.js";
import {generateScorecard} from "@utils/scorecard.js";
import {getBaidFromDiscordId} from "@database/queries/userDiscord.js";
import {editReplyWithErrorMessage, replyWithErrorMessage} from "@utils/discord.js";
import {getLatestUserPlay} from "@database/queries/songPlayBestData.js";

const COMMAND_NAME = 'Scorecard';

const data = new SlashCommandBuilder()
    .setName('scorecard')
    .setDescription('Returns the scorecard of a recent play')
    .setContexts(ALL_CONTEXTS)
    .setIntegrationTypes(ALL_INTEGRATION_TYPES)
    .addIntegerOption(
        option =>
            option.setName('offset')
                .setDescription('Recent score offset')
                .setMinValue(0)
    );
async function execute(interaction: ChatInputCommandInteractionExtended) {
    const baid = await getBaidFromDiscordId(interaction.user.id);
    const offset = interaction.options.getInteger('offset') ?? 0;
    if (baid === undefined) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'You have not linked your discord account to your card yet!');
        return;
    }
    await interaction.deferReply();
    const score = await getLatestUserPlay(baid, offset);
    if (!score) {
        await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'No recent play found.');
        return;
    }
    const scorecard = generateScorecard(score);
    const attachment = new AttachmentBuilder(scorecard, {name: 'scorecard.png'});
    const returnEmbed = {
        color: EMBED_COLOUR,
        image: {
            url: 'attachment://scorecard.png',
        },
        author: {
            name: COMMAND_NAME
        },
    };
    await interaction.editReply({embeds: [returnEmbed], files: [attachment]});
}

export const command: Command = {
    data,
    execute
};