import {
    Collection,
    User,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageSelectMenu,
    MessageSelectOptionData,
    InteractionReplyOptions,
} from 'discord.js';
import {
    CLUBS,
    SPADES,
    HEARTS,
    DIAMONDS,
    MONARCH,
    JESTER,
    ATTACK_PHASE,
    SUFFER_DAMAGE_PHASE,
    ANIMAL_COMPANION,
} from './constants';
import Player from '../utils/Player';
import RegicideGame from './Game';
import { Card, getSuitEmoji } from './cards';
import { shuffle } from '../utils/shuffle';

export default class RegicidePlayer extends Player {
    /**
     * The cards this player has in their hand.
     */
    public cards: Card[]
    /**
     * The Regicide game this player belongs to.
     */
    declare game: RegicideGame
    /**
     * Index to card mapping of the cards this player has selected in the menu.
     */
    public cardsSelected: Collection<number, Card>
    /**
     * The ephemeral message that displays the player's cards and turn options.
     */
    public cardMenu: MessageComponentInteraction | null

    /**
     * Constructs a new player of the Regicide game.
     *
     * @param user: the Discord user object
	 * @param game: the Regicide game object
	 * @param isHost: whether or not this player is the host of the game
     */
    constructor(user: User, game: RegicideGame, isHost: boolean) {
        super(user, game, isHost)

        this.cards = []
        this.cardsSelected = new Collection()
        this.cardMenu = null
    }

    /**
     * The maximum number of cards the player can have all at once.
     */
    public get maxHandSize(): number {
        switch (this.game.numPlayers) {
            case 1:
                return 8
            case 2:
                return 7
            case 3:
                return 6
            default:
                return 5
        }
    }

    /**
     * The number of cards this player has.
     */
    public get numCards(): number {
        return this.cards.length
    }

    /**
     * The total health of player based on their cards.
     */
    public get health(): number {
        return this.cards.reduce((sum, card) => {
            return sum + card.health
        }, 0)
    }

    /**
     * Returns whether or not the player has reached their maximum card capacity.
     */
    public hasReachedMaxHandSize(): boolean {
        return this.cards.length === this.maxHandSize
    }

    /**
     * Finds the correct index to insert the given card in to the player's hand,
     * preserving ascending order
	 *
	 * @param card: the card to insert
     */
    private findIndex(card: Card): number {
        // Binary search
        let [l, r] = [0, this.numCards - 1]
        while (l <= r) {
            const mid = Math.floor((l + r) / 2)
            if (this.cards[mid].val === card.val) {
                return mid
            } else if (card.val < this.cards[mid].val) {
                r = mid - 1
            } else {
                l = mid + 1
            }
        }
        return l
    }

    /**
     * Inserts a card to the player's hand, preserving the ascending order.
	 *
	 * @param card: the card to insert
     */
    public insertCard(card: Card): void {
        // Perform binary search to find correct place to insert card
        // if card is cannot be inserted at the front or pushed at end of deck
        const numCards = this.numCards
        if (numCards === 0 || (numCards > 0 && card.val >= this.cards[numCards - 1].val)) {
            this.cards.push(card)
            return
        }
        let index = 0
        if (numCards > 0 && card.val > this.cards[0].val) {
            index = this.findIndex(card)
        }
        this.cards.splice(index, 0, card)
    }

    /**
     * Removes the cards specified at the given indices.
	 *
	 * @param cardIndices: the indices of the cards to remove
     */
    public removeCards(cardIndices: number[]): void {
        // Sort indices in descending order so we can remove the cards
        // at the correct indices
        cardIndices.sort((a, b) => b - a)
        for (const index of cardIndices) {
            this.cards.splice(index, 1)
        }
    }

    /**
     * Returns whether or not player has the specified card.
	 *
	 * @param cardId: string representation of card
     * @param cardIndex: index of card in player's hand
     */
    public hasCard(cardId: string, cardIndex: number): boolean {
        if (cardIndex >= this.cards.length) return false
        const card = this.cards[cardIndex]
        if (card.toString(true) === cardId) {
            return true
        }
        return false
    }

    /**
     * Selects the cards according to the given card indices.
	 *
	 * @param cardIndices: the indices of the cards to select
     */
    public selectCards(cardIndices: number[]): void {
        this.cardsSelected = new Collection()
        for (const i of cardIndices) {
            this.cardsSelected.set(i, this.cards[i])
        }
    }

    /**
     * Clears the player's card selections.
     */
    public clearSelections(): void {
        this.cardsSelected = new Collection
    }

