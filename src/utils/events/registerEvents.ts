import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';

export async function registerEvents(bot: Client) {
    const eventsPath = path.join(__dirname, '..', '..', 'events')
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts'))
    for (const eventFile of eventFiles) {
        try {
            const event = eventFile.split('.')[0]
            const filePath = path.join(eventsPath, eventFile)
            const { default: handler } = require(filePath)
            bot.on(event, handler.bind(null, bot))
        } catch (error) {
            console.error(error)
        }
    }
}
