/* eslint-disable no-inner-declarations */
import { Collection, Client, Message, MessageEmbed } from 'discord.js';
import { bold, inlineCode, codeBlock } from '@discordjs/builders';
import { Colours } from '../../utils/colours';
import { GeneralCommandData, GameCommandData, CommandData, CommandCategory } from '../../utils/commands/types';
import { GAMES } from '../../utils/commands/constants';
import { getCommandCategoryEmoji } from '../../utils/commands/getCommandCategoryEmoji';

const name = 'help'
export const data: GeneralCommandData = {
    category: 'Information',
    name,
    aliases: [],
    description: 'Get help on the commands of this bot.',
    usage: (prefix: string) => `Use ${inlineCode(prefix + name + ' <command>')} to get more detailed information about a command.`,
}

async function sendCommandHelpMessage(bot: Client, message: Message, args: string[], prefix: string) {
    if (bot.commands.has(args[0]) || bot.aliases.has(args[0])) {
        async function dfs(start: number, command: CommandData, currArgs: string[]) {
            const commandString = currArgs.join(' ')
            // Base case: valid command
            if (start === args.length) {
                const embed = new MessageEmbed()
                    .setColor(Colours.DEFAULT)
                const aliasesString = command.aliases.length === 0 ? 'No aliases' : `${command.aliases.map(a => inlineCode(a)).join(', ')}`
                if (currArgs.length === 1 && command.category === GAMES) {
                    command = command as GameCommandData
                    const numPlayersString = command.minPlayers === command.maxPlayers ? `${command.minPlayers}` : `${command.minPlayers} to ${command.maxPlayers}`
                    embed.setTitle(bold(command.title))
                        .setDescription(`${bold('📒 Info')}\n${bold('Name:')} ${inlineCode(command.name)}\n${bold('Aliases: ')}${aliasesString}\n${bold('Number of Players: ')}${numPlayersString}\n${bold('Playing Time:')} ${command.playTime}\n\n${bold('📝 Description')}\n${command.description}`)
                } else {
                    command = command as GeneralCommandData
                    embed.setTitle(`${bold(prefix + commandString)}`)
                        .setDescription(`${bold('📒 Info')}\n${bold('Name: ')}${inlineCode(command.name)}\n${bold('Aliases: ')}${aliasesString}\n${bold('Description: ')}${command.description}\n\n${'✍️ Example'}\n${command.usage(prefix)}`)
                }
                await message.channel.send({ embeds: [embed] })
                return
            }
            if (!command.options) {
                return await message.channel.send(`The command ${bold(commandString)} has no options.`)
            } else if (!command.options.has(args[start])) {
                return await message.channel.send(`The command ${bold(commandString)} has no option named ${bold(args[start])}.`)
            }
            const newCommand = command.options.get(args[start]) as CommandData
            currArgs.push(newCommand.name)
            await dfs(start + 1, newCommand, currArgs)
            currArgs.pop()
        }
        const command = bot.commands.get(args[0]) || bot.commands.get(bot.aliases.get(args[0])!)
        if (!command) return
        dfs(1, command, [command.name])
    } else {
        return await message.channel.send(`The command **${args[0]}** does not exist.`)
    }
}

export const execute = async (bot: Client, message: Message, args: string[]) => {
    try {
        const prefix = bot.prefix.get(message.guild!.id) as string
        if (args.length > 0) {
            await sendCommandHelpMessage(bot, message, args, prefix)
        } else {
            const commandsByCategory = new Collection<CommandCategory, string>()
            bot.commands.forEach((command) => {
                if (command.name === name) return
                if (!commandsByCategory.has(command.category)) {
                    commandsByCategory.set(command.category, `• ${inlineCode(command.name)}`)
                } else {
                    const commandList = commandsByCategory.get(command.category)
                    commandsByCategory.set(command.category, commandList + '\n' + `• ${inlineCode(command.name)}`)
                }
            })
            const embed = new MessageEmbed()
                .setColor(Colours.DEFAULT)
                .setTitle(bold('Command List'))
                .setDescription(`For more detailed information about a command use: ${codeBlock(prefix + name + ' <command>')}`)
            for (const [category, commandList] of commandsByCategory.entries()) {
                embed.addField(`${getCommandCategoryEmoji(category)} ${category}`, commandList)
            }
            await message.channel.send({ embeds: [embed] })
        }
    } catch (error) {
        console.error(error)
    }
}
