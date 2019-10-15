"use strict";

class Point {
    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
    dist (point) {
        let x = Math.abs(this.x - point.x),
            y = Math.abs(this.y - point.y);

        return Math.hypot(x, y)
    }
}

class Pod extends Point {

}


// game loop
while (true) {

    let myData = readline().split(' '),
        nextCP = {
            pos: {
                x: parseInt(myData[2]), // x position of the next check point
                y: parseInt(myData[3]) // y position of the next check point
            },
            dist: parseInt(myData[4]), // distance to the next checkpoint
            angle: parseInt(myData[5]) // angle between your pod orientation and the direction of the next checkpoint
        },
        myPos = {
            x: parseInt(myData[0]), // my x pos
            y: parseInt(myData[1]) // my y pos
        },
        opponentData = readline().split(' '),
        opponentPos = {
            x: parseInt(opponentData[0]),
            y: parseInt(opponentData[1])
        };
}