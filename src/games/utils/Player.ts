import { MessageComponentInteraction, Snowflake, User } from 'discord.js';
import Game from './Game';

export default class Player {
    /**
     * The Discord user of this player.
     */
    public user: User
    /**
     * Is this player the host of the game?
     */
    public isHost: boolean
    /**
     * The unique id of this player.
     */
    public id: Snowflake
    /**
     * The game object this player belongs in.
     */
    public game: Game

    /**
     * Constructs a new player of the game.
	 *
	 * @param user: the Discord user object
	 * @param game: the game object
	 * @param isHost: whether or not this player is the host of the game
     */
    constructor(user: User, game: Game, isHost: boolean) {
        this.user = user
        this.id = user.id
        this.isHost = isHost
        this.game = game
    }

    /**
     * Returns whether or not it is the player's turn to make a move.
     */
    public isItPlayersTurn(): boolean {
        return this.game.players[this.game.currPlayerIdx] === this
    }

    /**
     * Returns the string representation of this player (their username).
     */
    public toString(): string {
        return this.user.username
    }

    /**
     * Leaves the game.
     */
    public leaveGame(interaction: MessageComponentInteraction) {
        return
    }
}
