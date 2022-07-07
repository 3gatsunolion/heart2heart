import { Collection, Snowflake, Message, MessageEmbed, MessageComponentInteraction, Interaction } from 'discord.js';
import NoThanksGame from './Game';
import Player from './Player';
import GameManager from '../utils/GameManager';

const interactionIds = new Set(
    [
        'nothanks_rules',
        'nothanks_start',
        'nothanks_end',
        'nothanks_cancel',
        'nothanks_leave_during_game',
        'nothanks_view_cards',
        'nothanks_take_card',
        'nothanks_place_chip',
    ],
)

export default class NoThanksGameManager extends GameManager {
    /**
     * Collection of No Thanks! games managed by the instance.
     */
    declare games: Collection<Snowflake, NoThanksGame>

    /**
     * Creates the No Thanks! game state manager.
     */
    constructor() {
        super()
    }

    /**
     * Creates a new game of No Thanks!
	 *
	 * @param command: the command message object (?nothanks) that prompted this initialization
     * @param prefix: the prefix for this bot in this guild the command was sent
     */
    public async createGame(command: Message, prefix: string): Promise<void> {
        if (!(await this.canCreateNewGame(command))) return

        const game = new NoThanksGame(command.author, command.channelId, prefix)
        this.games.set(command.channel!.id, game)

        // TODO: Add messagecomponentcollectorhere
        game.on('gameover', this.removeGame.bind(this))
        game.on('error', this.sendErrorMessage.bind(this))
        game.sendGameInvite(command)
    }

    /**
     * Sends an ephemeral message to user outlining the rules of No Thanks!
	 *
	 * @param interaction: the interaction (i.e. user pressing the 'Rules' button) that triggered this action
     */
    public async displayGameRules(interaction: MessageComponentInteraction): Promise<void> {
        const rulesEmbed = new MessageEmbed()
            .setColor(NoThanksGame.colour)
            .setTitle(':pencil2: **No Thanks! Game Rules** :pencil2:')
            .addFields(
                { name: '__Components__', value: '⦁ 33 cards numbered from 3 to 35\n⦁ Player chips/counters 🔴' },
                { name: '__Setup__', value: '⦁ Chips are distributed as such:\n➼ *2-5 players (11 chips per player)*\n➼ *6 players (9 chips per player)*\n➼ *7 players (7 chips per player)*\n⦁ All 33 cards are shuffled with 9 cards randomly taken out 🔀' },
                { name: '__Gameplay__', value: `⦁ The game starts with a card turned face up\n⦁ During each turn, a player has to either:
➼ *Take the face up card and all chips placed on it. Another card is turned up for the next player's turn*
***OR***
➼ *Decline it and put one of their chips next to the card. If the player does not have any more chips,* ***they must take the card*** 🤡
⦁ After all 24 cards have found an owner, the game ends. The player with the lowest score (i.e. the fewest points) wins! 👑` },
                { name: '__Objective__', value: `
				⦁ The goal is to get the ***lowest total score***
⦁ Each chip is worth -1 points 👏
⦁ Each single card is worth its face value. In other words, a 7 counts as seven points, a 15 brings fifteen points, and so on
⦁ Unbroken number sequences only count as points according to the lowest number of the sequence
➼ *For example, if a player has the cards with the numbers 17, 18, 19 and 20, all of them together count as 17 points*
⦁ ***But remember!*** 🚨 9 random cards are removed at the start of the game. So if you're looking to chain together some numbers, the number you're looking for may not be in the playing deck! 😱
\nThat's it! Now it's time to have fun 🤸‍♀️
				` },
            )
        interaction.reply({ embeds: [rulesEmbed], ephemeral: true }).catch(() => {})
    }

    /**
     * Sends an ephemeral message to player that displays their cards and number of chips.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async showCardAndChipMenu(interaction: MessageComponentInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [NoThanksGame, Player]
        player.sendCardAndChipMenu(interaction)
    }

    /**
     * Carries out the action of a player taking the current card in the game.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async takeCard(interaction: MessageComponentInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [NoThanksGame, Player]
        await interaction.deferUpdate()
        player.takeCard(interaction)
    }

    /**
     * Carries out the action of a player placing a chip on the current card.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public async placeChip(interaction: MessageComponentInteraction): Promise<void> {
        const res = await this.findGameWithUser(interaction)
        if (!res) return
        const [game, player] = res as [NoThanksGame, Player]
        await interaction.deferUpdate()
        player.placeChip(interaction)
    }

    /**
     * Handles all interactions of this game.
	 *
	 * @param interaction: the interaction that triggered this action
     */
    public handleInteraction(interaction: Interaction): void {
        if (!interaction.isButton()) {
            return
        }

        const id = interaction.customId
        if (!id.startsWith('nothanks') || !interactionIds.has(interaction.customId)) {
            return
        }

        if (interaction.isButton()) {
            switch (id) {
                case ('nothanks_rules'):
                    this.displayGameRules(interaction)
                    break
                case ('nothanks_start'):
                    this.startGame(interaction)
                    break
                case ('nothanks_end'):
                case ('nothanks_cancel'):
                    this.endGame(interaction)
                    break
                case ('nothanks_leave_during_game'):
                    this.leaveDuringGame(interaction)
                    break
                case ('nothanks_view_cards'):
                    this.showCardAndChipMenu(interaction)
                    break
                case ('nothanks_take_card'):
                    this.takeCard(interaction)
                    break
                case ('nothanks_place_chip'):
                    this.placeChip(interaction)
                    break
                default:
                    break
            }
        }
    }
}
