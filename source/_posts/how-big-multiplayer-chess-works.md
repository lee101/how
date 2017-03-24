title: How Big Multiplayer Chess Works
date: 2017-03-21 23:59:32
tags:
- Chess Programming
- Big Multiplayer Chess
- Chess heuristics
- Chess algorithms
- Game Programming
photos:
- big-multiplayer-chess-logo128.png
---

[Big Multiplayer Chess](http://BigMultiplayerChess.com) is a multiplayer free for all chess variant where many players on a large board can move pawns in any direction and can slide castles bishops and queens upto 8 places.

Some metrics or heuristics must be used to score how good a board configuration is for a player,

ones that i use in [Big Multiplayer Chess](http://BigMultiplayerChess.com):
* players power:  a weighted sum of pieces
* players mobility: the number of moves a player has available to them, this prompts players to spread out and cover more ground, it makes players prefer being able to quickly move pieces around and not get closed in, generally more options=better
* players protection: the amount of times you can take yourself, inversely weighted based on their power, e.g. its great to be able to take your pawns to protect them but if you can take your queen its not much good because someone would just sacrifice themselves to take your queen, its the little guys who need protection the most.
* players attacking surface: the pieces that you can take weighted by their power
* players direct danger: the flip side of attacking surface, your pieces that can be taken, weighted by their power.

I wanted to extend the algorithm too add some more heuristics to include:

* favourable exchanges: that is analyse groups of pieces that can all take each other and evaluate the favour-ability by assuming both sides throw in all their worst pieces into the conflict first.
* closeness to taking the king: num moves away from taking the king, an aggressive metric and on the flip-side 'closeness to your king' that could help the ai build walls around its king.



After setting up these heuristics the AI does a weighted sum of all the heuristics for each player then does a weighted sum for each player to come up with a single number representing how good a board configuration is and picks the one with the best configuration.

The weighted sum for each player is controlled by something i called the "hatredMatrix" and represents for a given person how much that person cares about each other person. e.g. player2 may weight the metrics computed for player1 by 1.1 and for player5 by .9 this means player2 gives more weight to harming his neighbour player1 and cares less so about player3. 

This hatredMatrix could be adjusted real time for a kind of diplomacy factor.

A common pattern for video games is to separate visual updates from game state updates, the game state/AI should be always running in the background figuring out what move to make and the animation showing that player making the move can feed off the computed game state asynchronously


[game.js file](https://github.com/lee101/mmochess/blob/master/static/js/game.js)

minimax algorithm could venture deeper and evaluate the consequences for each move if the opponents all made the most damaging move to you and so on. 
Currently the algorithm has some obvious flaws due to the lack of depth in the search like for example if a pawn and bishop are alone and adjacent the AI will move the pawn in-front of the bishop because it weighs the exchange favourable but it doesn't consider that the next move will be the bishop taking the pawn.


The harder thing about big multiplayer chess is the sheer scale of things, many move choices and mobile hardware limitations make searching deeply a slow process.

The algorithm could also work to better prune the various moves e.g. if considering the consequences of a move only think about possible counter moves in the 8x squares area around the moves start and finish.

Please check the game out and id love to hear any feedback! :)

I'd also love to extend the game in lots of other weird ways :)

[random connect 4 codepen](https://codepen.io/lonekorean/project/editor/ZGpqVX/)
