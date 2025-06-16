import { ExtendedClient } from '../models/discord';
import { Client } from 'discord.js';

export const getExtendedClient = (client: Client): ExtendedClient => client as ExtendedClient;
