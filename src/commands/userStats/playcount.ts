import {SlashCommandBuilder} from 'discord.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {editReplyWithErrorMessage, replyWithErrorMessage} from '@utils/discord.js';
import {getMyDonName} from '@database/queries/userData.js';
import {getMonthlyPlayCount} from '@database/queries/songPlayBestData.js';
import {format, parse, addMonths, isBefore} from 'date-fns';
import type {MonthlyPlayCount} from '@models/queries.js';
import {EMBED_COLOUR} from '@constants/discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';

const COMMAND_NAME = 'Play Count';

const data = new SlashCommandBuilder()
    .setName('playcount')
    .setDescription('Play Count')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to obtain the data from')
            .setRequired(false)
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    let baid;
    const userOption = interaction.options.getUser('user');
    if (userOption) {
        baid = await getBaidFromDiscordId(userOption.id);
        if (baid === undefined) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, 'This user has not linked their discord account to their card yet!');
            return;
        }
    } else {
        baid = await getBaidFromDiscordId(interaction.user.id);
        if (baid === undefined) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, 'You have not linked your discord account to your card yet!');
            return;
        }
    }
    await interaction.deferReply();
    const countData = await getMonthlyPlayCount(baid);
    let fullTimeline: MonthlyPlayCount[] = [];
    if (countData.length > 0) {
        const start = parse(countData[0].month, 'yyyy-MM', new Date());
        const end = parse(countData[countData.length - 1].month, 'yyyy-MM', new Date());

        let current = start;

        while (isBefore(current, addMonths(end, 1))) {
            const monthKey = format(current, 'yyyy-MM');
            const match = countData.find(r => r.month === monthKey);
            fullTimeline.push({
                month: monthKey,
                play_count: match?.play_count ?? 0,
            });
            current = addMonths(current, 1);
        }
    }

    const userDonName = (await getMyDonName(baid))!;
    const chartConfig = {
        chart: {
            type: 'line',
            data: {
                labels: fullTimeline.map(d => d.month),
                datasets: [{
                    label: 'Play Count',
                    data: fullTimeline.map(d => d.play_count),
                    borderColor: '#e3685f',
                    fill: false,
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Play Count',
                            font: {
                                size: 16  // Optional
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Month',
                            font: {
                                size: 16  // Optional
                            }
                        }
                    }
                },

                plugins: {
                    datalabels: {
                        color: '#EB2353',  // Choose color for the datalabels
                        align: 'end',
                        anchor: 'end',
                        font: {
                            weight: 'bold',
                            size: 15
                        },
                        formatter: function (value: any, _: any) {
                            return value.toLocaleString();  // Formats numbers with commas, or use simply `value`
                        }
                    },
                    title: {
                        display: true,
                        text: `${userDonName}'s Monthly Play Count`,
                        font: {
                            size: 30
                        }
                    }
                }
            }
        },
        width: 800,
        height: 600,
        backgroundColor: 'white',
        version: '4'
    };

    const response = await fetch('https://quickchart.io/chart/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(chartConfig)
    });

    if (!response.ok) {
        await editReplyWithErrorMessage(interaction, COMMAND_NAME, 'Graphing API responded with error');
    }
    const imageURL = (await response.json()).url;
    //construct embed
    const returnEmbed = {
        color: EMBED_COLOUR,
        image: {
            url: imageURL,
        },
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