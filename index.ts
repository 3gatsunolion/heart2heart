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

// Skull
// 3-6 players
// card menu: 1) Not your turn --> disable everything 2) Your turn. --> (flower x 3) (skull x 1), place bid
// each time you put one down, everyone sees it in the discard placement
// when player hits bid, modal pops up and they put in start bid. then
// new message is sent with ("Oshi challenged 4. Message any higher bids.")
// pass to speed up the progress
// erase once bidding is over.
// if successful --> give player congrats
// if unsuccessful --> randomly take away one of their cards, clear mats
// start new round: 1) Setup. ask all players to place one card. give them 20 seconds. 2)
// starting player (player who killed the last person or last challenger) place or bid.
// Check for elimination (no cards left)

// @Oshi invites everyone to a scheming game of Skulls. Who wants to play? React with '' if you want to join in on the fun!
// Players

// Flashcards
// Test (rapid) --> test on how to write the pingyin or multiple choice on meaning
// --> highscore
// --> community comment on how to remember (), stories, ou duan si lian
// dashboard, stats, create own flashcard set, favourite chengyus
// search
// community look at other people's flashcards (daily conversation, idoms that begin with)
// filter, randomize


// Customizable prefix per server/guild through caching and MongoDB
// Implemented popular board games like No Thanks! and Regicide for users in Discord servers to play alone or with each other
// Used NodeJs to build bot and all game logic
// hosted on railway.app
