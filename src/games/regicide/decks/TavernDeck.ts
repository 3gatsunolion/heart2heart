import RegicideGame from '../Game';
import { Card, getSuits } from '../cards';
import { shuffle } from '../../utils/shuffle';

export default class TavernDeck {
    /**
	 * The cards of this tavern deck.
	 */
    public deck: Card[]
    /**
	 * The game instance this deck belongs to.
	 */
    public game: RegicideGame

    /**
	 * Constructs a new tavern deck for the given Regicide game.
     *
     * @param game: the game this deck belongs to
	 */
    constructor(game: RegicideGame) {
        this.game = game
        this.deck = []
    }

    /**
	 * The maximum available cards to deal to all players.
	 */
    private get maxNumCardsAvailableToDeal(): number {
        // Calculate number of cards still available to deal to players
        const numCardVacancies = this.game.players.reduce((sum, player) => {
            return sum + (player.maxHandSize - player.cards.length)
        }, 0)
        return Math.min(numCardVacancies, this.deck.length)
    }

    /**
	 * The number of cards left in the deck.
	 */
    public get cardsLeft(): number {
        return this.deck.length
    }

    /**
	 * Initializes the tavern deck for players to use for the duration of the game.
	 */
    public initializeDeck(): Card[] {
        const deck = []
        const suits = getSuits()
        for (let i = 1; i < 11; i++) {
            for (const suit of suits) {
                const card = new Card(i, suit)
                deck.push(card)
            }
        }
        const numPlayers = this.game.numPlayers
        if (numPlayers > 2) {
            const numJesters = numPlayers === 3 ? 1 : 2
            for (let i = 0; i < numJesters; i++) {
                const jester = new Card(0, null)
                deck.push(jester)
            }
        }
        shuffle(deck)
        this.deck = deck
        return deck
    }

    /**
	 * Deals the given numCards amount of cards to all players round robin style.
     *
     * @param numCards: the number of cards to deal to all players
     * @param startPlayerIndex: the index of the player to start dealing to
     * @returns: the total number of cards dealt
	 */
    public deal(numCards: number, startPlayerIndex: number): number {
        // Deal cards round robin style (starting from current player)
        const numPlayers = this.game.numPlayers
        const maxCards = Math.min(numCards, this.maxNumCardsAvailableToDeal)
        let playerIndex = startPlayerIndex
        for (let i = 0; i < maxCards; i++) {
            while (this.game.players[playerIndex].hasReachedMaxHandSize()) {
                playerIndex = (playerIndex + 1) % numPlayers
            }
            const player = this.game.players[playerIndex]
            player.insertCard(this.deck.pop()!)
            playerIndex = (playerIndex + 1) % numPlayers
        }
        return maxCards
    }

    /**
	 * Adds the given card to the top of the deck.
     *
     * @param card: the card to add to the top of the deck
	 */
    public addCardToTop(card: Card): void {
        this.deck.push(card)
    }

    /**
	 * Adds the given card to the bottom of the deck.
     *
     * @param card: the card to add to the bottom of the deck
	 */
    public addCardToBottom(card: Card): void {
        this.deck.splice(0, 0, card)
    }
}
