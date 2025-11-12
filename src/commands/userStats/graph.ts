import {SlashCommandBuilder} from 'discord.js';
import {getBaidFromDiscordId} from '@database/queries/userDiscord.js';
import {editReplyWithErrorMessage, replyWithErrorMessage} from '@utils/discord.js';
import {getMyDonName} from '@database/queries/userData.js';
import {getPlayCount} from '@database/queries/songPlayBestData.js';
import {format, parse, addMonths, isBefore, addDays, startOfDay, startOfMonth, endOfDay, endOfMonth} from 'date-fns';
import {
    ALL_CONTEXTS, ALL_INTEGRATION_TYPES,
    DATE_RANGE_CHOICES,
    DateRangeTypes,
    EMBED_COLOUR,
    GRAPH_TYPE_CHOICES,
    GraphTypes
} from '@constants/discord.js';
import {ChatInputCommandInteractionExtended, Command} from '@models/discord.js';
import {getUserRatingBeforeDate, getUserRatingHistory} from '@database/queries/rating.js';
import {getDateRangeFromType} from '@utils/common.js';
import {QueryGranularity} from '@constants/common.js';

const COMMAND_NAME = 'Graph';

const data = new SlashCommandBuilder()
    .setName('graph')
    .setDescription('Graph Statistics')
    .setContexts(ALL_CONTEXTS)
    .setIntegrationTypes(ALL_INTEGRATION_TYPES)
    .addStringOption(
        option =>
            option.setName('type')
                .setDescription('Graph type')
                .setRequired(true)
                .setChoices(GRAPH_TYPE_CHOICES)
    )
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to obtain the data from')
            .setRequired(false)
    )
    .addStringOption(
        option =>
            option.setName('range')
                .setDescription('Date range for the data')
                .setRequired(false)
                .setChoices(DATE_RANGE_CHOICES)
    );

async function execute(interaction: ChatInputCommandInteractionExtended) {
    let baid;
    let graphType = interaction.options.getString('type')!;
    const dateRangeType = interaction.options.getString('range') as DateRangeTypes | DateRangeTypes.TO_DATE;

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

    const range = getDateRangeFromType(dateRangeType);
    const startDate = range.startDate;
    const endDate = range.endDate;


    let chartConfig;

    await interaction.deferReply();
    switch (graphType) {
        case GraphTypes.PLAYCOUNT: {
            chartConfig = await getPlaycountGraphConfig(baid, startDate, endDate, dateRangeType);
            break;
        }
        case GraphTypes.RATING: {
            chartConfig = await getRatingGraphConfig(baid, startDate, endDate);
            break;
        }
        default: {
            return await replyWithErrorMessage(interaction, COMMAND_NAME, 'Unknown graph type!');
        }
    }

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
        description: `[Link](${imageURL})`,
        image: {
            url: imageURL,
        },
        author: {
            name: COMMAND_NAME
        },
    };
    await interaction.editReply({embeds: [returnEmbed]});
}
async function getPlaycountGraphConfig(
    baid: number,
    startDate: Date,
    endDate: Date,
    range: DateRangeTypes
) {
    let granularity: QueryGranularity;
    let granularityText;
    if ([DateRangeTypes.MTD, DateRangeTypes.MONTH, DateRangeTypes.TODAY].includes(range)) {
        granularity = QueryGranularity.DAY;
        granularityText = 'Daily';
    } else {
        granularity = QueryGranularity.MONTH;
        granularityText = 'Monthly';
    }

    const adjustedEndDate = granularity === QueryGranularity.DAY
        ? endOfDay(endDate)
        : endOfMonth(endDate);

    const countData = await getPlayCount(baid, granularity, startDate, adjustedEndDate);

    type PlayCountRow = { period: string; play_count: number };
    let fullTimeline: PlayCountRow[];

    const fmt = granularity === QueryGranularity.DAY ? 'yyyy-MM-dd' : 'yyyy-MM';
    const step = granularity === QueryGranularity.DAY ? addDays : addMonths;

    if (countData.length !== 0) {
        const byPeriod = new Map(countData.map(r => [r.period, r.play_count]));
        const start = parse(countData[0].period, fmt, new Date());
        const end = parse(countData[countData.length - 1].period, fmt, new Date());

        fullTimeline = [];
        let current = start;

        while (isBefore(current, step(end, 1))) {
            const key = format(current, fmt);
            fullTimeline.push({
                period: key,
                play_count: byPeriod.get(key) ?? 0,
            });
            current = step(current, 1);
        }
    } else {
        let current = startDate;
        const end = endDate;
        fullTimeline = [];

        while (isBefore(current, step(end, 1))) {
            fullTimeline.push({
                period: format(current, fmt),
                play_count: 0,
            });
            current = step(current, 1);
        }
    }

    //timeline up to current date/month with zeroes
    const now = granularity === QueryGranularity.DAY ? startOfDay(new Date()) : startOfMonth(new Date());
    let lastPeriodDate = parse(fullTimeline[fullTimeline.length - 1].period, fmt, new Date());

    while (isBefore(lastPeriodDate, now)) {
        lastPeriodDate = step(lastPeriodDate, 1);
        fullTimeline.push({
            period: format(lastPeriodDate, fmt),
            play_count: 0,
        });
    }

    const userDonName = (await getMyDonName(baid))!;
    return {
        chart: {
            type: 'line',
            data: {
                labels: fullTimeline.map(d => d.period),
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
                            font: { size: 16 }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: granularity === QueryGranularity.DAY ? 'Day' : 'Month',
                            font: { size: 16 }
                        }
                    }
                },
                plugins: {
                    datalabels: {
                        color: '#EB2353',
                        align: 'end',
                        anchor: 'end',
                        font: {
                            weight: 'bold',
                            size: 15
                        },
                        formatter: (value: any) => value.toLocaleString()
                    },
                    title: {
                        display: true,
                        text: `${userDonName}'s ${granularityText} Play Count`,
                        font: { size: 30 }
                    }
                }
            }
        },
        width: 800,
        height: 600,
        backgroundColor: 'white',
        version: '4'
    };
}

async function getRatingGraphConfig(baid: number, startDate: Date, endDate: Date) {
    let ratingData = await getUserRatingHistory(baid, startDate, endDate);
    const ratingAtStart = await getUserRatingBeforeDate(baid, startDate) || 0;
    const userDonName = (await getMyDonName(baid))!;

    // Ensure a starting point
    if (startDate.getTime() > 0 && (ratingData.length === 0 || ratingData[0].rating_date.getTime() !== startDate.getTime())) {
        if (ratingAtStart != null) {
            ratingData = [
                { id: 0, baid: baid, rating_date: startDate, rating: ratingAtStart },
                ...ratingData
            ];
        }
    }

    // Ensure an ending point
    if (ratingData.length === 0 || ratingData[ratingData.length - 1].rating_date.getTime() !== endDate.getTime()) {
        const lastRating = ratingData[ratingData.length - 1].rating;
        ratingData = [
            ...ratingData,
            { id: 0, baid: baid, rating_date: endDate, rating: lastRating }
        ];
    }

    return {
        chart: {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Rating',
                    data: ratingData.map(item => ({
                        x: item.rating_date,
                        y: Number(item.rating)
                    })),
                    borderColor: '#e3685f',
                    fill: false,
                }]
            },
            options: {
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Rating',
                            font: {
                                size: 16
                            },
                        },
                        ticks: {
                            stepSize: 50,
                        }
                    },
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            minUnit: 'week'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${userDonName}'s Rating`,
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
}

export const command: Command = {
    data,
    execute
};