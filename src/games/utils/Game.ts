import { Snowflake, User, Message, MessageComponentInteraction } from 'discord.js';
import { EventEmitter } from 'events';
import Player from './Player';

export default class Game extends EventEmitter {
    /**
     * The game command to create game.
     */
    public readonly command: string = 'game'
    /**
     * The unique channel id this game resides in.
     */
    public channelId: Snowflake
    /**
     * The prefix for this bot in this guild where the game resides.
     */
    public prefix: string
    /**
     * The player who created this game.
     */
    public host: Player
    /**
     * Stores all active players currently in the game.
     */
    public players: Array<Player>
    /**
     * Stores all players who left during the game.
     */
    public playersWhoLeft: Array<Player>
    /**
     * The index of the current player whose turn it is.
     */
    public currPlayerIdx: number
    /**
     * Indicates whether the game has officially started yet.
     */
    public hasStarted: boolean
    /**
     * Indicates whether the game is over.
     */
    public isGameOver: boolean
    /**
     * The timer that makes sure to end the game if the game has been inactive
	 * for a certain period of time.
     */
    // eslint-disable-next-line no-undef
    public inactivityTimer!: NodeJS.Timeout

    /**
     * Constructs a new game instance.
     *
     * @param user: user that initialized the game
	 * @param channelId: id of the channel the game is in
     * @param prefix: the prefix used in this server
     */
    constructor(user: User, channelId: string, prefix: string) {
        super()

        this.channelId = channelId
        this.prefix = prefix
        this.host = new Player(user, this, true)
        this.players = [this.host] // On initialization, host is only player
        this.playersWhoLeft = []
        this.currPlayerIdx = 0 // host starts first
        this.hasStarted = false
        this.isGameOver = false
    }

    /**
     * Sends the game invite message.
	 *
	 * @param command: the command message object that prompted this action.
     */
    public async sendGameInvite(command: Message): Promise<void> {
		command.channel!.send('Let\'s play a game!')
    }

    /**
	 * Retrieves the player whose turn it is.
	 */
    public get currPlayer(): Player {
        return this.players[this.currPlayerIdx]
    }

    /**
	 * Retrieves the number of players playing this game.
	 */
    public get numPlayers(): number {
        return this.players.length
    }

    /**
     * Moves on to the next player's turn.
     */
    public nextPlayer(): void {
        this.currPlayerIdx = (this.currPlayerIdx + 1) % this.numPlayers
    }

    /**
     * Officially starts the game.
	 *
	 * @param interaction: the interaction (i.e. player pressing the start button)
	 * that triggered the start of this game
     */
    public async start(interaction: MessageComponentInteraction): Promise<void> {
        this.resetInactivityTimer()
    }

    /**
     * Ends the game.
     */
    public async end(isInactive: boolean): Promise<void> {
        this.emit('gameover', this.channelId)
    }

    /**
     * Adds player to the game.
     */
    public addPlayer(user: User): void {
        const player = new Player(user, this, false)
        this.players.push(player)
    }

    /**
     * Removes player from the game.
     */
    public removePlayer(user: User): void {
        const index = this.players.findIndex(p => p.id === user.id)
        if (index === -1) {
            return
        }
        // Update currPlayerIndex
        if (index < this.currPlayerIdx) {
            this.currPlayerIdx -= 1
        }
        const removed = this.players.splice(index, 1)
        this.currPlayerIdx = this.currPlayerIdx >= this.numPlayers ? 0 : this.currPlayerIdx
        if (this.hasStarted) {
            this.playersWhoLeft.push(removed[0])
        }
        // Check if game is over
        this.checkIfGameIsOver()
    }

    /**
     * Checks if the game is finished or not.
     */
    public checkIfGameIsOver(): boolean {
        if (!this.hasStarted) return false
        return this.isGameOver
    }

    /**
     * Resets the inactivity timer.
     */
    public resetInactivityTimer(): void {
        if (this.inactivityTimer) {
            this.inactivityTimer.refresh()
        }
    }
}