    /**
     * Plays the selected cards in select menu.
	 *
	 * @param interaction: the interaction that triggered the action
     */
    public async playCards(interaction: MessageComponentInteraction): Promise<void> {
        if (!this.isItPlayersTurn() || this.game.turnPhase !== ATTACK_PHASE || this.cardsSelected.size === 0) {
            await interaction.deferUpdate()
            return
        }
        const cards = Array.from(this.cardsSelected.values())
        if (cards.length > 1 && !this.game.isValidCardMove(cards)) {
            this.game.sendInvalidCardMoveMessage(interaction)
            return
        }
        await interaction.deferUpdate()
        const cardIndices = Array.from(this.cardsSelected.keys())
        const uniqueSuits = new Set()
        for (const card of cards) {
            uniqueSuits.add(card.suit)
        }

        // If Jester was played
        if (uniqueSuits.has(null)) {
            this.playJester(interaction)
            return
        }

        this.removeCards(cardIndices)

        // Get total attack value of cards
        let totalAttack = cards.reduce((sum, card) => {
            return sum + card.attackVal
        }, 0)

        // Description of card(s) player played and the effects it did on the enemy
        const cardsString = cards.map(card => card.toString(true)).join(', ')
        let attackDescription = `<@${this.id}> attacked with:\n\`\`\`${cardsString}\`\`\`\n`

        let diamondActivated = false
        const enemy = this.game.currEnemy
        let suitPowersDescription = ''
        // Resolve hearts suit power first
        if (uniqueSuits.has(HEARTS)) {
            const prefix = '❤️‍🩹 **Hearts Activation:** '
            let activation = ''
            if (uniqueSuits.size > 1 && enemy.isImmune(HEARTS)) {
                activation = prefix + enemy.immuneString() + '\n'
            } else if (!enemy.isImmune(HEARTS)) {
                this.game.healFromDiscard(totalAttack)
                activation = prefix + `The Tavern deck has been healed by a maximum of **${totalAttack} cards** from the discard pile.\n`
            }
            suitPowersDescription += activation
        }
        if (uniqueSuits.has(DIAMONDS)) {
            const prefix = '🤲 **Diamonds Activation:** '
            let activation = ''
            if (uniqueSuits.size > 1 && enemy.isImmune(DIAMONDS)) {
                activation = prefix + enemy.immuneString() + '\n'
            } else if (!enemy.isImmune(DIAMONDS)) {
                const total = this.game.drawCards(totalAttack)
                if (total > 0) {
                    // If cards were drawn, then we have to update all player's card menus to reflect this change
                    diamondActivated = true
                }
                activation = prefix + `A maximum of **${totalAttack} cards** have been distributed evenly between all players.\n`
            }
            suitPowersDescription += activation
        }
        if (uniqueSuits.has(SPADES)) {
            const prefix = '🛡 **Spades Activation:** '
            let activation = ''
            if (uniqueSuits.size > 1 && enemy.isImmune(SPADES)) {
                activation = prefix + enemy.immuneString() + '\n'
            } else if (!enemy.isImmune(SPADES)) {
                enemy.reduceAttackVal(totalAttack)
                activation = prefix + `The enemy's attack value has been reduced by **${totalAttack}**.\n`
            }
            suitPowersDescription += activation
        }
        if (uniqueSuits.has(CLUBS)) {
            const prefix = '💥 **Clubs Activation:** '
            let activation = ''
            if (uniqueSuits.size > 1 && enemy.isImmune(CLUBS)) {
                activation = prefix + enemy.immuneString() + '\n'
            } else if (!enemy.isImmune(CLUBS)) {
                totalAttack *= 2
                activation = prefix + `Double whammy!! Your attack value has doubled to **${totalAttack} damage**!\n`
            }
            suitPowersDescription += activation
        }

        if (suitPowersDescription !== '') {
            suitPowersDescription = '**Suit Power(s) Activated!**\n' + suitPowersDescription
        } else if (suitPowersDescription === '') {
            suitPowersDescription = enemy.immuneString() + '\n'
        }
        attackDescription += suitPowersDescription

        this.game.numYieldsInARow = 0

        enemy.sufferDamage(totalAttack)
        attackDescription += `\nA total of **${totalAttack} damage** has been done to the **${enemy.toString(true)}**.`
        this.game.proceedToNextPhase(interaction, attackDescription, cards, diamondActivated) // add cards parameter
    }

    /**
     * Returns whether or not player can play the jester card.
     */
    public canPlayJester(): boolean {
        const canPlay = this.isItPlayersTurn() && this.game.numJestersLeft > 0
        if (this.game.numPlayers > 1) {
            return canPlay && this.game.turnPhase === ATTACK_PHASE
        }
        return canPlay
    }

