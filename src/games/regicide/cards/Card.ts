import { CardType, Suit } from '../types';
import { JESTER, ANIMAL_COMPANION, NUMBERED, MONARCH, CLUBS, SPADES, DIAMONDS } from '../constants';
import { getSuitEmoji } from './suits';

export default class Card {
    /**
	 * The type of this card (i.e. numbered, animal companion, etc.)
	 */
    public type: CardType
    /**
	 * The suit of this card.
	 */
    public suit: Suit | null
    /**
	 * The face value of this card.
	 */
    public val: number
    /**
	 * The attack value of this card.
	 */
    public attackVal: number
    /**
	 * The health of this card.
	 */
    public health: number

    /**
     * Constructs a card with the given val and suit.
     *
     * @param val: the value of this card
     * @param suit: the suit of this card
     */
    constructor(val: number, suit: Suit | null) {
        this.val = val
        this.attackVal = val
        this.health = val
        this.suit = suit
        this.type = this.getCardType(val)
    }

    /**
     * Returns the string representation of this card.
     *
     * @param includeEmoji: whether or not to include the suit emoji in the string
     */
    public toString(includeEmoji: boolean): string {
        switch (this.type) {
            case JESTER:
                return `Jester${includeEmoji ? ' 🃏' : ''}`
            case ANIMAL_COMPANION:
                switch (this.suit) {
                    case CLUBS:
                        return `Otter Companion 🦦${includeEmoji ? getSuitEmoji(this.suit!) : ''}`
                    case SPADES:
                        return `Hedgehog Companion 🦔${includeEmoji ? getSuitEmoji(this.suit!) : ''}`
                    case DIAMONDS:
                        return `Dove Companion 🕊️${includeEmoji ? getSuitEmoji(this.suit!) : ''}`
                    default:
                        return `Fox Companion 🦊${includeEmoji ? getSuitEmoji(this.suit!) : ''}`
                }
            default:
                return `${this.val} of ${this.suit}${includeEmoji ? ` ${getSuitEmoji(this.suit!)}` : ''}`
        }
    }

    /**
     * Returns the type of this card (i.e. numbered, monarch, animal companion, etc.)
     *
     * @param val: the face value of the card
     */
    private getCardType(val: number): CardType {
        if (val >= 2 && val <= 10) {
            return NUMBERED
        } else if (val === 1) {
            return ANIMAL_COMPANION
        } else if (val === 0) {
            return JESTER
        } else {
            return MONARCH
        }
    }
}
