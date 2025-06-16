import {client} from "./bot/client";
import dotenv from "dotenv";
import {registerHandlers} from "./bot/handlers";

dotenv.config();

registerHandlers(client);
client.login(process.env.BOT_TOKEN);