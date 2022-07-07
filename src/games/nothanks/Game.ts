import {
    Message,
    MessageEmbed,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageOptions,
    MessageEditOptions,
    MessageReaction,
    ReactionCollector,
    User,
    Collection,
} from 'discord.js';
import Game from '../utils/Game';
import Card from './Card';
import Player from './Player';
import { Colours } from '../../utils/colours';
import { PLACE_CHIP, TURN_TYPE } from './turnType';
import NoThanksPlayer from './Player';
import { shuffle } from '../utils/shuffle';
import { GAMES } from '../../utils/commands/constants';
import { inlineCode } from '@discordjs/builders';

const name = 'nothanks'
const title = 'No Thanks!'
const minPlayers = 2
const maxPlayers = 7
export const data = {
    category: GAMES,
    name,
    aliases: ['nt'],
    description: '**No Thanks!** is a card game designed to be as simple as it is engaging. The rules are simple. Each turn, players have two options:\n\n• play one of their chips to avoid picking up the current face-up card\n• pick up the face-up card (along with any chips that have already been played on that card) and turn over the next card\n\nPlayers compete to have the **lowest score** at the end of the game. The deck of cards is numbered from **3** to **35**, with each card counting for a number of points equal to its face value. Runs of two or more cards only count as the lowest value in the run - but nine cards are removed from the deck before starting, so be careful looking for connectors. Each chip is worth **-1** point, but they can be even more valuable by allowing you to avoid drawing that unwanted card.',
    title,
    minPlayers,
    maxPlayers,
    playTime: '20 min.',
    options: new Collection([[ 'end', {
        name: 'end',
        aliases: ['e'],
        description: 'Ends the game.',
        usage: (prefix: string) => `Use ${inlineCode(prefix + name + ' end')} to end the game.`,
    }]]),
}

export default class NoThanksGame extends Game {
    /**
     * The name of this game.
     */
    public readonly name = title
    /**
     * The game command to create game.
     */
    public readonly command = name
    /**
     * The colour that represents this game.
     */
    public static colour = Colours.BLUE
    /**
     * The minimum number of players needed to play the game.
     */
    public readonly minPlayers = minPlayers
    /**
     * The maximum number of players needed to play the game.
     */
    public readonly maxPlayers = maxPlayers
    /**
     * The player who created this game.
     */
    declare host: Player
    /**
     * Stores all active players currently in the game.
     */
    declare players: Array<Player>
    /**
     * Stores all players who left during the game.
     */
    declare playersWhoLeft: Array<Player>
    /**
     * The cards that are currently still up for grabs in the game.
     */
    private deck: Array<number>
    /**
     * The current card that is up for grabs in the game.
     */
    public currCard: Card
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
     * The reaction collector for the invite message to collect all users
	 * who want to join the game.
     */
    private reactionCollector!: ReactionCollector

    /**
     * Constructs a new No Thanks! game instance.
     *
     * @param user: user that initialized the game
	 * @param channelId: id of the channel the game is in
     */
    constructor(user: User, channelId: string, prefix: string) {
        super(user, channelId, prefix)

        this.deck = this.initializeDeck()
        this.currCard = new Card(this.deck.pop()!)
        this.host = new Player(user, this, true)
        this.players = [this.host] // On initialization, host is only player
    }

    /**
     * Initializes card deck for a new game.
     * 33 cards (numbers 3 to 35) are shuffled
	 * randomly and 9 cards are removed.
     */
    private initializeDeck(): Array<number> {
        // Add cards with numbers from 3 to 35
        const deck = []
        for (let i = 3; i <= 35; i++) {
            deck.push(i)
        }
        shuffle(deck)
        // Remove 9 cards
        deck.splice(0, 9)
        return deck
    }

