import {
    Collection,
    Message,
    MessageEmbed,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageReaction,
    MessageOptions,
    MessageEditOptions,
    ReactionCollector,
    User,
    Snowflake,
} from 'discord.js';
import { SPADES, JESTER, NUMBERED, ANIMAL_COMPANION, ATTACK_PHASE, JESTER_PHASE, SUFFER_DAMAGE_PHASE } from './constants';
import { TurnPhase } from './types';
import Game from '../utils/Game';
import { Card, MonarchCard, getSuitEmoji } from './cards';
import { TavernDeck, CastleDeck } from './decks';
import RegicidePlayer from './Player';
import { shuffle } from '../utils/shuffle';
import { GAMES } from '../../utils/commands/constants';
import { inlineCode } from '@discordjs/builders';

const name = 'regicide'
const title = 'Regicide'
const minPlayers = 1
const maxPlayers = 4
export const data = {
    category: GAMES,
    name,
    aliases: [],
    description: '**Regicide** is a cooperative, fantasy card game for **1** to **4** players, played using a standard deck of cards. Players work together to defeat **12** powerful enemies.\n\nOn their turn a player plays a card to the table to attack the enemy and once enough damage is dealt, the enemy is defeated. The players win when the last King is defeated. But beware! Each turn the enemy strikes back. Players will discard cards to satisfy the damage and if they can\'t discard enough, everyone loses.\n\nRich with tactical decisions and a deep heuristic tree, **Regicide** is a huge challenge for anyone who is brave enough to take it on!',
    title,
    minPlayers,
    maxPlayers,
    playTime: '10-30 min.',
    options: new Collection([[ 'end', {
        name: 'end',
        aliases: ['e'],
        description: 'Ends the game.',
        usage: (prefix: string) => `Use ${inlineCode(prefix + name + ' end')} to end the game.`,
    }]]),
}

export default class RegicideGame extends Game {
    /**
     * The name of this game.
     */
    public readonly name = title
    /**
     * The game command to create game.
     */
    public readonly command = name
    /**
	 * The minimum number of players needed to play the game.
	 */
    public readonly minPlayers = minPlayers
    /**
	 * The maximum number of players able to play the game.
	 */
    public readonly maxPlayers = maxPlayers
    /**
     * The player who created this game.
     */
    declare host: RegicidePlayer
    /**
	 * Stores all active players currently in the game.
	 */
    declare players: RegicidePlayer[]
    /**
	 * The enemy deck. Consists of all the monarch cards at the start of the game.
	 */
    public castleDeck: CastleDeck
    /**
	 * The deck that contains the cards players try to defeat the enemy with.
	 */
    public tavernDeck: TavernDeck
    /**
	 * The discard pile (cards that have been played and discarded).
	 */
    public discard: Card[]
    /**
	 * The cards that have been played against the current enemy.
	 */
    public cardsInPlay: Card[]
    /**
	 * The current phase/step of the turn.
	 */
    public turnPhase: TurnPhase
    /**
	 * The number of jester cards left to play in a single player game.
	 */
    public numJestersLeft: number
    /**
	 * The number of times players have yielded in a row.
	 */
    public numYieldsInARow: number
    /**
     * The initial invite message sent out for other users to join.
     */
    public inviteMessage!: Message
    /**
     * The game message that updates users on the state of the game and
     * contains the controls to play the game.
     */
    public gameMessage!: Message
    /**
     * The reaction collector to collect reactions before and during the game.
     */
    private reactionCollector!: ReactionCollector

    constructor(user: User, channelId: Snowflake, prefix: string) {
        super(user, channelId, prefix)

        this.host = new RegicidePlayer(user, this, true)
        this.players = [this.host] // On initialization, host is only player

        this.turnPhase = ATTACK_PHASE
        this.castleDeck = new CastleDeck()
        this.tavernDeck = new TavernDeck(this)
        this.discard = []
        this.cardsInPlay = []
        this.numJestersLeft = 2
        this.numYieldsInARow = 0
    }

