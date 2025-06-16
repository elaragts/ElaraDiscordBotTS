import {GatewayIntentBits} from "discord.js";
import {ExtendedClient} from "../models/discord";

export const client = new ExtendedClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ]
});