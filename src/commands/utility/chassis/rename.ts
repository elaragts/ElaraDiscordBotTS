import {MessageFlags} from 'discord.js';
import type {ChatInputCommandInteractionExtended} from '@models/discord.js';
import {getChassisByIdForOwner, renameChassisForOwner} from '@database/queries/chassis.js';
import {ModlogTypes} from '@constants/modlog.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {
    chassisEmbed,
    COMMAND_NAME,
    ensureRegistrationEligibility,
    parseChassisId,
    validateNickname,
    writeChassisModlog
} from './shared.js';

export async function execute(interaction: ChatInputCommandInteractionExtended): Promise<void> {
    const eligibilityError = await ensureRegistrationEligibility(interaction);
    if (eligibilityError) return await replyWithErrorMessage(interaction, COMMAND_NAME, eligibilityError);
    const chassisId = parseChassisId(interaction.options.getString('chassis', true));
    if (!chassisId) return await replyWithErrorMessage(interaction, COMMAND_NAME, 'Chassis not found.');
    const validation = validateNickname(interaction.options.getString('nickname'));
    if (validation.error) return await replyWithErrorMessage(interaction, COMMAND_NAME, validation.error);

    const previous = await getChassisByIdForOwner(chassisId, interaction.user.id);
    if (!previous) return await replyWithErrorMessage(interaction, COMMAND_NAME, 'Chassis not found.');
    const updated = await renameChassisForOwner(chassisId, interaction.user.id, validation.nickname);
    if (!updated) return await replyWithErrorMessage(interaction, COMMAND_NAME, 'Chassis not found.');
    await writeChassisModlog({
        action_type: ModlogTypes.RENAME_CHASSIS,
        mod_user_id: interaction.user.id,
        target_user_id: interaction.user.id,
        target_chassis_id: chassisId,
        reason: `Nickname changed from ${previous.nickname ?? 'Unnamed chassis'} to ${updated.nickname ?? 'Unnamed chassis'}`
    });
    await interaction.reply({
        embeds: [chassisEmbed(updated.nickname
            ? `Chassis ID: \`${chassisId}\`\nNickname: ${updated.nickname}`
            : `Chassis ID: \`${chassisId}\`\nNickname removed.`)],
        allowedMentions: {parse: []},
        flags: MessageFlags.Ephemeral
    });
}
