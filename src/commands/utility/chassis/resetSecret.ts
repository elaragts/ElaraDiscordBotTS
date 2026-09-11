import {randomBytes} from 'node:crypto';
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags} from 'discord.js';
import type {ChatInputCommandInteractionExtended} from '@models/discord.js';
import {getChassisByIdForOwner, resetChassisSecretForOwner} from '@database/queries/chassis.js';
import {ModlogTypes} from '@constants/modlog.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {
    chassisEmbed,
    COMMAND_NAME,
    ensureRegistrationEligibility,
    parseChassisId,
    secretResponse,
    writeChassisModlog
} from './shared.js';

export async function execute(interaction: ChatInputCommandInteractionExtended): Promise<void> {
    const eligibilityError = await ensureRegistrationEligibility(interaction);
    if (eligibilityError) return await replyWithErrorMessage(interaction, COMMAND_NAME, eligibilityError);
    const chassisId = parseChassisId(interaction.options.getString('chassis', true));
    if (!chassisId) return await replyWithErrorMessage(interaction, COMMAND_NAME, 'Chassis not found.');
    const chassis = await getChassisByIdForOwner(chassisId, interaction.user.id);
    if (!chassis) return await replyWithErrorMessage(interaction, COMMAND_NAME, 'Chassis not found.');

    const nonce = randomBytes(8).toString('hex');
    const components = [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`chassis-reset-confirm:${nonce}`).setLabel('Confirm').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`chassis-reset-cancel:${nonce}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    )];
    const label = chassis.nickname ?? 'Unnamed chassis';
    const response = await interaction.reply({
        embeds: [chassisEmbed(`Reset the secret for ${label} (\`${chassisId}\`)?\nThe current secret will stop working immediately`)],
        components,
        allowedMentions: {parse: []},
        flags: MessageFlags.Ephemeral
    });

    let button;
    try {
        button = await response.awaitMessageComponent({
            filter: component => component.user.id === interaction.user.id && component.customId.endsWith(nonce),
            time: 60_000
        });
    } catch {
        await interaction.editReply({embeds: [chassisEmbed('Secret reset timed out.')], components: []});
        return;
    }
    await button.deferUpdate();
    if (button.customId.startsWith('chassis-reset-cancel:')) {
        await interaction.editReply({embeds: [chassisEmbed('Secret reset cancelled.')], components: []});
        return;
    }

    const reset = await resetChassisSecretForOwner(chassisId, interaction.user.id);
    if (!reset) {
        await interaction.editReply({embeds: [chassisEmbed('Chassis not found.')], components: []});
        return;
    }
    await writeChassisModlog({
        action_type: ModlogTypes.RESET_CHASSIS_SECRET,
        mod_user_id: interaction.user.id,
        target_user_id: interaction.user.id,
        target_chassis_id: chassisId,
        reason: '/chassis reset-secret used'
    });
    await interaction.editReply({
        embeds: [chassisEmbed(secretResponse(`Secret reset: ${reset.nickname ?? 'Unnamed chassis'}`, reset.secret, chassisId, reset.active))],
        components: [],
        allowedMentions: {parse: []}
    });
}
