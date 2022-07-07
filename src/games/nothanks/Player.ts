import { MessageEmbed, MessageActionRow, MessageButton, User, MessageComponentInteraction, InteractionReplyOptions } from 'discord.js';
import Card from './Card';
import NoThanksGame from './Game';
import Player from '../utils/Player';
import { PLACE_CHIP, TAKE_CARD } from './turnType';

export default class NoThanksPlayer extends Player {
    /**
     * The game object this player belongs in.
     */
    declare game: NoThanksGame
    /**
     * The number of chips the player currently has.
     */
    public numChips: number
    /**
     * The card numbers the player currently has.
     */
    public cards: Array<number>
    /**
     * The ephemeral message that displays the player's cards and chip info.
     */
    public cardAndChipMenu: MessageComponentInteraction | null

    /**
     * Constructs a new player of the No Thanks! game.
	 *
	 * @param user: the Discord user object
	 * @param game: the No Thanks! game object
	 * @param isHost: whether or not this player is the host of the game
     */
    constructor(user: User, game: NoThanksGame, isHost: boolean) {
        super(user, game, isHost)

        this.game = game
        this.numChips = 11
        this.cards = []
        this.cardAndChipMenu = null
    }

    /**
     * Places a chip on the current card.
	 * If the player has 0 chips left, they must take the card.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async placeChip(interaction: MessageComponentInteraction): Promise<void> {
        if (!this.isItPlayersTurn()) return
        if (this.numChips > 0) {
            this.numChips--
            this.game.executeTurn(interaction, PLACE_CHIP)
        } else {
            // Player must take the card, since they have no chips left
            this.takeCard(interaction)
        }
    }

    /**
     * Inserts a card to player's deck, preserving the ascending order.
	 *
	 * @param card: the card to insert
     */
    private insertCard(card: Card): void {
        // Perform binary search to find correct place to insert card
        // if card is cannot be inserted at the front or pushed at end of deck
        const numCards = this.cards.length
        if (numCards === 0 || (numCards > 0 && card.val > this.cards[numCards - 1])) {
            this.cards.push(card.val)
            return
        }
        let index = 0
        if (numCards > 0 && card.val > this.cards[0]) {
            let [l, r] = [0, numCards - 1]
            while (l <= r) {
                const mid = Math.floor((l + r) / 2)
                if (this.cards[mid] === card.val) {
                    index = mid
                    this.cards.splice(index, 0, card.val)
                    return
                } else if (card.val < this.cards[mid]) {
                    r = mid - 1
                } else {
                    l = mid + 1
                }
            }
            index = l
        }
        this.cards.splice(index, 0, card.val)
    }

    /**
     * Takes the current card in play.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async takeCard(interaction: MessageComponentInteraction): Promise<void> {
        if (!this.isItPlayersTurn()) return
        // Place card in order so player can view the cards in ascending order
        this.insertCard(this.game.currCard)
        this.numChips += this.game.currCard.numChips

        this.game.executeTurn(interaction, TAKE_CARD)
    }

    /**
     * Calculates the current total score of the player.
     */
    private calcTotalScore(): number {
        let total = 0
        for (let i = 0; i < this.cards.length; i++) {
            // Runs of two or more cards only count as the lowest value in the run
            // this.cards is already sorted in ascending order
            if (i > 0 && this.cards[i - 1] === this.cards[i] - 1) {
                continue
            }
            total += this.cards[i]
        }
        return total - this.numChips
    }

    /**
     * Gets the total score of the player.
     */
    public get totalScore(): number {
        return this.calcTotalScore()
    }

    private getCardAndChipMenu(): InteractionReplyOptions {
        // Give user option to either take card or place chip for their turn
        const turnOptions = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('nothanks_take_card')
                    .setLabel('Take Card')
                    .setStyle('SECONDARY')
                    .setDisabled(!this.isItPlayersTurn()),
            )
            .addComponents(
                new MessageButton()
                    .setCustomId('nothanks_place_chip')
                    .setLabel('Place Chip 🔴')
                    .setStyle('SECONDARY')
                    .setDisabled(!this.isItPlayersTurn() || this.numChips === 0),
            ) as MessageActionRow
        const menuEmbed = new MessageEmbed()
            .setColor(NoThanksGame.colour)
            .setDescription(`**Your cards are:**\n\`\`\`${this.cards.length > 0 ? this.cards.join(', ') : 'You don\'t have any cards as of now.'}\`\`\``)
            .setThumbnail(this.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '# of 🔴 Left', value: `${this.numChips}`, inline: true },
                { name: 'Current Score 📝', value: `${this.totalScore}`, inline: true },
            )

        return { embeds: [menuEmbed], components: [turnOptions] }
    }

    /**
     * Sends a new ephemeral card and chip menu to player.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async sendCardAndChipMenu(interaction: MessageComponentInteraction) {
        try {

            const messagePayload = this.getCardAndChipMenu()
            const message = this.isItPlayersTurn() ? 'It\'s your turn.' : ''
            if (message) {
                messagePayload.content = message
            }
            messagePayload.ephemeral = true
            await interaction.reply(messagePayload)
            this.cardAndChipMenu = interaction
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Updates the player's card and chip menu.
	 *
	 * @param interaction: the interaction that triggered this action
	 * @param message: the message to display on the ephemeral card menu
     */
    public async updateCardAndChipMenu(interaction: MessageComponentInteraction | null, message: string): Promise<void> {
        if (!this.cardAndChipMenu && !interaction) return

        const messagePayload = this.getCardAndChipMenu()
        if (message) {
            messagePayload.content = message
        } else if (this.isItPlayersTurn()) {
            messagePayload.content = 'It\'s your turn.'
        }
        try {
            if (interaction) {
                await interaction.editReply(messagePayload)
                this.cardAndChipMenu = interaction
            } else {
                await (this.cardAndChipMenu as MessageComponentInteraction).editReply(messagePayload)
            }
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Leaves the game.
     *
     * @param interaction: the interaction that prompted this action
     */
    public async leaveGame(interaction: MessageComponentInteraction): Promise<void> {
        try {
            await this.game.onPlayerLeave(this)
            if (this.cardAndChipMenu) {
                await this.cardAndChipMenu
                    .editReply({ content: 'You left the game. Hope to see you back!', embeds: [], components: [] })
            }
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Updates the player's ephemeral card and chip menu to indicate the game is over.
     */
    public async onGameEnd(): Promise<void> {
        if (this.cardAndChipMenu) {
            try {
                await this.cardAndChipMenu
                    .editReply({ content: 'The game is over. Hope you had fun :heart:', embeds: [], components: [] })
            } catch (error) {
                console.error(error)
            }
        }
    }
}
