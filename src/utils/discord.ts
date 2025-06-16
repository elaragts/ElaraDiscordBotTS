import {ChatInputCommandInteraction, MessageFlags} from "discord.js";

export async function replyWithErrorMessage(interaction: ChatInputCommandInteraction, author: string, reason: string): Promise<void> {
    const errorEmbed = {
        title: 'Error',
        description: reason,
        color: 13369344,
        author: {
            name: author
        }
    };
    await interaction.reply({embeds: [errorEmbed], flags: MessageFlags.Ephemeral});
}

export async function editReplyWithErrorMessage(interaction: ChatInputCommandInteraction, author: string, reason: string): Promise<void> {
    const errorEmbed = {
        title: 'Error',
        description: reason,
        color: 13369344,
        author: {
            name: author
        }
    };
    await interaction.editReply({embeds: [errorEmbed]});
}