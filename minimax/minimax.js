/*
lets visualize the above game state
                                   O |   | X
                                   ---------
                                   X |   | X
                                   ---------
                                     | O | O
                             //       ||        \\
                O | X | X          O |   | X        O |   | X
                ---------          ---------        ---------
                X |   | X          X | X | X        X |   | X
                ---------          ---------        ---------
                  | O | O            | O | O        X | O | O
              //          \\                     //          \\
        O | X | X          O | X | X        O | O | X       O |   | X
        ---------          ---------        ---------       ---------
        X | O | X          X |   | X        X |   | X       X | O | X
        ---------          ---------        ---------       ---------
          | O | O          O | O | O        X | O | O       X | O | O
                                        //
                                   O | O | X
                                   ---------
                                   X | X | X
                                   ---------
                                   O | O | O
*/
// human
let huPlayer = 'X';
// ai
let aiPlayer = 'O';

function getObjectAttr(x) {
	return JSON.stringify(x, null, 2);
}

// this is the board flattened and filled with some values to easier asses the Artificial Inteligence.
//let origBoard = ['O',1 ,'X','X',4 ,'X', 6 ,'O','O'];
let origBoard = ['X',1,2,3,4,5,6,7,8];

//keeps count of function calls
let fc = 0;

// finding the ultimate play on the game that favors the computer
let bestSpot = minimax(origBoard, aiPlayer);
console.log(`bestSpot: ${getObjectAttr(bestSpot)}`);

//loging the results
//console.log('index: ' + bestSpot.index);
//console.log('function calls: ' + fc);

// the main minimax function
function minimax(newBoard, player){
	//add one to function calls
	fc++;

	//available spots
	let availSpots = emptyIndexes(newBoard);
	// if (fc < 100) {
	// 	console.log(`fc: ${fc} availSpots ${availSpots}`);
	// }



	// checks for the terminal states such as win, lose, and tie and returning a value accordingly
	if (winning(newBoard, huPlayer)){
		return {score:-10};
	}
	else if (winning(newBoard, aiPlayer)){
		return {score:10};
	}
	else if (availSpots.length === 0){
		return {score:0};
	}

	// an array to collect all the objects
	let moves = [];

	// loop through available spots
	for (let i = 0; i < availSpots.length; i++){
		//create an object for each and store the index of that spot that was stored as a number in the object's index key
		let move = {};
		move.index = newBoard[availSpots[i]];

		// set the empty spot to the current player
		newBoard[availSpots[i]] = player;

		//if collect the score resulted from calling minimax on the opponent of the current player
		if (player === aiPlayer){
			let result = minimax(newBoard, huPlayer);
			move.score = result.score;
		}
		else{
			let result = minimax(newBoard, aiPlayer);
			move.score = result.score;
		}

		//reset the spot to empty
		newBoard[availSpots[i]] = move.index;

		// push the object to the array
		moves.push(move);
	}

	// if it is the computer's turn loop over the moves and choose the move with the highest score
	let bestMove;
	if(player === aiPlayer){
		let bestScore = -10000;
		for(let i = 0; i < moves.length; i++){
			if(moves[i].score > bestScore){
				bestScore = moves[i].score;
				bestMove = i;
			}
		}
	}else{

		// else loop over the moves and choose the move with the lowest score
		let bestScore = 10000;
		for(let i = 0; i < moves.length; i++){
			if(moves[i].score < bestScore){
				bestScore = moves[i].score;
				bestMove = i;
			}
		}
	}

	// return the chosen move (object) from the array to the higher depth
	return moves[bestMove];
}

// returns the available spots on the board
function emptyIndexes(board){
	return  board.filter(s => s !== 'O' && s !== 'X');
}

// winning combinations using the board indexies for instace the first win could be 3 xes in a row
function winning(board, player){
	return (board[0] === player && board[1] === player && board[2] === player) ||
		(board[3] === player && board[4] === player && board[5] === player) ||
		(board[6] === player && board[7] === player && board[8] === player) ||
		(board[0] === player && board[3] === player && board[6] === player) ||
		(board[1] === player && board[4] === player && board[7] === player) ||
		(board[2] === player && board[5] === player && board[8] === player) ||
		(board[0] === player && board[4] === player && board[8] === player) ||
		(board[2] === player && board[4] === player && board[6] === player);
}
