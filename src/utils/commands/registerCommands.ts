import { Client, Message } from 'discord.js';
import GameManager from '../../games/utils/GameManager';
import { CommandData, CommandExecute, Command } from './types';
import fs from 'fs';
import path from 'path';

async function executeGameCommand(bot: Client, message: Message, args: string[], command: string) {
    try {
        if (!bot.gameManagers.has(command)) return
        const manager = bot.gameManagers.get(command) as GameManager
        const prefix = bot.prefix.get(message.guild!.id) as string
        if (args.length === 0) {
            manager.createGame(message, prefix)
        } else if (args.length === 1 && (args[0] === 'end' || args[0] === 'e')) {
            manager.endGame(message)
        }
    } catch (error) {
        console.error(error)
    }
}

function generateCommand(data: CommandData, execute: CommandExecute): Command {
    const command = Object.assign({}, data, { execute: execute })

    if (command.options && command.options.size > 0) {
        for (const commandOption of command.options.values()) {
            const optionData = Object.assign({}, commandOption)
            for (const alias of optionData.aliases) {
                command.options.set(alias, optionData)
            }
        }
    }

    return command
}

export function registerCommands(bot: Client) {
    // const gamesPath = path.join(__dirname, 'src/games')
    const gamesPath = path.join(__dirname, '..', '..', 'games')
    const gameDirs = fs.readdirSync(gamesPath).filter(dir => dir !== 'utils')
    for (const game of gameDirs) {
        try {
            const dirPath = path.join(gamesPath, game)
            const files = fs.readdirSync(dirPath)
            const gameFile = files.filter(f => f.split('.')[0] === 'Game')
            const gameManagerFile = files.filter(f => f.split('.')[0] === 'GameManager')
            if (gameFile.length === 0 || gameManagerFile.length === 0) continue
            const filePath = path.join(dirPath, gameFile[0])

            const { data } = require(filePath)
            const execute = async (client: Client, message: Message, args: string[]) => { executeGameCommand(client, message, args, data.name) }

            const managerPath = path.join(dirPath, gameManagerFile[0])
            const { default: Manager } = require(managerPath)
            if (!bot.gameManagers.has(data.name)) {
                bot.gameManagers.set(data.name, new Manager())
            }

            bot.commands.set(data.name, generateCommand(data, execute))
            for (const alias of data.aliases) {
                bot.aliases.set(alias, data.name)
            }
        } catch (error) {
            console.error(error)
        }
    }

    // const commandsPath = path.join(__dirname, 'src/commands')
    const commandsPath = path.join(__dirname, '..', '..', 'commands')
    fs.readdirSync(commandsPath).forEach((dir) => {
        const dirPath = path.join(commandsPath, dir)
        const commandFiles = fs.readdirSync(dirPath).filter(file => file.endsWith('.ts'))
        for (const file of commandFiles) {
            try {
                const filePath = path.join(dirPath, file)
                const { data, execute } = require(filePath)
                bot.commands.set(data.name, generateCommand(data, execute))
                for (const alias of data.aliases) {
                    bot.aliases.set(alias, data.name)
                }
            } catch (error) {
                console.error(error)
            }
        }
    })
}
