import { MonarchCard, getSuits } from '../cards';
import { shuffle } from '../../utils/shuffle';

export default class CastleDeck {
    /**
	 * The cards of this castle deck.
	 */
    public deck: MonarchCard[]
    /**
	 * The current monarch card to defeat.
	 */
    public currMonarch: MonarchCard

    /**
	 * Constructs a castle deck to be used for a game of Regicide.
	 */
    constructor() {
        this.deck = this.initializeDeck()
        this.currMonarch = this.deck.pop()!
    }

    /**
	 * Initializes the castle deck for players to use for the duration of the game.
	 */
    public initializeDeck(): MonarchCard[] {
        const deck: MonarchCard[] = []
        const suits = getSuits()
        for (let i = 13; i >= 11; i--) {
            const currMonarch = []
            for (const suit of suits) {
                const card = new MonarchCard(i, suit)
                currMonarch.push(card)
            }
            shuffle(currMonarch)
            deck.push(...currMonarch)
        }
        return deck
    }

    /**
	 * Returns and sets the next monarch in line (if exists and current monarch is dead).
	 */
    public nextMonarch(): MonarchCard | false {
        if (this.deck.length === 0 || this.currMonarch.health > 0) {
            return false
        }
        this.currMonarch = this.deck.pop()!
        return this.currMonarch
    }

    /**
	 * Returns the number of monarch cards left to defeat.
	 */
    public get numCardsLeft(): number {
        return this.deck.length + (this.currMonarch.health <= 0 ? 0 : 1)
    }

    /**
	 * Returns whether or not this enemy castle deck has been defeated or not.
	 */
    public get isDefeated(): boolean {
        return this.deck.length === 0 && this.currMonarch.health <= 0
    }
}
