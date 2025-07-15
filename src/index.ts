import {client} from '@bot/client.js';
import dotenv from 'dotenv';
import {registerHandlers} from '@bot/handlers.js';
import {validateConfig} from '@utils/config.js';
import {initializeDatatable} from '@utils/datatable.js';

dotenv.config();
validateConfig();
initializeDatatable();
registerHandlers(client);
client.login(process.env.BOT_TOKEN);