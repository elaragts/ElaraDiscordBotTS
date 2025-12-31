import {client} from '@bot/client.js';
import dotenv from 'dotenv';
import {registerHandlers} from '@bot/handlers.js';
import {validateConfig} from '@utils/config.js';
import {initializeDatatable} from '@utils/datatable.js';
import {initializeDatabase} from "@database/index.js";

dotenv.config();
validateConfig();
initializeDatatable();
await initializeDatabase();
await registerHandlers(client);
client.login(process.env.BOT_TOKEN);