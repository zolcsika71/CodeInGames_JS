/**
 * Auto-generated code below aims at helping you parse
 * the standard input according to the problem statement.
 * ---
 * Hint: You can use the debug stream to print initialTX and initialTY, if Thor seems not follow your orders.
 **/

let inputs = readline().split(' '),
    currentPosX,
    currentPosY;



const lightX = parseInt(inputs[0]); // the X position of the light of power
const lightY = parseInt(inputs[1]); // the Y position of the light of power
const initialTx = parseInt(inputs[2]); // Thor's starting X position
const initialTy = parseInt(inputs[3]); // Thor's starting Y position

// game loop
while (true) {
    const remainingTurns = parseInt(readline()); // The remaining amount of turns Thor can move. Do not remove this line.

    let directions = (currentPosX, currentPosY) => {

            let basicDirection = {
                N:  () => {
                    if (currentPosY - lightY > 0) {
                        currentPosY--;
                        return true;
                    } else
                        return false;
                },
                S: () => {
                    if (currentPosY - lightY < 0) {
                        currentPosY++;
                        return true;
                    } else
                        return false;

                },
                E: () => {
                    if (currentPosY - lightX < 0) {
                        currentPosX++;
                        return true;
                    } else
                        return false;
                },
                W: () => {
                    if (currentPosY - lightX > 0) {
                        currentPosX--;
                        return true;
                    } else
                        return false;
                }
            },
                extendedDirection = {
                    NE: () => {
                        if (basicDirection.N && basicDirection.E) {
                            currentPosX--;
                            currentPosY++;
                            return true;
                        } else
                            return false;
                    },
                    NW: () => {
                        if (basicDirection.N && basicDirection.W) {
                            currentPosX--;
                            currentPosY--;
                            return true;
                        } else
                            return false;
                    },
                    SE: () => {
                        if (basicDirection.S && basicDirection.E) {
                            currentPosX++;
                            currentPosY++;
                            return true;
                        } else
                            return false;
                    },
                    SW: () => {
                        if (basicDirection.S && basicDirection.W) {
                            currentPosX++;
                            currentPosY--;
                            return true;
                        } else
                            return false;
                    }
                };

            for (let direction in extendedDirection)
                if (extendedDirection[direction])
                    return direction;
            for (let direction in basicDirection)
                if (basicDirection[direction])
                    return direction;
        };

    if (!currentPosX)
        currentPosX = initialTx;
    if (!currentPosY)
        currentPosY = initialTy;

    // A single line providing the move to be made: N NE E SE S SW W or NW
    console.log(directions(currentPosX, currentPosY));
}
