import { Client, Message } from 'discord.js';
import Guild, { maxPrefixLength } from '../../models/GuildSchema';

const name = 'setprefix'
export const data = {
    category: 'Settings',
    name,
    aliases: ['sp', 'prefix'],
    description: 'Set the prefix for this server.',
    usage: (prefix: string) => `\`${prefix}${name} *\` sets the prefix to \`*\``,
}

export const execute = async (bot: Client, message: Message, args: string[]) => {
    try {
        const newPrefix = args[0]
        // Validate new prefix
        if (!newPrefix) {
            await message.channel.send('❌ You didn\'t specify a prefix.')
            return
        }
        if (newPrefix.length > maxPrefixLength) {
            await message.channel.send(`❌ Prefix cannot be longer than ${maxPrefixLength} characters.`)
            return
        }
        let guild = await Guild.findOne({ id: message.guild!.id })
        if (!guild) {
            guild = await Guild.create({ id: message.guild!.id, prefix: process.env.PREFIX || '?' })
        }
        guild.prefix = newPrefix
        await guild.save()
        bot.prefix.set(message.guild!.id, newPrefix)
        await message.channel.send(`✅ Prefix successfully set to \`${newPrefix}\` for this server!`)
    } catch (error) {
        console.error(error)
    }
}
