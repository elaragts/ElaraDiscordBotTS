import {SlashCommandBuilder, AttachmentBuilder, ChatInputCommandInteraction} from "discord.js";
import {getBaidFromDiscordId} from "../../database/queries/userDiscord";
import {replyWithErrorMessage} from "../../utils/discord";
import {getUserProfile} from "../../database/queries/userData";
import {crownIdToEmoji, daniClearStateToEmoji, difficultyToEmoji, rankIdToEmoji} from "../../utils/config";
import {danIdToName} from "../../utils/common";
import {createCostumeAvatar} from "../../utils/costume";
import {CostumeData} from "../../models/queries";
import {EMBED_COLOUR} from "../../constants/discord";

const COMMAND_NAME = "Profile"
module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("User profile")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to obtain the score from")
                .setRequired(false)
        )
    ,
    async execute(interaction: ChatInputCommandInteraction) {
        let baid;
        const userOption = interaction.options.getUser("user");
        if (userOption) {
            baid = await getBaidFromDiscordId(userOption.id);
            if (baid === undefined) {
                await replyWithErrorMessage(interaction, COMMAND_NAME, "This user has not linked their discord account to their card yet!");
                return;
            }
        } else {
            baid = await getBaidFromDiscordId(interaction.user.id);
            if (baid === undefined) {
                await replyWithErrorMessage(interaction, COMMAND_NAME, "You have not linked your discord account to your card yet!");
                return;
            }
        }
        await interaction.deferReply();
        const profile = await getUserProfile(baid);
        if (profile === undefined) {
            await replyWithErrorMessage(interaction, COMMAND_NAME, "Error retrieving profile");
            return;
        }
        const clearState = daniClearStateToEmoji(profile.clear_state);
        const dani = danIdToName(profile.dan_id);
        let achievementPanelEmoji = "";
        let achievementPanel = "";
        let achievementPanelTitle = "";
        if (profile.achievement_display_difficulty !== 0 && profile.bestcrown_1 !== null) {
            achievementPanelEmoji = difficultyToEmoji(profile.achievement_display_difficulty);
            if (profile.achievement_display_difficulty === 5) {
                achievementPanelEmoji = difficultyToEmoji(4) + difficultyToEmoji(5);
            }
            achievementPanelTitle = `Achievement Panel ${achievementPanelEmoji}`;
            let rankEmojis = [];
            for (let i = 0; i <= 6; i++) {
                rankEmojis.push(rankIdToEmoji(i));
            }
            const rankAndCrownValues: Record<string, number> = {
                "rank0": profile.bestscorerank_2,
                "rank1": profile.bestscorerank_3,
                "rank2": profile.bestscorerank_4,
                "rank3": profile.bestscorerank_5,
                "rank4": profile.bestscorerank_6,
                "rank5": profile.bestscorerank_7,
                "rank6": profile.bestscorerank_8,
                "crown1": profile.bestcrown_1,
                "crown2": profile.bestcrown_2,
                "crown3": profile.bestcrown_3,
            };
            const padString = (string: number, length: number) => {
                return string + "\u00A0".repeat((length - string.toString().length) * 2);
            };
            const maxLength = Math.max(
                ...Object.values(rankAndCrownValues).map(val => val.toString().length)
            );

            achievementPanel = `
  ${rankEmojis[6]} ${padString(rankAndCrownValues["rank6"], maxLength)}
  ${rankEmojis[3]} ${padString(rankAndCrownValues["rank3"], maxLength)} ${rankEmojis[4]} ${padString(rankAndCrownValues["rank4"], maxLength)} ${rankEmojis[5]} ${padString(rankAndCrownValues["rank5"], maxLength)}
  ${rankEmojis[0]} ${padString(rankAndCrownValues["rank0"], maxLength)} ${rankEmojis[1]} ${padString(rankAndCrownValues["rank1"], maxLength)} ${rankEmojis[2]} ${padString(rankAndCrownValues["rank2"], maxLength)}
  ${crownIdToEmoji(1)} ${padString(rankAndCrownValues["crown1"], maxLength)} ${crownIdToEmoji(2)} ${padString(rankAndCrownValues["crown2"], maxLength)} ${crownIdToEmoji(3)} ${padString(rankAndCrownValues["crown3"], maxLength)}
`;
        }
        const costumeData: CostumeData = {
            current_body: profile.current_body,
            current_face: profile.current_face,
            current_head: profile.current_head,
            current_kigurumi: profile.current_kigurumi,
            current_puchi: profile.current_puchi,
            color_body: profile.color_body,
            color_face: profile.color_face,
        };

        const avatar = await createCostumeAvatar(costumeData);
        const attachment = new AttachmentBuilder(avatar, {name: "avatar.png"});

        //construct embed
        const returnEmbed = {
            title: `${clearState}${dani} ${profile.dan_id ? "|" : ""} ${profile.my_don_name}`,
            color: EMBED_COLOUR,
            description: `Title: ${profile.title}\nPlay Count: ${profile.play_count}`,
            thumbnail: {
                url: "attachment://avatar.png",
            }, author: {
                name: COMMAND_NAME
            },
            fields: [
                {
                    name: achievementPanelTitle,
                    value: achievementPanel,
                },
            ],
        };
        await interaction.editReply({embeds: [returnEmbed], files: [attachment]});
    },
};