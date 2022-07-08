# Heart2Heart
Introducing **Heart2Heart**, a Discord bot designed for you to play games alone or with your friends!

## Invite
Click <a href="https://discord.com/api/oauth2/authorize?client_id=984759850577842188&permissions=272448&scope=bot">here</a> to invite Heart2Heart to your Discord server.

Run `?help` to see a list of all commands.

## Prefix
The default prefix is `?`. Use command `setprefix` to set a new prefix for the server.

## 🎮 Games
- [No Thanks!](#no-thanks)
- [Regicide](#regicide)
<!-- end of the list -->
More games to come!

<h2 id="no-thanks">No Thanks!</h2>
<a href="https://boardgamegeek.com/boardgame/12942/no-thanks">No Thanks!</a> is a popular board game designed by Thorsten Gimmler.

### Commands
- Use command `?nothanks` to create a new game of **No Thanks!**.

<!-- ![Create new game of No Thanks!](https://github.com/3gatsunolion/heart2heart/blob/master/assets/nothanks/demo/no-thanks-create-game.gif) -->
- Use command `?nothanks end` to end the game.

<!-- ![End game of No Thanks!](https://github.com/3gatsunolion/heart2heart/blob/master/assets/nothanks/demo/no-thanks-end-game.gif) -->

### Gameplay
The rules are simple. Each turn, players have two options:
- play one of their chips to avoid picking up the current face-up card
- pick up the face-up card (along with any chips that have already been played on that card) and turn over the next card

![No Thanks! Turn Options](https://github.com/3gatsunolion/heart2heart/blob/master/assets/nothanks/demo/no-thanks-turn-options.gif)

The choices aren't so easy as players compete to have the **lowest score** at the end of the game. The deck of cards is numbered from 3 to 35, with each card counting for a number of points equal to its face value. Runs of two or more cards only count as the lowest value in the run - but nine cards are removed from the deck before starting, so be careful looking for connectors. Each chip is worth -1 point, but they can be even more valuable by allowing you to avoid drawing that unwanted card.

![No Thanks! Turn Options](https://github.com/3gatsunolion/heart2heart/blob/master/assets/nothanks/demo/no-thanks-consecutive-runs.gif)

Once all 24 cards have found its owner, the player with the lowest final score wins!

![No Thanks! Turn Options](https://github.com/3gatsunolion/heart2heart/blob/master/assets/nothanks/demo/no-thanks-gameover.gif)

<h2 id="regicide">Regicide</h2>

<a href="https://www.badgersfrommars.com/regicide">Regicide</a> is a cooperative, fantasy card game for 1 to 4 players, played using a standard deck of cards. Players work together to defeat the 12 corrupted monarchs.

### Commands
- Use command `?regicide` to create a new game of **Regicide**.

![Create a new game of Regicide](https://github.com/3gatsunolion/heart2heart/blob/master/assets/regicide/demo/regicide-create-game.gif)
- Use command `?regicide end` to end the game.

### Gameplay
Players take turns to play cards to attack the enemy. Playing a card (or cards) to damage the enemy also grants a power associated with the suit of that card. Once enough damage is dealt, the enemy is defeated.

![Regicide Attack](https://github.com/3gatsunolion/heart2heart/blob/master/assets/regicide/demo/regicide-attack.gif)

But beware! Each turn the enemy strikes back. Players will discard cards to satisfy the damage and if they can't discard enough, everyone loses.

![Regicide Suffer Damage](https://github.com/3gatsunolion/heart2heart/blob/master/assets/regicide/demo/regicide-suffer-damage.gif)

The players win when the last King is defeated.

![Regicide Victory](https://github.com/3gatsunolion/heart2heart/blob/master/assets/regicide/demo/regicide-victory.gif)

Rich with tactical decisions and a deep heuristic tree, **Regicide** is a huge challenge for anyone who is brave enough to take it on! A comprehensive rule guide to the game can be found <a href="https://www.badgersfrommars.com/assets/RegicideRulesA4.pdf">here</a>.
