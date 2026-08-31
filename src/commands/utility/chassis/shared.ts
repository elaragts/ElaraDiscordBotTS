import type {AutocompleteInteraction} from 'discord.js';
import config from '#config' with {type: 'json'};
import {EMBED_COLOUR} from '@constants/discord.js';
import type {ChatInputCommandInteractionExtended} from '@models/discord.js';
import {insertModLog} from '@database/queries/modlog.js';
import {listChassisByOwner} from '@database/queries/chassis.js';
import logger from '@utils/logger.js';

export const COMMAND_NAME = 'Chassis';
const NICKNAME_CONTROL_CHARACTER = /\p{Cc}/u;
const MASS_MENTION = /@(everyone|here)/i;

export function validateNickname(value: string | null): {nickname: string | null; error?: string} {
    if (value === null) return {nickname: null};
    const nickname = value.trim();
    if (nickname.length < 1 || nickname.length > 32) {
        return {nickname: null, error: 'Nickname must be between 1 and 32 characters after trimming.'};
    }
    if (NICKNAME_CONTROL_CHARACTER.test(nickname) || MASS_MENTION.test(nickname)) {
        return {nickname: null, error: 'Nickname cannot contain control characters or Discord mass mentions.'};
    }
    return {nickname};
}

export function parseChassisId(value: string): number | undefined {
    return /^284111\d{6}$/.test(value) ? Number(value) : undefined;
}

export async function ensureRegistrationEligibility(interaction: ChatInputCommandInteractionExtended): Promise<string | undefined> {
    if (interaction.guildId !== config.guildId || interaction.channelId !== config.botChannelId) {
        return `Command must be used in https://discord.com/channels/${config.guildId}/${config.botChannelId}`;
    }
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (!member?.roles.cache.has(config.donderRoleId)) {
        return 'You must have the Donder role to manage chassis.';
    }
    return undefined;
}

export function secretResponse(title: string, secret: string, chassisId: number, active = true): string {
    let response = `**${title}**\nSecret: \`${secret}\`\n\nSave this secret now. It cannot be viewed again. If you lose it, use \`/chassis reset-secret\`.\n\n**Management**\nChassis ID: \`${chassisId}\``;
    if (!active) response += '\nStatus: Disabled\n\nResetting the secret does not enable this chassis.';
    return response;
}

export function chassisEmbed(description: string, title?: string) {
    return {
        ...(title ? {title} : {}),
        description,
        color: EMBED_COLOUR,
        author: {name: COMMAND_NAME}
    };
}

export async function writeChassisModlog(entry: Parameters<typeof insertModLog>[0]): Promise<void> {
    try {
        await insertModLog(entry);
    } catch (err) {
        logger.error({err, actionType: entry.action_type, chassisId: entry.target_chassis_id}, 'Failed to write chassis modlog');
    }
}

export async function autocompleteChassis(interaction: AutocompleteInteraction): Promise<void> {
    const search = interaction.options.getFocused().toString().toLocaleLowerCase();
    const chassis = await listChassisByOwner(interaction.user.id);
    await interaction.respond(chassis
        .filter(item => item.chassis_id.toString().includes(search) || item.nickname?.toLocaleLowerCase().includes(search))
        .slice(0, 25)
        .map(item => ({name: `${item.nickname ?? 'Unnamed'}: ${item.chassis_id}`.slice(0, 100), value: item.chassis_id.toString()})));
}
