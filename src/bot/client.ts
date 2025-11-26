import {GatewayIntentBits} from 'discord.js';
import {ClientExtended} from '@models/discord.js';

export const client = new ClientExtended({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ]
});