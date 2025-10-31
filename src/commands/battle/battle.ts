import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    InteractionResponse,
    MessageComponentInteraction,
    MessageFlags,
    SlashCommandBuilder,
    User
} from 'discord.js';

import {replyWithErrorMessage, returnSongAutocomplete as autocomplete, validateSongInput} from '@utils/discord.js';
import {client} from '@bot/client.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {getFavouriteSongsArray, getMyDonName, setFavouriteSongsArray} from '@database/queries/userData.js';
import {getSongNoteCount, getSongStars, getSongTitle} from '@utils/datatable.js';
import {crownIdToEmoji, difficultyToEmoji, judgeIdToEmoji, rankIdToEmoji} from '@utils/config.js';
import {getLatestUserPlay, getMaxSongPlayDataId} from '@database/queries/songPlayBestData.js';
import {SongPlay} from '@models/queries.js';
import {addBattle} from '@database/queries/battle.js';
import {
    BattleWinCondition,
    BattleWinConditionLabel,
    BattleWinDirection,
    BattleWinDirectionLabel,
    DIFFICULTY_CHOICES,
    EMBED_COLOUR
} from '@constants/discord.js';
import type {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';

const COMMAND_NAME = 'Battle';
const data = new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Battle against another user')
    .addStringOption(option =>
        option.setName('song')
            .setDescription('Song name')
            .setRequired(true)
            .setAutocomplete(true))
    .addStringOption(option =>
        option.setName('difficulty')
            .setDescription('Difficulty of the map')
            .setRequired(true)
            .addChoices(DIFFICULTY_CHOICES)
    )
    .addStringOption(option =>
        option.setName('judgement')
            .setDescription('Judgement condition')
            .setRequired(false)
            .setChoices(
                Object.entries(BattleWinConditionLabel).map(([value, name]) => ({
                    name,
                    value
                }))
            )
    )
    .addStringOption(option =>
        option.setName('direction')
            .setDescription('Highest/Lowest wins')
            .setRequired(false)
            .setChoices(
                Object.entries(BattleWinDirectionLabel).map(([value, name]) => ({
                    name,
                    value
                }))
            ));

async function execute(interaction: ChatInputCommandInteractionExtended) {
    const userOne = interaction.user;
    if (client.ongoingBattles.has(userOne.id)) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'You already started a battle');
        return;
    }
    //buttons
    const join = new ButtonBuilder()
        .setCustomId('join')
        .setLabel('Join Battle')
        .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel Battle')
        .setStyle(ButtonStyle.Danger);

    const joinRow = new ActionRowBuilder()
        .addComponents(join, cancel);

    //execute
    const songInput = interaction.options.getString('song');
    const difficulty = parseInt(interaction.options.getString('difficulty')!);
    const winCondition = interaction.options.getString('judgement') as BattleWinCondition || BattleWinCondition.SCORE;
    const winDirectionOption = interaction.options.getString('direction');
    let invertWinConditionLogic = false;
    if (!winDirectionOption) {
        invertWinConditionLogic = winCondition === BattleWinCondition.OK_COUNT || winCondition === BattleWinCondition.MISS_COUNT;
    }
    else if (winDirectionOption === BattleWinDirection.LOWEST) {
        invertWinConditionLogic = true;
    }

    const judgementLine = `### Judgement: ${BattleWinConditionLabel[winCondition]} (${invertWinConditionLogic ? BattleWinDirectionLabel[BattleWinDirection.LOWEST] : BattleWinDirectionLabel[BattleWinDirection.HIGHEST] })`;
    let winner = -1;
    const baid = await getBaidFromDiscordId(interaction.user.id);

    if (baid === undefined) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'You have not linked your discord account to your card yet!');
        return;
    }
    const nameOne = (await getMyDonName(baid))!;

    const songValidationResult = await validateSongInput(interaction, songInput!, COMMAND_NAME);
    if (songValidationResult === undefined) return;
    const uniqueId = songValidationResult.uniqueId;
    const lang = songValidationResult.lang;
    const songStars = getSongStars(uniqueId, difficulty);
    const accuracyCoefficient = 100 / getSongNoteCount(uniqueId, difficulty);


    if (!songStars) {
        await replyWithErrorMessage(interaction, COMMAND_NAME, 'This song does not have a chart for this difficulty');
        return;
    }
    client.ongoingBattles.add(userOne.id);
    const songName = getSongTitle(uniqueId, lang);
    const returnEmbed = {
        title: `${nameOne} VS. TBD`,
        color: EMBED_COLOUR,
        author: {
            name: COMMAND_NAME
        },
        description: `## ${songName} ${difficultyToEmoji(difficulty)}★${songStars}\n${judgementLine}\n`,
    };
    let joinResponse;
    joinResponse = await interaction.reply({
        embeds: [returnEmbed],
        components: [joinRow.toJSON()],
    });

    const joinCollector = joinResponse.createMessageComponentCollector({filter: _ => true, time: 600000}); // i => true (I am 7 picoseconds away from shooting myself)

    joinCollector.on('collect', async i => {
        if (i.customId === 'cancel') {
            if (i.user.id !== userOne.id) {
                await i.reply({content: 'Only the host can cancel the battle', flags: MessageFlags.Ephemeral});
                return;
            }
            await interaction.editReply({
                embeds: [{
                    title: `${nameOne} VS. TBD`,
                    color: EMBED_COLOUR,
                    author: {
                        name: COMMAND_NAME
                    },
                    description: `Battle Cancelled`,
                }], components: []
            });
            client.ongoingBattles.delete(userOne.id);
            joinCollector.stop('battle_canceled');
        } else if (i.customId === 'join') {
            if (i.user.id === interaction.user.id) {
                await i.reply({content: 'You can\'t join your own battle!', flags: MessageFlags.Ephemeral});
                return;
            }
            if (client.ongoingBattles.has(i.user.id)) {
                await i.reply({content: 'You are already in a battle!', flags: MessageFlags.Ephemeral});
                return;
            }
            if (await getBaidFromDiscordId(i.user.id) === undefined) {
                await i.reply({content: 'You haven\'t linked your account yet', flags: MessageFlags.Ephemeral});
                return;
            }
            joinCollector.stop('battle_joined');
            await confirmBattle(i, userOne, i.user);
        }
    });

    joinCollector.on('end', async (_, reason) => {
        if (reason === 'time') {
            client.ongoingBattles.delete(userOne.id);
            await interaction.editReply({
                embeds: [{
                    title: `${nameOne} VS. TBD`,
                    color: EMBED_COLOUR,
                    author: {
                        name: COMMAND_NAME
                    },
                    description: `Battle Cancelled (No one joined)`,
                }], components: []
            });
        }
    });

    const confirmBattle = async (i: MessageComponentInteraction, userOne: User, userTwo: User) => {
        const nameTwo = await getMyDonName((await getBaidFromDiscordId(userTwo.id))!);
        const start = new ButtonBuilder()
            .setCustomId('start')
            .setLabel('Start Battle')
            .setStyle(ButtonStyle.Primary);
        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel Battle')
            .setStyle(ButtonStyle.Danger);

        const confirmRow = new ActionRowBuilder()
            .addComponents(start, cancel);
        await i.update({
            embeds: [{
                title: `${nameOne} VS. ${nameTwo}`,
                color: 15410003,
                author: {
                    name: COMMAND_NAME
                },
                description: `## ${songName} ${difficultyToEmoji(difficulty)}★${songStars}\n${judgementLine}\n### ${nameTwo} has joined the battle!`,
            }], components: [confirmRow.toJSON()]
        });
        const confirmCollector = joinResponse.createMessageComponentCollector({
            filter: x => [userOne.id, userTwo.id].includes(x.user.id),
            time: 300000
        });

        confirmCollector.on('collect', async x => {
            if (x.customId === 'start') {
                if (x.user.id !== userOne.id) {
                    await x.reply({content: 'Only the host can start the battle', flags: MessageFlags.Ephemeral});
                    return;
                }
                confirmCollector.stop('battle_started');
                await startBattle(x, joinResponse, userOne, userTwo);
            } else if (x.customId === 'cancel') {
                if (x.user.id !== userOne.id) {
                    await x.reply({content: 'Only the host can cancel the battle', flags: MessageFlags.Ephemeral});
                    return;
                }
                await x.update({
                    embeds: [{
                        title: `${nameOne}`,
                        color: EMBED_COLOUR,
                        author: {
                            name: COMMAND_NAME
                        },
                        description: `Battle Cancelled`,
                    }], components: []
                });
                client.ongoingBattles.delete(userOne.id);
                client.ongoingBattles.delete(userTwo.id);
                confirmCollector.stop('battle_canceled');
            }
        });
    };
    const startBattle = async (i: MessageComponentInteraction, joinResponse: InteractionResponse, userOne: User, userTwo: User) => {
        const minSongPlayId = await getMaxSongPlayDataId(); //minimum id of submission must be greater than current Max Song Play ID
        const baidOne = (await getBaidFromDiscordId(userOne.id))!;
        const baidTwo = (await getBaidFromDiscordId(userTwo.id))!;
        const nameTwo = (await getMyDonName(baidTwo))!;
        client.playerFavouriteSongs.set(baidOne, (await getFavouriteSongsArray(baidOne))!);
        client.playerFavouriteSongs.set(baidTwo, (await getFavouriteSongsArray(baidTwo))!);
        await setFavouriteSongsArray(baidOne, [uniqueId]);
        await setFavouriteSongsArray(baidTwo, [uniqueId]);
        let userOnePlay: SongPlay;
        let userTwoPlay: SongPlay;
        const submit = new ButtonBuilder()
            .setCustomId('submit')
            .setLabel('Submit Score')
            .setStyle(ButtonStyle.Success);

        const submitRow = new ActionRowBuilder()
            .addComponents(submit);
        client.ongoingBattles.add(userTwo.id);

        await i.update({
            embeds: [{
                title: `${nameOne} VS. ${nameTwo}`,
                color: EMBED_COLOUR,
                author: {
                    name: COMMAND_NAME
                },
                description: `## ${songName} ${difficultyToEmoji(difficulty)}★${songStars}\n${judgementLine}\n### Instructions:\n1. set number of games to \`1\` in the service menu\n2. go to Liked Songs and find \`${songName}\`\n3. press submit button once you finish playing (and go back to attract screen)`,
            }], components: [submitRow.toJSON()]
        });

        const submissionCollector = joinResponse.createMessageComponentCollector({
            filter: x => [userOne.id, userTwo.id].includes(x.user.id),
            time: 600000
        });

        submissionCollector.on('collect', async i => {
            if (i.customId !== 'submit') return;
            if (i.user.id === userOne.id && userOnePlay !== undefined || i.user.id === userTwo.id && userTwoPlay !== undefined) {
                await i.reply({content: 'You already submitted a score', flags: MessageFlags.Ephemeral});
                return;
            }
            const baid = (await getBaidFromDiscordId(i.user.id))!;
            const songPlay = await getLatestUserPlay(baid, uniqueId, difficulty);
            if (songPlay === undefined || songPlay.id <= minSongPlayId) {
                await i.reply({content: 'No score submitted', flags: MessageFlags.Ephemeral});
                return;
            }
            songPlay.accuracy = songPlay.good_count * accuracyCoefficient + songPlay.ok_count * accuracyCoefficient / 2;
            if (i.user.id === userOne.id) {
                userOnePlay = songPlay;
            } else {
                userTwoPlay = songPlay;
            }
            if (userOnePlay !== undefined && userTwoPlay !== undefined) {
                submissionCollector.stop('battle_finished');
            }
            await updateBattleEmbed(i);
        });

        submissionCollector.on('end', async (_, reason) => {
            await setFavouriteSongsArray(baidOne, client.playerFavouriteSongs.get(baidOne)!);
            await setFavouriteSongsArray(baidTwo, client.playerFavouriteSongs.get(baidTwo)!);
            client.playerFavouriteSongs.delete(baidOne);
            client.playerFavouriteSongs.delete(baidTwo);
            client.ongoingBattles.delete(userOne.id);
            client.ongoingBattles.delete(userTwo.id);
            if (reason === 'time') {
                client.ongoingBattles.delete(userOne.id);
                await interaction.editReply({
                    embeds: [{
                        title: `${nameOne} VS. ${nameTwo}`,
                        color: EMBED_COLOUR,
                        author: {
                            name: COMMAND_NAME
                        },
                        description: `Battle Ended, Someone didn't submit a score in time`,
                    }], components: []
                });
                return;
            }
            //battle finished
            const userOneValue = userOnePlay[winCondition];
            const userTwoValue = userTwoPlay[winCondition];

            if (userOneValue === userTwoValue) {
                winner = -1;
            } else if (
                (!invertWinConditionLogic && userOneValue > userTwoValue) ||
                (invertWinConditionLogic && userOneValue < userTwoValue)
            ) {
                winner = baidOne;
            } else {
                winner = baidTwo;
            }
            await addBattle(uniqueId, baidOne, baidTwo, winner);
        });

        const updateBattleEmbed = async (i: MessageComponentInteraction) => {
            const userOnePlayStr = userOnePlay === undefined ? 'No score submitted' :
                `${crownIdToEmoji(userOnePlay.crown)}${rankIdToEmoji(userOnePlay.score_rank - 2)} ${userOnePlay.score}
                    ${judgeIdToEmoji(0)}${userOnePlay.good_count}
                    ${judgeIdToEmoji(1)}${userOnePlay.ok_count}
                    ${judgeIdToEmoji(2)}${judgeIdToEmoji(3)}${userOnePlay.miss_count}
                    **Max Combo:** ${userOnePlay.combo_count}
                    **Max Drumroll:** ${userOnePlay.drumroll_count}
                    **Accuracy:** ${userOnePlay.accuracy.toFixed(2)}%
                    `;
            const userTwoPlayStr = userTwoPlay === undefined ? 'No score submitted' :
                `${crownIdToEmoji(userTwoPlay.crown)}${rankIdToEmoji(userTwoPlay.score_rank - 2)} ${userTwoPlay.score}
                    ${judgeIdToEmoji(0)}${userTwoPlay.good_count}
                    ${judgeIdToEmoji(1)}${userTwoPlay.ok_count}
                    ${judgeIdToEmoji(2)}${judgeIdToEmoji(3)}${userTwoPlay.miss_count}
                    **Max Combo:** ${userTwoPlay.combo_count}
                    **Max Drumroll:** ${userTwoPlay.drumroll_count}
                        **Accuracy:** ${userTwoPlay.accuracy.toFixed(2)}%
                    `;
            let description = `## ${songName} ${difficultyToEmoji(difficulty)}★${getSongStars(uniqueId, difficulty)}\n${judgementLine}\n`;
            let components = [submitRow];

            if (userOnePlay !== undefined && userTwoPlay !== undefined) {
                components = [];
                const userOneValue = userOnePlay[winCondition];
                const userTwoValue = userTwoPlay[winCondition];

                if (userOneValue === userTwoValue) {
                    description += `### Draw!`;
                } else if (
                    (!invertWinConditionLogic && userOneValue > userTwoValue) ||
                    (invertWinConditionLogic && userOneValue < userTwoValue)
                ) {
                    description += `### ${nameOne} wins!`;
                } else {
                    description += `### ${nameTwo} wins!`;
                }
            } else {
                description += '### Match Ongoing';
            }
            await i.update({
                embeds: [{
                    title: `${nameOne} VS. ${nameTwo}`,
                    color: EMBED_COLOUR,
                    author: {
                        name: COMMAND_NAME
                    },
                    description: description,
                    fields: [
                        {
                            name: nameOne,
                            value: userOnePlayStr,
                            inline: true
                        },
                        {
                            name: nameTwo,
                            value: userTwoPlayStr,
                            inline: true
                        }
                    ]
                }], components: components.map(c => c.toJSON())
            });
        };
    };
}

export const command: Command = {
    data,
    execute,
    autocomplete
};