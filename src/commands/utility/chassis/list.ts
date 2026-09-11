import {MessageFlags} from 'discord.js';
import type {ChatInputCommandInteractionExtended} from '@models/discord.js';
import {getEffectiveChassisLimit, listChassisByOwner} from '@database/queries/chassis.js';
import {chassisEmbed} from './shared.js';

export async function execute(interaction: ChatInputCommandInteractionExtended): Promise<void> {
    const [chassis, limit] = await Promise.all([
        listChassisByOwner(interaction.user.id),
        getEffectiveChassisLimit(interaction.user.id)
    ]);
    if (chassis.length === 0) {
        await interaction.reply({
            embeds: [chassisEmbed('You do not have a chassis. Use `/chassis create` to create one.')],
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const entries = chassis.map((item, index) => {
        const credential = item.secret === null ? '\n   Credential: Not set, use `/chassis reset-secret`' : '';
        return `${index + 1}. ${item.nickname ?? 'Unnamed chassis'}\n   Chassis ID: \`${item.chassis_id}\`\n   Status: ${item.active ? 'Active' : 'Disabled'}${credential}`;
    });
    const pages: string[] = [];
    let page = `**Your chassis**\nChassis limit: ${chassis.length} of ${limit}\n`;
    for (const entry of entries) {
        if (page.length + entry.length + 2 > 3900) {
            pages.push(page);
            page = '';
        }
        page += `${page ? '\n' : ''}${entry}`;
    }
    pages.push(page);

    await interaction.reply({embeds: [chassisEmbed(pages[0])], flags: MessageFlags.Ephemeral});
    for (const remainingPage of pages.slice(1)) {
        await interaction.followUp({embeds: [chassisEmbed(remainingPage)], flags: MessageFlags.Ephemeral});
    }
}
