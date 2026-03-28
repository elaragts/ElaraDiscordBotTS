import {SlashCommandBuilder} from 'discord.js';
import {
    editReplyWithErrorMessage, isUserBoostingServer, replyWithErrorMessage,
} from '@utils/discord.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {ALL_CONTEXTS, ALL_INTEGRATION_TYPES, EMBED_COLOUR} from '@constants/discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';
import {addUserRival, getUserRivalCount, isUserRival, removeUserRival} from "@database/queries/rival.js";
import config from '#config' with {type: 'json'};


const COMMAND_NAME = 'Update Rival';

const data = new SlashCommandBuilder()
    .setName('updaterival')
    .setDescription(COMMAND_NAME)
    .setContexts(ALL_CONTEXTS)
    .setIntegrationTypes(ALL_INTEGRATION_TYPES)
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to add/remove')
            .setRequired(true)
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    await interaction.deferReply();
    const userOption = interaction.options.getUser('user')!;
    const baid = await getBaidFromDiscordId(interaction.user.id);
    if (baid === undefined) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'You have not linked your discord account to your card yet!');
        return;
    }
    if (userOption.id === interaction.user.id) {
        await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'You cannot add yourself as a rival!');
        return;
    }
    const rivalBaid = await getBaidFromDiscordId(userOption.id);
    if (rivalBaid === undefined) {
        await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'This user has not linked their discord account to their card yet!');
        return;
    }
    let result: boolean;
    let description: string;
    if (await isUserRival(baid, rivalBaid)) {
        result = await removeUserRival(baid, rivalBaid);
        description = `Removed <@${userOption.id}> as a rival`;
    } else {
        let maxRivals;
        if (isUserBoostingServer(interaction.user.id)) {
            maxRivals = config.maxRivalsBooster;
        } else {
            maxRivals = config.maxRivals;
        }

        const count = await getUserRivalCount(baid);
        if (count >= maxRivals) {
            await editReplyWithErrorMessage(interaction, COMMAND_NAME, `You've reached your max rival count: ${count}/${maxRivals}`);
            return;
        }
        result = await addUserRival(baid, rivalBaid);
        description = `Added <@${userOption.id}> from your rival list`;
    }
    if (!result) {
        await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'Failed to add/remove rival');
        return;
    }

    const returnEmbed = {
        description: description,
        color: EMBED_COLOUR,
        author: {
            name: COMMAND_NAME
        },
    };
    await interaction.editReply({embeds: [returnEmbed]});
}

export const command: Command = {
    data,
    execute
};