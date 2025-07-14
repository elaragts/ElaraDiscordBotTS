import {GatewayIntentBits} from "discord.js";
import {ClientExtended} from "../models/discord";

export const client = new ClientExtended({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ]
});