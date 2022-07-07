import { Client, Message, Collection } from 'discord.js';
import Guild from '../models/GuildSchema';

export default async function onMessageCreate(bot: Client, message: Message) {
    try {
        if (message.author.bot || !message.guild) return

        // Cache
        if (!bot.prefix) {
            bot.prefix = new Collection()
        }
        if (!bot.prefix.has(message.guild!.id)) {
            const guild = await Guild.findOne({ id: message.guild!.id })
            if (!guild || !guild.prefix) {
                bot.prefix.set(message.guild!.id, process.env.PREFIX || '?')
            } else {
                bot.prefix.set(message.guild!.id, guild.prefix)
            }
        }
        const prefix = bot.prefix.get(message.guild!.id) as string
        // console.log('prefix:', prefix)
        if (!message.content.startsWith(prefix)) return

        const tokens = message.content.split(' ')
        const commandName = tokens[0].slice(prefix.length).toLowerCase()
        const args = tokens.slice(1)

        const command = bot.commands.get(commandName) || bot.commands.get(bot.aliases.get(commandName)!)

        if (!command) return;

        await command.execute(bot, message, args)
    } catch (error) {
        console.error(error);
        await message.reply({ content: 'There was an error while executing this command!' })
    }
}
