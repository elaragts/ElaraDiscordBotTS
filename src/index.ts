import {client} from "./bot/client";
import dotenv from "dotenv";
import {registerHandlers} from "./bot/handlers";
import {validateConfig} from "./utils/config";
import {initializeDatatable} from "./utils/datatable";

dotenv.config();
validateConfig();
initializeDatatable();
registerHandlers(client);
client.login(process.env.BOT_TOKEN);