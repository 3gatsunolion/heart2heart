declare module 'discord.js' {
    export interface Client {
      commands: Collection<string, Command>
      aliases: Collection<string, string>
      prefix: Collection<Snowflake, string>
      gameManagers: Collection<Snowflake, GameManager>
    }
}
import dotenv from 'dotenv';
dotenv.config();

import { Client, Collection, Snowflake, Intents } from 'discord.js';
import mongoose from 'mongoose';
import GameManager from './src/games/utils/GameManager';
import { Command } from './src/utils/commands/types';
import { registerCommands } from './src/utils/commands/registerCommands';
import { registerEvents } from './src/utils/events/registerEvents';

const client = new Client({
    intents:[
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        // Intents.FLAGS.DIRECT_MESSAGES,
    ],
});

client.commands = new Collection()
client.aliases = new Collection()
client.gameManagers = new Collection()
client.prefix = new Collection()

const MONGODB_URI = process.env.NODE_ENV === 'development' ? 'mongodb://localhost/heart2heart' : process.env.MONGODB_URI!
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Successfully connected to database!'))
    .catch((error) => { console.error(error) })

client.login(process.env.TOKEN);

registerCommands(client)
registerEvents(client)
