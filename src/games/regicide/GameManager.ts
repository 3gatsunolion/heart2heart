import { Collection, Snowflake, Message, MessageComponentInteraction, SelectMenuInteraction, Interaction } from 'discord.js';
import GameManager from '../utils/GameManager';
import RegicideGame from './Game';
import RegicidePlayer from './Player';

const interactionIds = new Set(
    [
        'regicide_start',
        'regicide_end',
        'regicide_cancel',
        'regicide_leave_during_game',
        'regicide_view_cards',
        'regicide_play_cards',
        'regicide_discard_cards',
        'regicide_yield',
        'regicide_play_jester',
        'regicide_select_cards',
    ],
)

export default class RegicideGameManager extends GameManager {
    /**
    * Collection of Regicide games managed by the instance.
    */
    declare games: Collection<Snowflake, RegicideGame>

    /**
    * Creates the Regicide game state manager.
    */
    constructor() {
        super()
    }

    /**
     * Creates a new game of Regicide.
	 *
	 * @param command: the command message object (?regicide) that prompted this initialization
     * @param prefix: the prefix for this bot in this guild the command was sent
     */
    public async createGame(command: Message, prefix: string): Promise<void> {
        if (!(await this.canCreateNewGame(command))) return

        const game = new RegicideGame(command.author, command.channelId, prefix)
        this.games.set(command.channel!.id, game)

        game.sendGameInvite(command)
        game.on('gameover', this.removeGame.bind(this))
        game.on('error', this.sendErrorMessage.bind(this))
    }

    /**
     * Carries out the action of a player selecting the cards in the select menu.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async selectCards(interaction: SelectMenuInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [RegicideGame, RegicidePlayer]
        if (!interaction.deferred) {
            await interaction.deferUpdate()
        }
        const cardIndices = []
        for (const value of interaction.values) {
            const index = value.lastIndexOf('_')
            const cardId = value.substring(0, index)
            const cardIndex = parseInt(value.substring(index + 1))
            // If player does not have this card, then something went wrong
            // (player might have clicked on an old outdated card menu) so just return
            if (!player.hasCard(cardId, cardIndex)) {
                return
            }
            cardIndices.push(cardIndex)
        }
        player.selectCards(cardIndices)
    }

    /**
     * Carries out the action of a player playing the cards selected in the select menu.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async playCards(interaction: MessageComponentInteraction): Promise<void> {
        // Make sure player's turn and turn phase is attack phase and not jester voting phase
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [RegicideGame, RegicidePlayer]
        // await interaction.deferUpdate()
        player.playCards(interaction)
    }

    /**
     * Carries out the action of a player choosing to yield in the game.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async yield(interaction: MessageComponentInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [RegicideGame, RegicidePlayer]
        await interaction.deferUpdate()
        player.yield(interaction)
    }

    /**
     * Carries out the action of a player playing a jester card in a single player game.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async playJester(interaction: MessageComponentInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [RegicideGame, RegicidePlayer]
        await interaction.deferUpdate()
        player.playJester(interaction)
    }

    /**
     * Carries out the action of a player discarding the selected cards.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async discardCards(interaction: MessageComponentInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [RegicideGame, RegicidePlayer]
        // await interaction.deferUpdate()
        player.sufferDamage(interaction)
    }

    /**
     * Sends an ephemeral message to player that displays their cards and turn options.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async showCardMenu(interaction: MessageComponentInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [RegicideGame, RegicidePlayer]
        player.sendCardMenu(interaction)
    }

    /**
     * Handles all interactions of this game.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public handleInteraction(interaction: Interaction): void {
        if (!interaction.isButton() && !interaction.isSelectMenu()) {
            return
        }
        const id = interaction.customId
        if (!id.startsWith('regicide') || !interactionIds.has(interaction.customId)) {
            return
        }

        if (interaction.isButton()) {
            switch (id) {
                case ('regicide_start'):
                    this.startGame(interaction)
                    break
                case ('regicide_end'):
                case ('regicide_cancel'):
                    this.endGame(interaction)
                    break
                case ('regicide_leave_during_game'):
                    this.leaveDuringGame(interaction)
                    break
                case ('regicide_view_cards'):
                    this.showCardMenu(interaction)
                    break
                case ('regicide_play_cards'):
                    this.playCards(interaction)
                    break
                case ('regicide_discard_cards'):
                    this.discardCards(interaction)
                    break
                case ('regicide_yield'):
                    this.yield(interaction)
                    break
                case ('regicide_play_jester'):
                    this.playJester(interaction)
                    break
                default:
                    break
            }
        }

        if (interaction.isSelectMenu()) {
            if (id === 'regicide_select_cards') {
                this.selectCards(interaction)
            }
        }
    }
}
