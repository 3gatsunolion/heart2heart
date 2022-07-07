import { Client } from 'discord.js';

export default async function onReady(bot: Client) {
    console.info(`${bot.user!.username} is connected.`);
    bot.user!.setActivity(`${process.env.PREFIX || '?'}help | 💕`, { type: 'PLAYING' })
}