    /**
	 * The current enemy card to defeat.
	 */
    public get currEnemy(): MonarchCard {
        return this.castleDeck.currMonarch
    }

    /**
     * Adds player to the game.
     */
    public addPlayer(user: User): void {
        const player = new RegicidePlayer(user, this, false)
        this.players.push(player)
    }

    /**
     * Constructs the game invite message based on the current status of the game.
     *
     * @param isInactive: is the game inactive
     */
    public getGameInviteMessage(isInactive: boolean) {
        const emoji = ':crossed_swords:'
        // Case: Game ended due to inactivity or user cancelled the game
        if (!this.hasStarted && this.isGameOver) {
            let description = ''
            if (isInactive) {
                description = `Knock knock is anyone there? <@${this.host.id}> appears to be asleep 😴💤 Try again when you are awake!`
            } else {
                description = `Never mind, <@${this.host.id}> cancelled the game.\nUse command \`${this.prefix}${this.command}\` if you wish to try and play again.`
            }
            const embed = new MessageEmbed()
                .setTitle(`${emoji} **${this.name}** ${emoji}`)
                .setDescription(`>>> ${description}`)
            return { embeds: [embed], components: [], files: [] }
        }

        const numPlayers = this.numPlayers
        let status = ''
        if (this.hasStarted && !this.isGameOver) {
            status = 'Game is currently in progress'
        } else if (this.isGameOver) {
            status = 'Game is over'
        } else if (!this.hasStarted && numPlayers >= this.minPlayers) {
            status = `Waiting for our noble leader <@${this.host.id}> to begin the adventure`
        } else if (!this.hasStarted && numPlayers < this.minPlayers) {
            status = `Waiting for more brave adventurers (at least **${this.minPlayers}**)`
        }
        let components = [] as Array<MessageActionRow>
        if (!this.hasStarted && !this.isGameOver) {
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('regicide_start')
                        .setLabel('Start')
                        .setStyle('PRIMARY')
                        .setDisabled(numPlayers < this.minPlayers),
                )
                .addComponents(
                    new MessageButton()
                        .setCustomId('regicide_cancel')
                        .setLabel('Cancel')
                        .setStyle('DANGER'),
                )
                .addComponents(
                    new MessageButton()
                        .setLabel('Rules')
                        .setURL('https://www.badgersfrommars.com/assets/RegicideRulesA4.pdf')
                        .setStyle('LINK'),
                )
            components = [row]
        }

        let description = '>>> **Hearts :hearts: Diamonds :diamonds: Clubs :clubs: Spades :spades:**\nLong ago, the four nations lived together in harmony. Then, everything changed... ⏳\nA **sinister corruption** has spread through-out the four great kingdoms, blackening the hearts of once-loved Kings 🤴 and Queens 👸 and those that protect them. As **brave adventurers** you must work together using the special powers of your champions 🃏 and animal companions 🐴. **Overthrow** the corrupted monarchs, **purge** them of their darkness and add them to your ranks so that life can be brought to the land once more :dove:'
        if (!this.hasStarted) {
            description += `\n\nReact with '${emoji}' if you want to join this **heroic quest** in defeating the royals!`
        }
        const embed = new MessageEmbed()
            .setTitle(`${emoji} **${this.name}** ${emoji}`)
            .setDescription(description)
            .addFields(
                { name: 'Status', value: status },
                { name: 'Brave Adventurer(s)', value: this.listPlayers('🗡️', false) },
            )
        if (!this.hasStarted) {
            embed.addField('Spots Left', `${this.maxPlayers - numPlayers}`, true)
        }