    /**
     * Constructs the game invite message based on the current status of the game.
     *
     * @param isInactive: is the game inactive
     */
    public getGameInviteMessage(isInactive: boolean) {
        // Case: Not enough people joined in on the game before the timer ran out or user cancelled the game
        if (!this.hasStarted && this.isGameOver) {
            let content = ''
            let description = ''
            if (isInactive && this.numPlayers < this.minPlayers) {
                content = 'No one wanted to play, better luck next time 🥲'
                description = `Well this is awkward, everyone said ***"No Thanks"!*** to playing with <@${this.host.id}> 🥲😔🤡`
            } else if (isInactive && this.numPlayers >= this.minPlayers) {
                content = 'Game cancelled due to inactivity.'
                description = `Knock knock is anyone there? <@${this.host.id}> appears to be asleep 😴💤 Try again when you are awake!`
            } else {
                content = 'Game cancelled. Come by again!'
                description = `Never mind, <@!${this.host.id}> cancelled the game.\nUse command \`${this.prefix}${this.command}\` if you wish to try and play again.`
            }
            const embed = new MessageEmbed()
                .setColor(NoThanksGame.colour)
                .setTitle(`👋 **${this.name}**`)
                .setDescription(`>>> ${description}`)
            return { content, embeds: [embed], components: [], files: [] }
        }

        const numPlayers = this.numPlayers
        let status = ''
        if (this.hasStarted && !this.isGameOver) {
            status = 'Game is currently in progress'
        } else if (this.isGameOver) {
            status = 'Game is over'
        } else if (!this.hasStarted && numPlayers >= this.minPlayers) {
            status = 'Waiting for host to start game'
        } else if (!this.hasStarted && numPlayers < this.minPlayers) {
            status = `Waiting for more players (at least **${this.minPlayers}**)`
        }
        let components = [] as Array<MessageActionRow>
        if (!this.hasStarted && !this.isGameOver) {
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('nothanks_start')
                        .setLabel('Start')
                        .setStyle('PRIMARY')
                        .setDisabled(numPlayers < this.minPlayers),
                )
                .addComponents(
                    new MessageButton()
                        .setCustomId('nothanks_cancel')
                        .setLabel('Cancel')
                        .setStyle('DANGER'),
                )
                .addComponents(
                    new MessageButton()
                        .setCustomId('nothanks_rules')
                        .setLabel('Rules')
                        .setStyle('SECONDARY'),
                )
            components = [row]
        }
        let description = `>>> **<@${this.host.id}>** invites you all to a friendly game of **${this.name}**\nReact with '🖐️' to join and play along!`
        if (this.hasStarted) {
            description = `>>> **<@${this.host.id}>** started a friendly game of **${this.name}**`
        }
        const embed = new MessageEmbed()
            .setColor(NoThanksGame.colour)
            .setTitle(`👋 **${this.name}**`)
            .setDescription(description)
            .addFields(
                { name: 'Status', value: status },
                { name: `Players [${numPlayers}]`, value: this.listPlayers(false) },
            )
        if (!this.hasStarted) {
            embed.addField('Spots Left', `${this.maxPlayers - numPlayers}`, true)
        }

        const content = this.isGameOver ? 'Thanks for playing! Hope you had fun :heart:' : `Let's play **${this.name}**`
        return { content, embeds: [embed], components }
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
        this.inviteMessage = await command.channel!.send(this.getGameInviteMessage(false))
        const emoji = '🖐️'
        await this.inviteMessage.react(emoji)
        const filter = (reaction: MessageReaction, user: User) => {
            return reaction.emoji.name === emoji && user.id !== this.host.id && !user.bot
        }

        this.reactionCollector = this.inviteMessage.createReactionCollector({ filter, dispose: true, time: 1000 * 60 * 10 })
        this.reactionCollector.on('collect', (reaction, user) => {
            if (this.numPlayers < this.maxPlayers) {
                this.addPlayer(user)
                // Update invite message to show user who joined
                const updateInvite = this.getGameInviteMessage(false)
                updateInvite.embeds[0].setFooter({ text: `${user.username} just joined the party! Welcome!`, iconURL: `${user.displayAvatarURL({ dynamic: true })}` })
                this.inviteMessage.edit(updateInvite)
            } else {
                // Number of players cannot exceed quota
                reaction.users.remove(user.id)
                // this.inviteMessage.reply({ content: 'Sorry, all spots have been taken for this game 😥.' })
            }
        })

        this.reactionCollector.on('remove', (reaction, user) => {
            this.removePlayer(user)
            const updateInvite = this.getGameInviteMessage(false)
            updateInvite.embeds[0].setFooter({ text: `${user.username} just left the game 😢.`, iconURL: `${user.displayAvatarURL({ dynamic: true })}` })
            this.inviteMessage.edit(updateInvite)
        })

        this.reactionCollector.on('end', () => {
            this.inviteMessage.reactions.removeAll()
                .catch(error => console.error('Failed to clear reactions:', error))
        })

