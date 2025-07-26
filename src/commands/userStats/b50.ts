import {AttachmentBuilder, SlashCommandBuilder} from 'discord.js';
import {ChatInputCommandInteractionExtended} from '@models/discord.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {editReplyWithErrorMessage} from '@utils/discord.js';
import {getUserRatingSummary, getUserTop50} from '@database/queries/rating.js';
import {getSongStars, getSongTitle} from '@utils/datatable.js';
import {Language} from '@constants/datatable.js';
import {difficultyIdToName} from '@utils/common.js';
import {difficultyToEmoji} from '@utils/config.js';
import {EMBED_COLOUR} from '@constants/discord.js';
import {getCostume, getMyDonName} from '@database/queries/userData.js';
import {createCostumeAvatar} from '@utils/costume.js';

const COMMAND_NAME = 'B50';
const data = new SlashCommandBuilder()
    .setName('b50')
    .setDescription('Get User b50')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('Target user')
    );


async function execute(interaction: ChatInputCommandInteractionExtended) {
    await interaction.deferReply();
    let baid;
    let user;
    const userOption = interaction.options.getUser('user');
    if (userOption) {
        baid = await getBaidFromDiscordId(userOption.id);
        if (baid === undefined) {
            await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'This user has not linked their discord account to their card yet!');
            return;
        }
        user = userOption;
    } else {
        user = interaction.user;
        baid = await getBaidFromDiscordId(interaction.user.id);
        if (baid === undefined) {
            await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'You have not linked your discord account to your card yet!');
            return;
        }
    }
    const fieldValues = ['', '', '', ''];

    const rating = (await getUserRatingSummary(baid))?.top50_sum_rate;
    if (rating === undefined) {
        return; //TODO: err out
    }
    const result = await getUserTop50(baid);
    for (const i in result) {
        fieldValues[Math.floor(parseInt(i) / 50)] += `\`${getSongTitle(result[i].song_id, Language.JAPANESE)}\` (${result[i].accuracy}) - ${result[i].song_rate}\n`;
    }

    let fields = []
    for (const fieldValue of fieldValues) {
        if (fieldValue === '') return;
        fields.push({
            name: 'Test',
            value: fieldValue,
            inline: true
        })
    }
    const avatar = await createCostumeAvatar((await getCostume(baid))!);
    const attachment = new AttachmentBuilder(avatar, {name: 'avatar.png'});
    const returnEmbed = {
        title: `${await getMyDonName(baid)}'s B50`,
        color: EMBED_COLOUR,
        description: `Rating: ${rating}`,
        author: {
            name: COMMAND_NAME
        },
        thumbnail: {
            url: 'attachment://avatar.png'
        },
        fields: fields
    };
    await interaction.editReply({embeds: [returnEmbed], files: [attachment]});

}