import {AttachmentBuilder, SlashCommandBuilder} from 'discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {editReplyWithErrorMessage} from '@utils/discord.js';
import {getUserRatingSummary, getUserTop50} from '@database/queries/rating.js';
import {getSongTitle} from '@utils/datatable.js';
import {Language} from '@constants/datatable.js';
import {difficultyToEmoji} from '@utils/config.js';
import {ALL_CONTEXTS, ALL_INTEGRATION_TYPES, EMBED_COLOUR} from '@constants/discord.js';
import {getCostume, getMyDonName} from '@database/queries/userData.js';
import {createCostumeAvatar} from '@utils/costume.js';
import {getRankFromAccuracy} from '@utils/rating.js';
import {TOP50_DEPRECIATION_STEP} from '@constants/rating.js';

const COMMAND_NAME = 'B50';
const data = new SlashCommandBuilder()
    .setName('b50')
    .setDescription('Get User b50')
    .setContexts(ALL_CONTEXTS)
    .setIntegrationTypes(ALL_INTEGRATION_TYPES)
    .addUserOption(option =>
        option.setName('user')
            .setDescription('Target user')
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    await interaction.deferReply();

    let baid;
    const userOption = interaction.options.getUser('user');
    const user = userOption ?? interaction.user;

    baid = await getBaidFromDiscordId(user.id);
    if (baid === undefined) {
        await editReplyWithErrorMessage(
            interaction,
            COMMAND_NAME,
            userOption
                ? 'This user has not linked their discord account to their card yet!'
                : 'You have not linked your discord account to your card yet!'
        );
        return;
    }

    const result = await getUserTop50(baid);
    if (!result || result.length === 0) {
        await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'No top 50 rating data available for this user.');
        return;
    }

    const ratingSummary = await getUserRatingSummary(baid);
    const weightedSum = Number(ratingSummary?.top_50_sum_rate ?? 0);

    const maxSum = result.reduce((sum, entry, i) => sum + Number(entry.song_rate), 0);

    let description = `## Rating: ${weightedSum.toFixed(2)} (Weighted)\n`;
    description += `**Raw Rating**: ${maxSum.toFixed(2)}\n\n`;

    for (let i = 0; i < result.length; i++) {
        const entry = result[i];
        const rate = Number(entry.song_rate);
        const accuracy = Number(entry.accuracy);
        const weight = Math.max(0, 1 - i * TOP50_DEPRECIATION_STEP);
        const weightedRate = rate * weight;

        const accuracyPercent = (accuracy * 100).toFixed(1);
        const weightedStr = weightedRate.toFixed(2);
        const rateRaw = rate.toFixed(2);
        const rank = getRankFromAccuracy(accuracy);

        // @ts-ignore
        description += `${i + 1}. ${difficultyToEmoji(parseInt(entry.external_difficulty))}\`${getSongTitle(entry.song_id, Language.JAPANESE)}\`: ${rank} (${accuracyPercent}%) - ${weightedStr}/${rateRaw}\n`;
    }

    const avatar = await createCostumeAvatar((await getCostume(baid))!);
    const attachment = new AttachmentBuilder(avatar, { name: 'avatar.png' });

    const returnEmbed = {
        title: `${await getMyDonName(baid)}'s B50`,
        color: EMBED_COLOUR,
        description: description,
        author: {
            name: COMMAND_NAME
        },
        thumbnail: {
            url: 'attachment://avatar.png'
        },
    };

    await interaction.editReply({ embeds: [returnEmbed], files: [attachment] });
}

export const command: Command = {
    data,
    execute
};