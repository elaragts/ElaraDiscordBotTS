import {MessageFlags} from 'discord.js';
import type {ChatInputCommandInteractionExtended} from '@models/discord.js';
import {createChassisForOwner} from '@database/queries/chassis.js';
import {ModlogTypes} from '@constants/modlog.js';
import {replyWithErrorMessage} from '@utils/discord.js';
import {
    chassisEmbed,
    COMMAND_NAME,
    ensureRegistrationEligibility,
    secretResponse,
    validateNickname,
    writeChassisModlog
} from './shared.js';

export async function execute(interaction: ChatInputCommandInteractionExtended): Promise<void> {
    const eligibilityError = await ensureRegistrationEligibility(interaction);
    if (eligibilityError) return await replyWithErrorMessage(interaction, COMMAND_NAME, eligibilityError);
    const validation = validateNickname(interaction.options.getString('nickname'));
    if (validation.error) return await replyWithErrorMessage(interaction, COMMAND_NAME, validation.error);

    const result = await createChassisForOwner(interaction.user.id, validation.nickname);
    if (!result.created) {
        return await replyWithErrorMessage(interaction, COMMAND_NAME, `You have reached your chassis limit (${result.count} of ${result.limit}).`);
    }
    await writeChassisModlog({
        action_type: ModlogTypes.CREATE_CHASSIS,
        mod_user_id: interaction.user.id,
        target_user_id: interaction.user.id,
        target_chassis_id: result.created.chassisId,
        reason: '/chassis create used'
    });
    const title = result.created.nickname ? `Chassis created: ${result.created.nickname}` : 'Chassis created';
    await interaction.reply({
        embeds: [chassisEmbed(secretResponse(title, result.created.secret, result.created.chassisId))],
        allowedMentions: {parse: []},
        flags: MessageFlags.Ephemeral
    });
}
