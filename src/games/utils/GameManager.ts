import { Collection, Snowflake, Message, MessageEmbed, MessageComponentInteraction, Interaction } from 'discord.js';
import Game from './Game';
import Player from './Player';
import { Colours } from '../../utils/colours';

export default class GameManager {
    /**
     * Collection of games managed by the instance.
     */
    public games: Collection<Snowflake, Game>

    /**
     * Creates the game state manager.
     */
    constructor() {
        this.games = new Collection()
    }

    /**
     * Checks if a new game of No Thanks! can be created in the channel.
     *
     * @param command: message tunnel that initiated the request
     */
    public async canCreateNewGame(command: Message): Promise<boolean> {
        // Check if there is an active game in this channel already
        if (this.games.has(command.channelId)) {
            const game = this.games.get(command.channelId) as Game
            if (game.host.id === command.author.id) {
                await command.channel.send('It appears you\'re currently the host of this game in this channel already.')
                // await this.sendErrorMessage(command, 'It appears you\'re currently the host of this game in this channel already.')
            }
            else {
                await command.channel.send(`Sorry, there is already an active game in this channel. You can try starting a game in another channel or ask the host, <@${game.host.id}>, to end the current game.`)
                // await this.sendErrorMessage(interaction, `Sorry, there is already an active game in this channel. You can try starting a game in another channel or ask the host, <@${game.host.id}>, to end the current game.`)
            }
            return false
        }
        return true
    }

    /**
     * Creates a new game.
	 *
	 * @param command: the command message object that prompted this initialization
     * @param prefix: the prefix for this bot in this guild the command was sent
     */
    public async createGame(command: Message, prefix: string): Promise<void> {
        if (!(await this.canCreateNewGame(command))) return

        const game = new Game(command.author, command.channelId, prefix)
        this.games.set(command.channel!.id, game)

        game.sendGameInvite(command)
        game.on('gameover', this.removeGame.bind(this))
        game.on('error', this.sendErrorMessage.bind(this))
    }

    /**
     * Finds game that user is currently in, if it exists.
	 *
	 * @param interaction: the command message object that prompted this initialization
     */
    public async findGameWithUser(interaction: MessageComponentInteraction | Message): Promise<undefined | [Game, Player]> {
        if (!this.games.has(interaction.channelId)) {
            await this.sendErrorMessage(interaction, 'Uh oh! It appears something went wrong. The game you\'re looking for does not exist.')
            return
        }
        const game = this.games.get(interaction.channelId) as Game

        // Check if the user is in this game
        const user = interaction instanceof MessageComponentInteraction ? interaction.user : interaction.author
        const index = game.players.findIndex(p => p.id === user.id)
        if (index === -1) {
            await this.sendErrorMessage(interaction, 'You are not in the game that is currently going on in this channel.')
            return
        }
        return [game, game.players[index]]
    }

    /**
     * Starts the game. (Only the host can do this action)
	 *
	 * @param interaction: the interaction (i.e. user pressing the 'Start' button) that triggered this action
     */
    public async startGame(interaction: MessageComponentInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (res) {
            const game = res[0] as Game
            if (game.host.id === interaction.user.id) {
                game.start(interaction)
            } else {
                this.sendErrorMessage(interaction, 'Sorry, but only the host can start the game.')
            }
        }
    }

    /**
     * Ends the game. (Only the host can do this action)
	 *
	 * @param interaction: the interaction (i.e. user pressing the 'End game' button) that triggered this action
     */
    public async endGame(interaction: MessageComponentInteraction | Message): Promise<void> {
        const user = interaction instanceof MessageComponentInteraction ? interaction.user : interaction.author
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const game = res[0] as Game
        if (game.host.id === user.id) {
            await game.end(false)
            if (interaction instanceof Message) {
                interaction.channel.send('The game is over.')
            }
        } else {
            this.sendErrorMessage(interaction, 'Sorry, but only the host can cancel the game.')
        }
    }

    /**
     * Removes a player who wishes to leave from the game.
	 *
	 * @param interaction: the interaction (i.e. user pressing the 'Leave Game' button) that triggered this action
     */
    public async leaveDuringGame(interaction: MessageComponentInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [Game, Player]
        if (game.host.id === interaction.user.id) {
            this.sendErrorMessage(interaction, `Sorry, but the host cannot leave the game. Click **'End Game'** or use command \`${game.prefix}${game.command} end\` to end the game.`)
            return
        }
        await interaction.deferUpdate()
        player.leaveGame(interaction)
    }

    /**
     * Removes game from the collection of games in this manager.
     */
    public removeGame(gameId: string): void {
        this.games.delete(gameId)
    }

    /**
     * Sends an error message to the user.
	 *
	 * @param interaction: the interaction that triggered this action
	 * @param message: the error message to send to user
     */
    public async sendErrorMessage(interaction: MessageComponentInteraction | Message, message: string) {
        const embed = new MessageEmbed()
            .setColor(Colours.RED)
            .setTitle('**Error**')
            .setDescription(message)
        if (interaction instanceof MessageComponentInteraction) {
            return interaction.reply({ embeds: [embed], ephemeral: true })
        } else {
            return interaction.channel.send({ embeds: [embed] })
        }
    }

    /**
     * Handles all interactions of this game.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public handleInteraction(interaction: Interaction): void {
        return
    }
}
