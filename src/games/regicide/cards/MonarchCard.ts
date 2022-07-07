import Card from './Card';
import { Suit } from '../types';
import { SPADES } from '../constants';
import { getSuitEmoji } from './suits';

export default class MonarchCard extends Card {
    /**
	 * Is this monarch on the good guy's side or not?
	 */
    private isGood: boolean
    /**
	 * Is the suit power of this card negated by a jester card?
	 */
    public suitNegated: boolean

    /**
     * Constructs a monarch card (Jack, Queen, King).
     *
     * @param val: the value of this card
     * @param suit: the suit of this card
     */
    constructor(val: number, suit: Suit) {
        super(val, suit)

        this.attackVal = this.getAttackVal()
        this.health = this.attackVal * 2
        this.isGood = false
        this.suitNegated = false
    }

    /**
     * Returns the string representation of this card.
     *
     * @param includeEmoji: whether or not to include the suit emoji in the string
     */
    public toString(includeEmoji: boolean): string {
        switch (this.val) {
            case 11:
                return `Jack of ${this.suit}${includeEmoji ? ` ${getSuitEmoji(this.suit!)}` : ''}`
            case 12:
                return `Queen of ${this.suit}${includeEmoji ? ` ${getSuitEmoji(this.suit!)}` : ''}`
            default:
                return `King of ${this.suit}${includeEmoji ? ` ${getSuitEmoji(this.suit!)}` : ''}`
        }
    }

    /**
     * Returns description for when this monarch is immune to the suit of a card played.
     */
    public immuneString(): string {
        return `**${this.toString(true)}** is immune to ${this.suit} ${getSuitEmoji(this.suit!)}, so suit power was not activated 😔.`
    }

    /**
     * The maximum health value of this monarch.
     */
    public get maxHealth(): number {
        const attack = this.getAttackVal()
        if (this.isGood) {
            return attack
        } else {
            return attack * 2
        }
    }

    /**
     * Checks if this card is immune to the suit power of the given card.
     *
     * @param suit: the suit to compare to
     */
    public isImmune(suit: Suit): boolean {
        return !this.suitNegated && this.suit === suit
    }

    /**
     * Negates the suit power of this card.
     */
    public negateSuitPower(): void {
        this.suitNegated = true
    }

    /**
     * Returns the attack value of this card based on the card value.
     */
    public getAttackVal(): number {
        switch (this.val) {
            case 11:
                // Jack
                return 10
            case 12:
                // Queen
                return 15
            default:
                // King
                return 20
        }
    }

    /**
     * Reduces card's attack value by the given card's face value
     * (if given card's suit is spades).
     */
    public reduceAttackVal(val: number): void {
        if (this.isImmune(SPADES)) return
        this.attackVal -= val
        this.attackVal = Math.max(0, this.attackVal)
    }

    /**
     * Reduces card's health by the given attack value.
     */
    public sufferDamage(attackVal: number): void {
        this.health -= attackVal
    }

    /**
     * Converts this card to the good guy's side.
     */
    public convertToGoodSide(): void {
        this.isGood = true
        this.suitNegated = false
        this.attackVal = this.getAttackVal()
        this.health = this.attackVal
    }

    /**
     * Returns a string representation of the monarch's health bar.
     *
     * @param size - the bar size (number of characters)
     */
    public healthBar(size: number): string {
        // Calculate the percentage of the bar
        const percentage = Math.max(0, this.health) / this.maxHealth
        // Calculate the number of square characters to fill the bar
        const numBars = Math.round((size * percentage))
        // Calculate the number of dash caracters to fill the empty bar side
        const numEmpty = size - numBars

        const healthLeft = '█'.repeat(numBars) // ▇
        const emptyHealth = '—'.repeat(numEmpty)
        const hpText = `[${this.health}/${this.maxHealth} HP]`

        const bar = '```[' + healthLeft + emptyHealth + ']' + hpText + '```'
        return bar
    }

    /**
     * Returns the url of the card image.
     */
    public getImageURL(): string {
        const filename = this.toString(false).split(' ').join('-')
        return `https://raw.githubusercontent.com/3gatsunolion/heart2heart/main/assets/regicide/${filename}.png`
    }
}
