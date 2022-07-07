import { Client } from 'discord.js';

export default async function onReady(bot: Client) {
    console.info(`${bot.user!.username} is connected.`);
    // https://github.com/discord/discord-api-docs/issues/834 --> presence disappears every ~2 hours,
    // so reset every 1 hour
    setInterval(() => {
        bot.user!.setActivity(`${process.env.PREFIX || '?'}help | 💕`, { type: 'PLAYING' })
    }, 1000 * 60 * 60)
}