    /**
     * Plays the Jester card.
	 *
	 * @param interaction: the interaction that triggered the action
     */
    public playJester(interaction: MessageComponentInteraction): void {
        if (!this.canPlayJester()) return

        if (this.game.numPlayers === 1) {
            // Discard and draw 8 new cards
            this.removeCards(this.cards.map((c, i) => i))
            this.game.drawCards(this.maxHandSize)
        } else {
            const cardIndices = Array.from(this.cardsSelected.keys())
            this.removeCards(cardIndices)
        }
        this.game.onJesterPlay(interaction, false)
    }

    /**
     * Returns whether or not the player can yield.
     */
    public canYield(): boolean {
        if (!this.isItPlayersTurn() || this.game.turnPhase !== ATTACK_PHASE) return false
        if (this.game.numPlayers === 1 && this.game.numYieldsInARow > 0) {
            return false
        } else if (this.game.numPlayers === 1 && this.game.numYieldsInARow === 0) {
            return true
        } else if (this.game.numPlayers > 1 && this.game.numYieldsInARow === this.game.numPlayers - 1) {
            return false
        } else {
            return true
        }
    }

    /**
     * Performs yielding action. Player will immediately go to the suffer damage phase.
	 *
	 * @param interaction: the interaction that triggered the yield action
     */
    public yield(interaction: MessageComponentInteraction): void {
        // Send error 'You cannot yield.'
        if (!this.canYield()) return
        this.game.numYieldsInARow++
        const description = `<@${this.id}> has yielded.`
        // Update card menu to discard
        this.game.proceedToNextPhase(interaction, description, [], false)
    }

