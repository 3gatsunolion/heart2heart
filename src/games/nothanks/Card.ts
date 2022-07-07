export default class Card {
    /**
     * The value of the card.
     */
    public val: number
    /**
     * The number of chips placed on the card.
     */
    public numChips: number

    /**
     * Constructs a new card instance.
	 *
	 * @param num: the value of the card
     */
    constructor(num: number) {
        this.val = num
        this.numChips = 0 // Card always starts out with 0 chips on it
    }

    /**
     * Adds a chip to the card.
     */
    public addChip(): void {
        this.numChips++
    }

    /**
     * Removes a chip from the card.
     */
    public removeChip(): void {
        this.numChips--
    }

    /**
     * Clears all chips from the card.
     */
    public clearChips(): void {
        this.numChips = 0
    }

    /**
     * Returns the url of the card image.
     */
    public getImageURL(): string {
        return `https://raw.githubusercontent.com/3gatsunolion/heart2heart/master/assets/nothanks/${this.val}.png`
    }
}
