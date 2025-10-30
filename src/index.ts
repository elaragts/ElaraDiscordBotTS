import dotenv from 'dotenv';
dotenv.config();

import {client} from '@bot/client.js';
import {registerHandlers} from '@bot/handlers.js';
import {validateConfig} from '@utils/config.js';
import {initializeDatatable} from '@utils/datatable.js';
import {initializeDatabase} from "@database/index.js";

validateConfig();
initializeDatatable();
await initializeDatabase();
await registerHandlers(client);
await client.login(process.env.BOT_TOKEN);