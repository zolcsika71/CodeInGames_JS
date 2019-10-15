"use strict";

const
    BOOST = 'BOOST',
    boostRadius = 2000, // Minimum distance for activating boost
    radius = 350, // Distance starting from the middle of the checkpoint for the racer to aim for
    // Distance steps for slowing down the racer
    brakeStep1 = 1300,
    brakeStep2 = 1100,
    brakeStep3 = 800;

let mapReady = false,
    map = [],
    CPIndex,
    CPIndexNext,
    point,
    thrust,
    myPod,
    log = {},
    boostAvailable = true,
    findCoords = (nextCPPos) => {
        return map.findIndex(i => i.x === nextCPPos.x && i.y === nextCPPos.y);
    },
    fillMap = (nextCPPos) => {

        let index = findCoords(nextCPPos);

        if (index === -1)
            map.push(nextCPPos);
        else if (index !== map.length - 1)
            mapReady = true;

        if (index === -1)
            return map.length - 1;
        else
            return index;
    };

class Point {
    constructor (position) {
        this.x = position.x;
        this.y = position.y;
        this.radius = radius;
    }
    dist (point) {
        let x = Math.abs(this.x - point.x),
            y = Math.abs(this.y - point.y);

        return Math.hypot(x, y)
    }
}

class Pod extends Point {

    constructor (position, point, angle) {
        super(position);
        this.point = point;
        this.angle = angle;
    }
    adjustSpeed () {

        // If angle is too wide
        if (this.angle >= 90 || this.angle <= -90)
            return 0;
        else {
            let dist = this.dist(this.point);
            if (dist > boostRadius && boostAvailable && this.angle === 0 && mapReady) {
                boostAvailable = false;
                return BOOST;
            } else if (dist <= brakeStep3) {
                return 25;
            } else if (dist <= brakeStep2) {
                return 50;
            } else if (dist <= brakeStep1) {
                return 75;
            }
        }
        return 100;
    }
    calculateGoal () {

        let m = (this.point.y - this.y) / (this.point.x - this.x),
            b = this.point.y - m * this.point.x,
            // Calculate the two interference points
            x1 = (this.point.x + this.radius / Math.sqrt(1 + m * m)),
            x2 = (this.point.x - this.radius / Math.sqrt(1 + m * m)),
            point1 = {
                x: x1,
                y: m * x1 + b
            },
            point2 = {
                x: x2,
                y: m * x2 + b
            };

        if (this.dist(point1) < this.dist(point2))
            return point1;

        return point2;
    }
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


    if (!mapReady) {
        CPIndex = fillMap(nextCP.pos);
        myPod = new Pod(myPos, nextCP.pos, nextCP.angle);
        point = myPod.calculateGoal();
    } else {
        CPIndex = findCoords(nextCP.pos);
        CPIndexNext = CPIndex + 1 === map.length ? 0 : CPIndex + 1;
        myPod = new Pod(map[CPIndexNext], nextCP.pos, nextCP.angle);
        point = myPod.calculateGoal();
        log.map = `mapReady: ${mapReady} mapLength: ${map.length} next_x: ${map[CPIndexNext].x} next_y: ${map[CPIndexNext].y} CPIndexNext: ${CPIndexNext}`;
        console.error(log.map);
    }

    myPod = new Pod(myPos, point, nextCP.angle);
    thrust = myPod.adjustSpeed();

    log.basic = `x: ${Math.round(point.x)} y: ${Math.round(point.y)} thrust: ${thrust}`;
    log.incompleteMap = `mapReady: ${mapReady} mapLength: ${map.length} x: ${map[CPIndex].x} y: ${map[CPIndex].y} CPIndex: ${CPIndex} CPIndexNext: ${CPIndexNext}`;

    console.error(log.incompleteMap);

    console.log(Math.round(point.x), Math.round(point.y), thrust);

}