    /**
     * Suffers the damage from current enemy monarch by discarding the selected cards.
	 *
	 * @param interaction: the interaction that triggered the discarding action
     */
    public async sufferDamage(interaction: MessageComponentInteraction): Promise<void> {
        try {
            if (!this.isItPlayersTurn() || this.game.turnPhase !== SUFFER_DAMAGE_PHASE) {
                await interaction.deferUpdate()
                return
            }
            const total = Array.from(this.cardsSelected.values()).reduce((sum, c) => {
                return sum + c.attackVal
            }, 0)
            if (total < this.game.currEnemy.attackVal) {
                this.game.emit('error', interaction, 'You must discard cards from your hand with a total value at least equal to the enemy\'s attack value.')
                return
            }
            await interaction.deferUpdate()
            const cardIndices = Array.from(this.cardsSelected.keys())
            const cards = Array.from(this.cardsSelected.values())
            this.removeCards(cardIndices)
            await this.game.proceedToNextPhase(interaction, `<@${this.id}> suffered **${this.game.currEnemy.attackVal} damage**.`, cards, false)
            // if (this.game.numPlayers > 1) {
            //     await this.updateCardMenu(interaction, '')
            // }
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Returns the message to be displayed in player's card menu.
     */
    private getCardMenuMessage(): string {
        if (this.isItPlayersTurn()) {
            if (this.game.turnPhase === SUFFER_DAMAGE_PHASE) {
                return `Select card(s) to suffer **${this.game.currEnemy.attackVal} damage.**`
            } else if (this.game.turnPhase === ATTACK_PHASE) {
                return 'Play card(s) or yield.'
            } else {
                // Jester phase
                return ''
            }
        } else {
            let message = 'Stay put and conserve your energy.'
            if (this.game.numPlayers > 1) {
                message += ' Have faith in your comrade(s) to have your back!'
            }
            return message
        }
    }

    /**
     * Returns the number of card select options in player's card select menu.
     */
    private getNumSelectCardOptions(): number {
        let numOptions = 0
        let jesterFound = false
        for (const card of this.cards) {
            if (card.type !== JESTER || !jesterFound) {
                numOptions++
                if (card.type === JESTER) {
                    jesterFound = true
                }
            }
        }
        return numOptions
    }

    /**
     * Returns the player's card menu.
     */
    public getCardMenu(): InteractionReplyOptions {
        const selectRow = new MessageActionRow()
        const buttons = new MessageActionRow()
        if (this.isItPlayersTurn() && this.game.turnPhase === SUFFER_DAMAGE_PHASE) {
            buttons.addComponents(
                new MessageButton()
                    .setCustomId('regicide_discard_cards')
                    .setDisabled(!this.isItPlayersTurn())
                    .setLabel('Discard Card(s)')
                    .setStyle('PRIMARY'),
            )
        } else {
            buttons.addComponents(
                new MessageButton()
                    .setCustomId('regicide_play_cards')
                    .setDisabled(!this.isItPlayersTurn() || this.game.turnPhase !== ATTACK_PHASE)
                    .setLabel('Play Card(s)')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('regicide_yield')
                    .setDisabled(!this.canYield())
                    .setLabel('😔 Yield')
                    .setStyle('SECONDARY'),
            )
        }
        if (this.game.numPlayers === 1) {
            buttons.addComponents(
                new MessageButton()
                    .setCustomId('regicide_play_jester')
                    .setDisabled(!this.canPlayJester())
                    .setLabel(`🃏 Play Jester (×${this.game.numJestersLeft})`)
                    .setStyle('SECONDARY'),
            )
        }

        let maxSelect = Math.max(1, this.getNumSelectCardOptions())
        if (!this.isItPlayersTurn() || this.game.turnPhase !== SUFFER_DAMAGE_PHASE) {
            maxSelect = Math.min(maxSelect, 4)
        }
        const cardSelectMenu = new MessageSelectMenu()
            .setCustomId('regicide_select_cards')
            .setPlaceholder(`Select card(s) to ${this.isItPlayersTurn() && this.game.turnPhase === SUFFER_DAMAGE_PHASE ? 'discard' : 'play'}`)
            .setMinValues(0)
            .setMaxValues(maxSelect)
        const selections = []

        let numJesters = 0
        let jesterIndex = 0
        for (let i = 0; i < this.numCards; i++) {
            const card = this.cards[i]
            if (card.type === JESTER && numJesters !== 0) {
                numJesters++
                selections[jesterIndex].description = `×${numJesters}`
                continue
            }
            const cardId = card.toString(true)
            const select = {
                label: cardId,
                value: `${cardId}_${i}`,
                emoji: `${card.suit ? getSuitEmoji(card.suit) : '🃏'}`,
            } as MessageSelectOptionData
            if (card.type === JESTER) {
                jesterIndex = selections.length
                numJesters++
                select.description = '×1'
            } else if (card.type === MONARCH) {
                select.description = `Value: ${card.attackVal}`
            } else if (card.type === ANIMAL_COMPANION) {
                select.description = 'I can accompany any card you choose 🥰'
            }
            selections.push(select)
        }
        if (this.numCards === 0) {
            selections.push({
                label: 'You don\'t have any cards left 😰',
                value: 'no_cards_left_1000',
                emoji: '😱',
            })
        }
        cardSelectMenu.addOptions(selections)
        selectRow.addComponents(cardSelectMenu)
        return { components: [selectRow, buttons] }
    }

    /**
     * Sends a new ephemeral card menu to player.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async sendCardMenu(interaction: MessageComponentInteraction) {
        try {
            // Clear card selections
            this.clearSelections()

            const messagePayload = this.getCardMenu()
            const message = this.getCardMenuMessage()
            if (message) {
                messagePayload.content = message
            }
            messagePayload.ephemeral = true
            await interaction.reply(messagePayload)
            this.cardMenu = interaction
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Updates the player's card menu.
	 *
	 * @param interaction: the interaction that triggered this action
	 * @param message: the message to display on the ephemeral card menu
     */
    public async updateCardMenu(interaction: MessageComponentInteraction | null, message: string): Promise<void> {
        if (!this.cardMenu && !interaction) return
        const messagePayload = this.getCardMenu()
        if (message) {
            messagePayload.content = message
        }
        const cardMessage = this.getCardMenuMessage()
        if (cardMessage) {
            messagePayload.content = message ? `${message}\n\n` + cardMessage : cardMessage
        }

        // Clear card selections
        this.clearSelections()

        try {
            if (interaction) {
                await interaction.editReply(messagePayload)
                this.cardMenu = interaction
            } else {
                await (this.cardMenu as MessageComponentInteraction).editReply(messagePayload)
            }
        } catch (error) {
            // Interaction token expires after 15 minutes or message was deleted?
            // https://stackoverflow.com/questions/71490329/invalid-webhook-token-on-interaction
            console.log('error updating card', error)
        }
    }

    /**
     * Leaves the game.
     *
     * @param interaction: the interaction that prompted this action
     */
    public async leaveGame(interaction: MessageComponentInteraction): Promise<void> {
        try {
            // Return cards to tavern deck
            shuffle(this.cards)
            for (const card of this.cards) {
                this.game.tavernDeck.addCardToBottom(card)
            }
            await this.game.onPlayerLeave(interaction, this)

            if (this.cardMenu) {
                await this.cardMenu
                    .editReply({ content: 'You left the game. Hope to see you back!', embeds: [], components: [] })
            }
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Updates the player's ephemeral card menu to indicate the game is over.
     */
    public async onGameEnd(): Promise<void> {
        try {
            if (this.cardMenu) {
                await this.cardMenu.editReply({ content: 'The game is over. Hope you had fun :heart:', embeds: [], components: [] })
            }
        } catch (error) {
            console.error(error)
        }
    }
}
