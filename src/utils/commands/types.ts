import { Collection, Message, Client } from 'discord.js';
import { GAMES, INFORMATION, SETTINGS } from './constants';

type Usage = (prefix: string) => string
export type CommandExecute = (bot: Client, message: Message, args: string[]) => Promise<void>

export interface BaseCommandData {
    category: CommandCategory
    name: string
    aliases: string[]
    description: string
}

export interface GeneralCommandData extends BaseCommandData {
    usage: Usage
    options?: Collection<string, GeneralCommandData>
}

export interface GameCommandData extends BaseCommandData {
    category: typeof GAMES
    title: string
    minPlayers: number
    maxPlayers: number
    playTime: string
    options?: Collection<string, GeneralCommandData>
}

export type CommandData = GeneralCommandData | GameCommandData

export interface GeneralCommand extends GeneralCommandData {
    execute: CommandExecute
}

export interface GameCommand extends GameCommandData {
    execute: CommandExecute
}

export type Command = GeneralCommand | GameCommand

export type CommandCategory = typeof GAMES | typeof INFORMATION | typeof SETTINGS
