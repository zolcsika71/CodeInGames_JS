let inputs = readline().split(' ');
const lightX = parseInt(inputs[0]); // the X position of the light of power
const lightY = parseInt(inputs[1]); // the Y position of the light of power
const initialTx = parseInt(inputs[2]); // Thor's starting X position
const initialTy = parseInt(inputs[3]); // Thor's starting Y position

class Direction {
    constructor(x, y) {
       this.x = x;
       this.y = y;
    }
    moveNorth () {
        this.y--
    }
    moveSouth () {
        this.y++;
    }
    moveEast () {
        this.x++
    }
    moveWest () {
        this.x--
    }
}

let thor = new Direction(initialTx, initialTy);

// game loop
while (true) {
    let remainingTurns = parseInt(readline()); // The remaining amount of r Thor can move. Do not remove this line.

    let xMove = '',
        yMove = '';

    if (lightX < thor.x) {
        xMove = 'W';
        thor.moveWest();
    } else if (lightX > thor.x) {
        xMove = 'E';
        thor.moveEast();
    }

    if (lightY < thor.y) {
        yMove = 'N';
        thor.moveNorth()
    } else if (lightY > thor.y) {
        yMove = 'S';
        thor.moveSouth();
    }

    let answer = yMove.concat(xMove);

    // A single line providing the move to be made: N NE E SE S SW W or NW
    console.log(answer);
}