        return { embeds: [embed], components }
    }

    /**
     * Updates the game invite message based on the current status of the game.
     *
     * @param isInactive: is the game inactive
     */
    public async updateGameInviteMessage(isInactive: boolean): Promise<Message<boolean>> {
        return this.inviteMessage.edit(this.getGameInviteMessage(isInactive))
    }

    /**
     * Sends the game invite message.
	 *
	 * @param command: the command message object that prompted this action.
     */
    public async sendGameInvite(command: Message): Promise<void> {
        try {
            this.inviteMessage = await command.channel!.send(this.getGameInviteMessage(false))
            const emoji = '⚔️'
            await this.inviteMessage.react(emoji)
            const filter = (reaction: MessageReaction, user: User) => {
                return reaction.emoji.name === emoji && user.id !== this.host.id && !user.bot
            }

            this.reactionCollector = this.inviteMessage.createReactionCollector({ filter, dispose: true, time: 1000 * 60 * 10 })
            this.reactionCollector.on('collect', (reaction, user) => {
                if (this.numPlayers < this.maxPlayers) {
                    this.addPlayer(user)
                    // Update invite message to show user who joined
                    this.updateGameInviteMessage(false).catch(() => {})
                } else {
                    // Number of players cannot exceed quota
                    reaction.users.remove(user.id)
                    // this.inviteMessage.reply({ content: 'Sorry, all spots have been taken for this game 😥.' })
                }
            })

            this.reactionCollector.on('remove', (reaction, user) => {
                this.removePlayer(user)
                this.updateGameInviteMessage(false).catch(() => {})
            })

            this.reactionCollector.on('end', async (reaction, user) => {
                this.inviteMessage.reactions.removeAll()
                    .catch(error => console.error('Failed to clear reactions:', error))
            })

            // End game if inactive for 10 minutes
            this.inactivityTimer = setTimeout(() => this.end(true), 1000 * 60 * 10)
        } catch (error) {
            this.end(false)
        }
    }

    /**
     * Officially starts the game.
	 *
	 * @param interaction: the interaction (i.e. player pressing the start button)
	 * that triggered the start of this game
     */
    public async start(interaction: MessageComponentInteraction): Promise<void> {
        try {
            this.resetInactivityTimer()
            // await interaction.deferUpdate()
            this.reactionCollector.stop()
            this.hasStarted = true
            // Draw cards for all players
            this.tavernDeck.initializeDeck()
            this.drawCards(this.host.maxHandSize * this.numPlayers)
            // Update invite message
            await this.updateGameInviteMessage(false)
            // Send brand new game message
            await this.sendInitialGameMessage(interaction)
        } catch (error) {
            // End game, something wrong happened
            this.end(false)
        }
    }

    /**
     * Ends the game and updates all game messages and player card and chip menus.
     *
     * @param isInactive: is the game ending because of inactivity?
     */
    public async end(isInactive: boolean): Promise<void> {
        // Game messages may have been deleted so make sure to catch those cases
        try {
            // If game hasn't started, either user cancelled or time ran out
            if (!this.hasStarted) {
                this.isGameOver = true
                await this.inviteMessage.reactions.removeAll()
                await this.updateGameInviteMessage(isInactive)
                return
            }

            // Game did start
            let message = ''
            let gameLost = false
            if (isInactive) {
                gameLost = true
                message = `Due to inactivity, you${this.numPlayers === 1 ? '' : ' all'} perished.`
            } else {
                clearTimeout(this.inactivityTimer)
                // Game ended with the a win (all monarchs defeated)
                if (this.isGameOver && this.castleDeck.isDefeated) {
                    gameLost = false
                    message = 'The last monarch has been defeated!'
                } else {
                    // Game ended in a loss (player died) or host pressed 'End game'
                    gameLost = true
                    message = 'A valiant attempt, but unfortunately luck was not on our side 💔'
                }
            }

            this.isGameOver = true

            const promises = [
                this.gameMessage.edit(gameLost ? this.getLosingMessage(message) : this.getWinningMessage()),
                this.inviteMessage.reactions.removeAll(),
                this.updateGameInviteMessage(isInactive),
            ]
            await Promise.all(promises)
        } catch (error) {
            console.error(error)
        } finally {
            // Update all player's card menus
            for (const player of this.players) {
                player.onGameEnd()
            }
            this.emit('gameover', this.channelId)
        }
    }

    /**
     * Sends the initial game message that will be used throughout the whole game
	 * to display game state to the channel the game is in.
	 *
	 * @param interaction: the interaction (i.e. user pressing the 'Start' button) that
	 * triggered this action
     */
    public async sendInitialGameMessage(interaction: MessageComponentInteraction): Promise<void> {
        try {
            const initialMessage = `The mighty **${this.currEnemy.toString(true)}** stands before you${this.numPlayers === 1 ? '' : ' all'}.\n\n<@${this.currPlayer.id}>, storm the castle and defeat the corrupted Monarchy${this.numPlayers === 1 ? '' : ' with your friends'}! Best of luck!`
            this.gameMessage = await interaction.channel!.send(this.getGameMessage(initialMessage))
        } catch (error) {
            this.end(false)
        }
    }

    /**
     * Returns the current game message.
	 *
	 * @param description: the description to be displayed in the game message
     */
    public getGameMessage(description: string) {
        const currCards = this.cardsInPlay.length > 0 ? this.cardsInPlay.map(c => '• ' + c.toString(true)).join('\n') : 'No damage has been done yet.'
        const embed = new MessageEmbed()
            .setTitle(`👑${getSuitEmoji(this.currEnemy.suit!)} **${this.currEnemy.toString(true)}**👑`)
            .setDescription(description)
            .setThumbnail(this.currEnemy.getImageURL())
            .addFields(
                { name: '🩸 Enemy Health', value: `${this.currEnemy.healthBar(20)}` },
                { name: '🏹 Enemy Attack Value', value: `\`\`\`${this.currEnemy.attackVal}\`\`\`` },
                { name: '🃏 Current Damage Done', value: `\`\`\`${currCards}\`\`\`` },
                { name: '🏰 Castle Deck', value: `\`\`\`${this.castleDeck.numCardsLeft} enemy card(s) left\`\`\`` },
                { name: '🍺 Tavern Deck', value: `\`\`\`${this.tavernDeck.cardsLeft} card(s) left\`\`\`` },
                { name: '💪 Brave Adventurer(s)', value: this.listPlayers('🗡️', true) },
            )
        const buttons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('regicide_view_cards')
                    .setLabel('View Cards')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('regicide_leave_during_game')
                    .setLabel('Leave')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setCustomId('regicide_end')
                    .setLabel('End Game')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setLabel('Rules')
                    .setURL('https://www.badgersfrommars.com/assets/RegicideRulesA4.pdf')
                    .setStyle('LINK'),
            )
        return { embeds: [embed], components: [buttons] }
    }

    /**
     * Updates the game message.
	 *
	 * @param message: the new updated game message
     */
    public async updateGameMessage(message: MessageOptions): Promise<void | Message<boolean>> {
        return this.gameMessage
            .edit(message as MessageEditOptions)
            .catch(async () => {
                // Game Message was deleted, so resend
                this.gameMessage = await this.gameMessage.channel.send(message)
            })
            // .finally(() => {
            //     // Update all player's card menus
            //     for (const player of this.players) {
            //     }
            // })
    }

    /**
     * Proceeds to the next phase in the turn.
	 *
	 * @param interaction: the interaction that triggered the action to proceed to next phase
     * @param description: the description of the previous turn phase
     * @param cardsPlayed: cards played in previous turn phase
     * @param updateAllMenus: whether to update all player's card menus
     */
    public async proceedToNextPhase(interaction: MessageComponentInteraction | null, description: string, cardsPlayed: Card[], updateAllMenus: boolean): Promise<void> {
        try {
            // Reset/refresh inactivity timer
            this.resetInactivityTimer()

            let prevPlayer = this.currPlayer as RegicidePlayer // keep copy of player before next phase

            if (this.turnPhase === ATTACK_PHASE) {
                // Check for if currEnemy has been defeated
                if (this.currEnemy.health <= 0) {
                    if (this.currEnemy.health === 0) {
                        this.tavernDeck.addCardToTop(this.currEnemy)
                        description += `\n\nThe **${this.currEnemy.toString(true)}** has been dealt damage exactly equal to their health, so they have been converted to the good side 😇 The card has been placed on top of the Tavern deck.`
                    } else {
                        description += `\n\nThe **${this.currEnemy.toString(true)}** has been slain! Good work!`
                        // Add to discard pile
                        this.addToDiscard([this.currEnemy])
                    }
                    const prevEnemy = this.currEnemy
                    const next = this.castleDeck.nextMonarch()
                    if (next) {
                        description += `\n\n...but uh oh! Another formidable opponent has appeared. It's the **${next.toString(true)}**!`
                        if (this.numPlayers > 1) {
                            description += ` <@${this.currPlayer.id}>, since you defeated the **${prevEnemy.toString(true)}**, you get to continue your relentless and fearless attack!`
                        } else {
                            description += ` **${this.currPlayer.user.username}**, continue your relentless and fearless attack!`
                        }
                        prevEnemy.convertToGoodSide()
                    }
                    // Clear cards in play and add to discard pile
                    this.addToDiscard(this.cardsInPlay)
                    this.addToDiscard(cardsPlayed)
                    this.cardsInPlay = []
                } else {
                    // Add cards played to cardsInPlay
                    this.cardsInPlay.push(...cardsPlayed)
                    if (this.currEnemy.attackVal > 0) {
                        this.turnPhase = SUFFER_DAMAGE_PHASE
                        description += `\n\n<@${this.currPlayer.id}>, you must now suffer **${this.currEnemy.attackVal} damage**. Please choose wisely which cards to part with.`
                    } else {
                        prevPlayer = this.currPlayer as RegicidePlayer
                        // Since enemy's attack value is 0, automatically skip suffer damage phase and go to next player
                        this.nextPlayer()
                        description += `\n\n<@${prevPlayer.id}> suffered **${this.currEnemy.attackVal} damage**.`
                        if (this.numPlayers > 1) {
                            description += `\n\nIt's now <@${this.currPlayer.id}>'s turn to attack!`
                            await prevPlayer.updateCardMenu(interaction, '')
                        } else {
                            description += '\n\nIt\'s time to attack (or yield)!'
                        }
                    }
                }
            } else if (this.turnPhase === SUFFER_DAMAGE_PHASE) {
                // Add cards to discard pile
                this.addToDiscard(cardsPlayed)
                this.turnPhase = ATTACK_PHASE
                // Move to next player's turn
                this.nextPlayer()
                if (this.numPlayers > 1) {
                    description += `\n\nIt's now <@${this.currPlayer.id}>'s turn to attack!`
                } else {
                    description += '\n\nIt\'s time to attack (or yield)!'
                }
            } else if (this.turnPhase === JESTER_PHASE) {
                this.turnPhase = ATTACK_PHASE
                // Add jester to cardsInPlay
                this.cardsInPlay.push(...cardsPlayed)
            }
            // Check if game is over
            if (this.checkIfGameIsOver()) {
                return
            }

            await this.updateGameMessage(this.getGameMessage(description))
            const currPlayer = this.currPlayer as RegicidePlayer
            if (updateAllMenus) {
                for (const player of this.players) {
                    if (interaction && interaction.user.id === player.id) {
                        await player.updateCardMenu(interaction, '')
                    } else {
                        await player.updateCardMenu(null, '')
                    }
                }
            } else if (prevPlayer !== currPlayer) {
                await prevPlayer.updateCardMenu(interaction, '')
                await currPlayer.updateCardMenu(null, '')
            } else {
                await currPlayer.updateCardMenu(interaction, '')
            }
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Updates the game for when a jester card is played.
	 *
	 * @param interaction: the interaction that triggered the action of playing a jester card
     * @param playerLeft: whether or not a player left while another player had already played a jester card
     */
    public async onJesterPlay(interaction: MessageComponentInteraction, playerLeft: boolean): Promise<void> {
        try {
            // Reset/refresh inactivity timer
            this.resetInactivityTimer()

            const jester = new Card(0, null)

            const currPlayer = this.currPlayer as RegicidePlayer
            if (this.numPlayers === 1) {
                this.numJestersLeft--
                // Check if game is over
                if (this.checkIfGameIsOver()) {
                    return
                }
                const cardMessage = `You played the **${jester.toString(true)}**, which allowed you to discard your hand and draw **${currPlayer.maxHandSize}** new cards.`
                let description = cardMessage
                if (this.turnPhase === ATTACK_PHASE) {
                    description += '\n\nPlease choose your move of **attack** or **yield**.'
                } else {
                    description += '\n\nPlease select card(s) to part with.'
                }
                await currPlayer.updateCardMenu(interaction, cardMessage)
                await this.updateGameMessage(this.getGameMessage(description))
            } else {
                this.numYieldsInARow = 0
                // Negate enemy's suit power
                // eslint-disable-next-line no-lonely-if
                if (!playerLeft && !this.currEnemy.suitNegated) {
                    this.currEnemy.negateSuitPower()
                    // If enemy's suit is spades, check for previous spades
                    // and activate those suit powers
                    if (this.currEnemy.suit === SPADES) {
                        for (const card of this.cardsInPlay) {
                            if (card.suit !== SPADES) continue
                            this.currEnemy.reduceAttackVal(card.attackVal)
                        }
                    }
                }
                // Set up reaction collector to wait for user to choose next player
                this.turnPhase = JESTER_PHASE
                // Stop any previous reaction collector
                this.reactionCollector.stop()
                const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']
                const emojiToPlayerIndex = new Map()
                let reactMessage = 'React with:\n\n'
                for (let i = 0; i < this.numPlayers; i++) {
                    emojiToPlayerIndex.set(emojis[i], i)
                    reactMessage += `• ${emojis[i]} for <@${this.players[i].id}> to go next\n`
                }

                // Update game message and user's card
                let description = `<@${currPlayer.id}> played the **${jester.toString(true)}**. **${this.currEnemy.toString(true)}**'s immunity has been negated 🪄 **${currPlayer.user.username}** may select the next player to go.\n\n`
                description += reactMessage
                await currPlayer.updateCardMenu(playerLeft ? null : interaction, `You just played the **${jester.toString(true)}**. Please select the next player to go.`)
                await this.updateGameMessage(this.getGameMessage(description))

                for (let i = 0; i < this.numPlayers; i++) {
                    await this.gameMessage.react(emojis[i])
                }

                const filter = (reaction: MessageReaction, user: User) => {
                    return emojiToPlayerIndex.has(reaction.emoji.name) && user.id === currPlayer.id && !user.bot
                }

                this.reactionCollector = this.gameMessage.createReactionCollector({ filter, max: 1, dispose: true, time: 1000 * 60 * 10 })
                this.reactionCollector.on('collect', async (reaction, user) => {
                    if (emojiToPlayerIndex.has(reaction.emoji.name)) {
                        this.reactionCollector.stop()
                        const prevPlayer = currPlayer
                        this.currPlayerIdx = emojiToPlayerIndex.get(reaction.emoji.name)
                        description = `<@${prevPlayer.id}> has selected <@${this.currPlayer.id}> to go next. Good luck, brave adventurer!`
                        if (prevPlayer !== this.currPlayer) {
                            await prevPlayer.updateCardMenu(playerLeft ? null : interaction, '')
                        }
                        this.proceedToNextPhase(null, description, [jester], false)
                    }
                })
                this.reactionCollector.on('end', (reaction, user) => {
                    this.gameMessage.reactions.removeAll()
                        .catch(error => console.error('Failed to clear reactions:', error))
                })
            }
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Updates the game for when a player leaves the game.
	 *
	 * @param interaction: the interaction that triggered the action of leaving the game
     * @param player: the player that left
     */
    public async onPlayerLeave(interaction: MessageComponentInteraction, player: RegicidePlayer): Promise<void> {
        try {
            const isPlayersTurn = player.isItPlayersTurn()
            this.removePlayer(player.user)
            // Remove 1 jester card from game since a player left
            if (this.numPlayers > 1) {
                let jesterFound = false
                let i = 0
                const decks = [this.tavernDeck.deck, this.discard, this.cardsInPlay, ...this.players.map(p => p.cards)]
                while (i < decks.length && !jesterFound) {
                    for (let j = 0; j < decks[i].length; j++) {
                        const card = decks[i][j]
                        if (card.type === JESTER) {
                            jesterFound = true
                            decks[i].splice(j, 1)
                            // Found in a player's hand
                            if (i > 2) {
                                // Draw another card to make up for losing jester
                                this.tavernDeck.deal(1, i - 3)
                            }
                            break
                        }
                    }
                    i++
                }
            }
            // Each remaining player gets one more card
            this.tavernDeck.deal(this.numPlayers, this.currPlayerIdx)

            if (this.turnPhase === JESTER_PHASE) {
                this.reactionCollector.stop()
            }
            if (isPlayersTurn) {
                this.turnPhase = ATTACK_PHASE
                await this.updateGameMessage(this.getGameMessage(`<@${player.id}> just fled the scene 💨\n\n<@${this.currPlayer.id}>, take the reins and continue the attack! Good luck!`))
                // const currPlayer = this.currPlayer as RegicidePlayer
                // await currPlayer.updateCardMenu(null, '')
            } else if (this.turnPhase === JESTER_PHASE && this.numPlayers > 1) {
                await this.onJesterPlay(interaction, true)
            } else {
                let description = `<@${player.id}> just fled the scene 💨\n\n`
                if (this.turnPhase === JESTER_PHASE) {
                    this.turnPhase = ATTACK_PHASE
                    description += `<@${this.currPlayer.id}>, you're alone now, but fear not! Continue to attack fearlessly!`
                } else {
                    description += this.gameMessage.embeds[0].description
                }
                await this.updateGameMessage(this.getGameMessage(description))
            }

            // Update all card menus since everyone's hand may have changed
            for (const p of this.players) {
                p.updateCardMenu(null, `<@${player.id}> just fled the scene 💨. Hang in there!`)
            }
            await this.updateGameInviteMessage(false)
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Returns a string representation of a list of all the players of the game.
	 *
	 * @param showNumCards: whether or not to show the number of cards each player currently has
     */
    public listPlayers(emoji: string, showNumCards: boolean): string {
        let players = ''
        for (let i = 0; i < this.numPlayers; i++) {
            const player = this.players[i]
            players += `• ${emoji} **${player.user.username}**${showNumCards ? '' : '\n'}`
            if (showNumCards) {
                players += ` — \`${player.numCards} card(s) left\`\n`
            }
        }
        return players
    }

    /**
	 * Heals the tavern deck from discard pile by the given healVal.
     *
     * @param healVal: the amount of cards to heal the tavern deck
	 */
    public healFromDiscard(healVal: number): void {
        // Shuffle discard
        shuffle(this.discard)
        // Replenish the tavern deck with the amount of cards equal to the
        // attack value played if there's enough in the discard pile
        const healNum = Math.min(healVal, this.discard.length)
        for (let i = 0; i < healNum; i++) {
            this.tavernDeck.addCardToBottom(this.discard.pop()!)
        }
    }

    /**
	 * Draws and distributes the specified amount of cards to all players evenly.
     *
     * @param numCards: the amount of cards to draw and deal to players
     * @returns: the total number of cards dealt
	 */
    public drawCards(numCards: number): number {
        return this.tavernDeck.deal(numCards, this.currPlayerIdx)
    }

    /**
	 * Adds the given cards to the discard pile.
     *
     * @param cards: the cards to discard
	 */
    public addToDiscard(cards: Card[]): void {
        for (const card of cards) {
            this.discard.push(card)
        }
    }

    /**
     * Returns whether or not the given cards is a valid move to play.
	 *
	 * @param cards: the cards to check validity of
     */
    public isValidCardMove(cards: Card[]): boolean {
        if (cards.length < 2) return false
        // If two cards were played and one of them is an animal companion, it is a valid move
        if (cards.length === 2 && cards.some(c => c.type === ANIMAL_COMPANION)) {
            return true
        }
        // If all cards played have the same number and the sum of them are less than or equal to 10,
        // it is a valid combo (except if it's an animal companion)
        if (cards.every(c => c.val === cards[0].val && c.type === NUMBERED && c.val <= 5) &&
			cards.reduce((sum, card) => card.val + sum, 0) <= 10) {
            return true
        }
        return false
    }

    /**
     * Sends an ephemeral message to player with invalid card move message.
     */
    public sendInvalidCardMoveMessage(interaction: MessageComponentInteraction): void {
        const message = '❌ **Invalid Card Combo** ❌\n💬 **Reminder:** Players can combine cards together \
in sets of 2, 3 or 4 of the same number as long as the combined total of the cards played \
equals **10 or less**. Animal Companions can be played on their own, or paired with one other card \
(which could be another Animal Companion) except the Jester, but **cannot be added \
to a combo**. So players can play a pair of 2s, 3s, 4s, or 5s, triple 2s and 3s, or quadruple 2s.'
        interaction.reply({ content: message, ephemeral: true })
    }

    /**
     * Checks if the game is over or not.
     */
    public checkIfGameIsOver(): boolean {
        if (!this.hasStarted) return false
        const currPlayer = this.currPlayer as RegicidePlayer
        // Check if player cannot take all damage during suffer damage phase
        let playerDead = this.turnPhase === SUFFER_DAMAGE_PHASE && currPlayer.health < this.currEnemy.attackVal
        // If only 1 player, even if they do not have enough cards to suffer damage,
        // if they have any jesters left to play they're still in the game
        if (this.numPlayers === 1 && this.turnPhase === SUFFER_DAMAGE_PHASE && this.numJestersLeft > 0) {
            playerDead = false
        }
        this.isGameOver = this.castleDeck.isDefeated || playerDead
        if (this.numPlayers === 1 && currPlayer.numCards === 0 && (this.numJestersLeft === 0 || this.tavernDeck.cardsLeft === 0)) {
            // If no more cards left and no more jesters left to play
            this.isGameOver = true
        } else if (this.numPlayers > 1 && this.players.every(p => p.health === 0)) {
            // If multiplayer and all players have 0 health (aka no cards or only jesters), then game is over
            this.isGameOver = true
        }
        if (this.isGameOver) {
            this.end(false)
        }
        return this.isGameOver
    }

    /**
     * Returns the message to be sent when player(s) have won the game.
     */
    public getWinningMessage() {
        let victoryType = '**🥇 Gold Victory 🥇**\n'
        if (this.numPlayers < 3) {
            switch (this.numJestersLeft) {
                case (1):
                    victoryType = '**🥈 Silver Victory 🥈**\n'
                    break;
                case (0):
                    victoryType = '**🥉 Bronze Victory 🥉**\n'
                    break;
                default:
                    victoryType = '**🥇 Gold Victory 🥇**\n'
                    break;
            }
        }
        const embed = new MessageEmbed()
            .setTitle(`:crossed_swords: **${this.name}** :crossed_swords:`)
            .setDescription(`${victoryType}At long last! The evil monarchs have been defeated and peace has been \
restored to the kingdoms 🕊:heart:\n\nWe hereby bestow:\n\n${this.listPlayers('👑', false)}\n\
by virtue of their **honour**, **loyalty**, **valour**, and **skill at arms**, to the high rank of **knighthood** 🎖\
Your indomitable spirit befits a true knight.\n\nTo each brave adventurer, may your **courage** and **devotion** \
become a shining example to the people of the kingdoms.\n\nLet the celebrations begin 🍻🍖🥘🍽`)
        return { embeds: [embed], components: [] }
    }

    /**
     * Returns the message to be sent when player(s) have lost the game.
     */
    public getLosingMessage(message: string) {
        const embed = new MessageEmbed()
            .setTitle(`:crossed_swords: **${this.name}** :crossed_swords:`)
            .setDescription(`💀 **Lost Battle** 💀\n${message}\n\nIn loving memory:\n\n${this.listPlayers('🪦', false)}\n\
for their courageous sacrifices to the people.`)
        return { embeds: [embed], components: [] }
    }
}