        // End game if inactive for 10 minutes
        this.inactivityTimer = setTimeout(() => this.end(true), 1000 * 60 * 10)
    }

    /**
     * Distributes the correct amount of chips to each player before the game starts.
     */
    private distributeChips(): void {
        // 3-5 player (11 chips), 6 players (9 players), 7 players (7 chips)
        const numPlayers = this.numPlayers
        let numChips = 11
        if (numPlayers === 6) {
            numChips = 9
        } else if (numPlayers === 7) {
            numChips = 7
        }
        for (const player of this.players) {
            player.numChips = numChips
        }
    }

    /**
     * Adds player to the game.
     */
    public addPlayer(user: User): void {
        const player = new Player(user, this, false)
        this.players.push(player)
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
            this.reactionCollector.stop()
            // Distribute chips to players
            this.distributeChips()
            this.hasStarted = true
            // Update invite message
            this.updateGameInviteMessage(false)
            // Send brand new game message
            this.sendInitialGameMessage(interaction)
        } catch {
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
            const [leaderBoardString, winners] = this.getLeaderBoard()
            let description = ''
            const numWinners = winners.length
            const winnerString = winners.map(w => `<@${w.id}>`).join(', ').replace(/, ([^,]*)$/, ' and $1')
            if (isInactive) {
                if (numWinners === 1) {
                    description = `The game ended due to inactivity.\n\n${winnerString} has won the game!`
                } else {
                    description = `The game ended due to inactivity.\n\n${winnerString} have won the game!`
                }
            } else {
                clearTimeout(this.inactivityTimer)
                // Game ended with all players leaving except one
                if (this.isGameOver && this.numPlayers === 1) {
                    description = `<@${this.playersWhoLeft[0].id}> just left the game.\n\n${winnerString} is the last one standing (literally). Congrats! 🥳`
                } else if (this.isGameOver && this.numPlayers > 1) {
                    // Game ended the traditional way
                    if (numWinners === 1) {
                        description = `${winnerString} is the winner! Congratulations! 🥳👏`
                    } else {
                        description = `${winnerString} are the winners! Congratulations! 🥳👏`
                    }
                } else {
                    // Host pressed the 'End Game' button
                    // eslint-disable-next-line no-lonely-if
                    if (numWinners === 1) {
                        description = `<@${this.host.id}> ended the game.\n\n${winnerString} has won the game!`
                    } else {
                        description = `<@${this.host.id}> ended the game.\n\n${winnerString} have won the game!`
                    }
                }
            }

            this.isGameOver = true
            const embed = new MessageEmbed()
                .setColor(NoThanksGame.colour)
                .setTitle(`👋 **${this.name}**`)
                .setDescription(description)
                .addFields(
                    { name: 'Final Leaderboard', value: leaderBoardString },
                )
            // If only 1 winner, display their avatar as thumbnail
            if (winners.length === 1) {
                embed.setThumbnail(winners[0].displayAvatarURL({ dynamic: true, size: 1024 }))
            }

            const promises = [
                this.gameMessage.edit({ embeds: [embed], components: [] }),
                this.inviteMessage.reactions.removeAll(),
                this.updateGameInviteMessage(isInactive),
            ]
            await Promise.all(promises).catch()
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
     * Returns a string representation of all the players of the game.
	 *
	 * @param showCards: whether or not to show the cards each player currently has
     */
    public listPlayers(showCards: boolean): string {
        let players = ''
        for (let i = 0; i < this.numPlayers; i++) {
            const player = this.players[i]
            if (showCards) {
                players += `➼ ${player.user.username} — \`${player.cards.length === 0 ? 'No cards as of now' : player.cards.join(', ')}\`\n`
            } else if (player.isHost) {
                players += `🌈 ${player.user.username} **(host)**\n`
            } else {
                players += i < this.numPlayers - 1 ? `👤 ${player.user.username}\n` : `👤 ${player.user.username}`
            }
        }
        // For players who left, since it's still helpful to see what cards are gone,
        // during the game, display their cards as well
        if (showCards) {
            for (let i = 0; i < this.playersWhoLeft.length; i++) {
                const player = this.playersWhoLeft[i]
                players += `➼ ${player.user.username} (left game) — \`${player.cards.length === 0 ? 'No cards' : player.cards.join(', ')}\`\n`
            }
        }
        return players
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
            const message = `>>> The current card number is **${this.currCard.val}**.\n${this.howManyCardsLeft()}`
            this.gameMessage = await interaction.channel!.send(this.getGameMessage(message))
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
        const player = this.currPlayer
        const gameEmbed = new MessageEmbed()
            .setColor(NoThanksGame.colour)
            .setAuthor({ name: `${player.user.username}'s Turn`, iconURL: `${player.user.displayAvatarURL({ dynamic: true })}` })
            .setDescription(description)
            .setThumbnail(this.currCard.getImageURL())
            .addFields(
                { name: 'Players', value: this.listPlayers(true) },
            )
        return { embeds: [gameEmbed], components: this.getGameMessageButtons() }
    }

    /**
     * Returns the buttons for the game message.
     */
    public getGameMessageButtons(): MessageActionRow[] {
        const buttons1 = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('nothanks_rules')
                    .setLabel('Rules')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('nothanks_view_cards')
                    .setLabel('View Card and Chips')
                    .setStyle('SECONDARY'),
            )
        const buttons2 = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('nothanks_leave_during_game')
                    .setLabel('Leave')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setCustomId('nothanks_end')
                    .setLabel('End Game')
                    .setStyle('DANGER'),
            )
        return [buttons1, buttons2]
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
    }

    /**
     * Executes the move a player has made.
	 *
     * @param interaction: the interaction that trigged this action
	 * @param turnType: the type of turn user made (i.e. take card, place chip, etc.)
     */
    public async executeTurn(interaction: MessageComponentInteraction, turnType: TURN_TYPE): Promise<void> {
        try {
            // Reset/refresh inactivity timer
            this.resetInactivityTimer()

            const prevPlayer = this.currPlayer as NoThanksPlayer
            const prevCard = this.currCard
            // Move onto next player
            this.nextPlayer()

            let turnDescription = ''
            if (turnType === PLACE_CHIP) {
                this.currCard.addChip()
                const plural = this.currCard.numChips > 1 || this.currCard.numChips === 0
                turnDescription = `>>> ${prevPlayer.user.username} said *"${this.name} 👋"*.\nThere ${plural ? 'are' : 'is'} now **${this.currCard.numChips} chip${plural ? 's' : ''} on the card.**\n\nThe current card number is **${this.currCard.val}**.\n${this.howManyCardsLeft()}`
            } else {
                // Check if game is over
                if (this.checkIfGameIsOver()) {
                    return
                }
                this.currCard = new Card(this.deck.pop()!)
                turnDescription = `>>> **${prevPlayer.user.username}** took the number **${prevCard.val}** card.\n\nThe current card number is **${this.currCard.val}**.\n${this.howManyCardsLeft()}`
            }

            await this.updateGameMessage(this.getGameMessage(turnDescription))
            const message: string = turnType === PLACE_CHIP ? 'You placed a chip on the card.' : `You took the number **${prevCard.val}** card.`
            await prevPlayer.updateCardAndChipMenu(interaction, message)
            const currPlayer = this.currPlayer as NoThanksPlayer
            await currPlayer.updateCardAndChipMenu(null, '')
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Updates the game for when a player leaves the game.
	 *
     * @param player: the player that left
     */
    public async onPlayerLeave(player: NoThanksPlayer): Promise<void> {
        try {
            const isPlayersTurn = player.isItPlayersTurn()
            this.removePlayer(player.user)

            if (this.isGameOver) {
                return
            }

            if (isPlayersTurn) {
                const plural = this.currCard.numChips > 1 || this.currCard.numChips === 0
                const message = `<@${player.id}> left the game.\n\n>>> There ${plural ? 'are' : 'is'} now **${this.currCard.numChips} chip${plural ? 's' : ''} on the card.**\nThe current card number is **${this.currCard.val}**.\n${this.howManyCardsLeft()}`
                await this.updateGameMessage(this.getGameMessage(message))
                // Update new current player's card and chip menu
                const currPlayer = this.currPlayer as NoThanksPlayer
                await currPlayer.updateCardAndChipMenu(null, '')
            } else {
                const playerLeftMessage = `<@${player.id}> just left the game 👋.\n\n`
                const description = playerLeftMessage + this.gameMessage.embeds[0].description
                await this.updateGameMessage(this.getGameMessage(description))
            }

            await this.updateGameInviteMessage(false)
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Returns the string representation of how many cards are left in the game.
     */
    private howManyCardsLeft(): string {
        const cardsLeft = this.deck.length + 1
        return `There ${cardsLeft > 1 ? 'are' : 'is'} ${cardsLeft} ${cardsLeft > 1 ? 'cards' : 'card'} left.`
    }

    /**
     * Checks if the game is finished or not.
     */
    public checkIfGameIsOver(): boolean {
        if (!this.hasStarted) return false
        this.isGameOver = this.deck.length === 0 || this.numPlayers === 1
        if (this.isGameOver) {
            this.end(false)
        }
        return this.isGameOver
    }

    /**
     * Returns the string representation of the leaderboard as well as the winner
	 * (or winners if there's a tie) of the game.
     */
    public getLeaderBoard(): [string, User[]] {
        const leaderBoard = []
        for (const player of this.players) {
            leaderBoard.push({ user: player.user, score: player.totalScore })
        }
        leaderBoard.sort((a, b) => a.score - b.score)
        const bestScore = leaderBoard[0].score
        const winners = []
        let res = ''
        for (let i = 0; i < leaderBoard.length; i++) {
            let emoji = '👤'
            if (i === 0 || i > 0 && leaderBoard[i].score === bestScore) {
                emoji = '🥇'
                winners.push(leaderBoard[i].user)
            } else if (i === leaderBoard.length - 1) {
                emoji = '💩'
            }
            res += `${emoji} **${leaderBoard[i].user.username}** — **${leaderBoard[i].score} points**`
            if (i < leaderBoard.length - 1) {
                res += '\n'
            }
        }
        return [res, winners]
    }
}
