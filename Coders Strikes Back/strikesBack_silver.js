"use strict";

const
    collusionDistToOpp = 800, // Maximum distance for activating shield
    boostDist = 4000, // Minimum distance for activating boost
    targetRadius = 300, // Distance starting from the middle of the checkpoint for the racer to aim for
    // Distance steps for slowing down the racer
    gauss = {
        far: { // variable: angle
            a: 100, // max value
            b: 0, // middle
            c: 30 // bell width
        },
        break: { // variable: speed
            a: 100,
            b: 0,
            c: 200
        },
        targetRadius: { //  variable: targetRadius
            a: targetRadius,
            b: 0,
            c: 90
        }
    },
    breakDist = 1600;

let mapReady = false,
    currentGauss,
    value,
    map = [],
    CPIndex,
    CPIndexNext,
    point,
    thrust,
    mySpeed,
    opponentSpeed,
    angle,
    collusion,
    collisionTimer = 0,
    myPod,
    firstRound = true,
    log = {},
    myLastPos = {},
    opponentLastPos = {},
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
    },
    countSpeed = (position, target, opponent = false) => {

        let myPosition = new Point(position),
            speed = myPosition.dist(target);

        if (opponent) {
            opponentLastPos.x = target.x;
            opponentLastPos.y = target.y;
        } else {
            myLastPos.x = target.x;
            myLastPos.y = target.y;
        }

        return Math.round(speed);

    },
    checkCollusion = (myPos, opponentPos) => {

        let myPosition = new Point(myPos.x, myPos.y),
            myDistToOpponent = Math.round(myPosition.dist(opponentPos));

        console.error(`distToOpponent: ${myDistToOpponent}`);


        if (myDistToOpponent < collusionDistToOpp) {
            collisionTimer = 2;
            return true;
        } else
            return false;

    },
    gaussValue = (gauss, value) => Math.round(gauss.a / Math.pow(Math.E, (Math.pow(value - gauss.b, 2)) / (2 * gauss.c * gauss.c))),
    setThrust = (dist, speed, angle) => {

            if (dist >= breakDist) {
                currentGauss = gauss.far;
                value = angle;
                thrust = gaussValue(currentGauss, value);
                console.error(`gaussValue far: ${thrust}`);
            } else {
                currentGauss = gauss.break;
                value = speed;
                thrust = gaussValue(currentGauss, value);
                console.error(`gaussValue break: ${thrust}`);
            }
            return thrust;
        };

class Point {
    constructor (position) {
        this.x = position.x;
        this.y = position.y;
    }
    dist (target) {
        let x = Math.abs(this.x - target.x),
            y = Math.abs(this.y - target.y);

        return Math.round(Math.hypot(x, y));
    }
    /*
    getAngle (target) {
        let dist = this.dist(target),
            dx = (target.x - this.x) / dist,
            dy = (target.y - this.y) / dist,
            angle = Math.acos(dx) * 180 / Math.PI;

        if (dy < 0)
            angle = 360 - angle;

        if (angle <= 359 && angle > 90)
            angle = angle - 270;
        else if (angle >= 0 && angle <= 90)
            angle = angle + 90;

        console.error(`converted_angle: ${angle}`);

        return Math.round(angle);
    }
    */

}

class Pod extends Point {

    constructor (position, target, angle = 0) {
        super(position);
        this.target = target;
        this.angle = angle;
    }
    adjustThrust (speed, nextCPDist) {

        // If angle is too wide
        if (Math.abs(this.angle) >= 90)
            return 0;
        else {
            let dist = nextCPDist;

            if (dist > boostDist && boostAvailable && this.angle === 0 && mapReady) {
                boostAvailable = false;
                return 'BOOST';
            } else
                return setThrust(dist, speed, this.angle);
        }
    }
    calculateGoal () {

        let m = this.target.x - this.x === 0 ? 1 : (this.target.y - this.y) / (this.target.x - this.x),
            b = this.target.y - m * this.target.x,
            targetR = gaussValue(gauss.targetRadius, this.angle),
            // Calculate the two interference points
            x1 = (this.target.x + targetR / Math.sqrt(1 + m * m)),
            x2 = (this.target.x - targetR / Math.sqrt(1 + m * m)),
            point1 = {
                x: Math.round(x1),
                y: Math.round(m * x1 + b)
            },
            point2 = {
                x: Math.round(x2),
                y: Math.round(m * x2 + b)
            };

        log.goal = `m: ${Math.round(m)} b: ${Math.round(b)} point1_x: ${point1.x} point1_y: ${point1.y} point2_x: ${point2.x} point2_y: ${point2.y} m_y: ${this.target.y - this.y} m_x: ${this.target.x - this.x}`;
        log.radius = `targetRadius: ${targetR}`;

        console.error(log.radius);

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
        //log.map = `mapReady: ${mapReady} mapLength: ${map.length} next_x: ${map[CPIndexNext].x} next_y: ${map[CPIndexNext].y} CPIndexNext: ${CPIndexNext}`;
        //console.error(log.map);
    }

    if (firstRound) {
        myLastPos.x = myPos.x;
        myLastPos.y = myPos.y;
        opponentLastPos.x = opponentPos.x;
        opponentLastPos.y = opponentPos.y;
        firstRound = false;
    }

    //console.error(`${myPos} ${point} ${nextCP.angle}`);
    myPod = new Pod(myPos, point, nextCP.angle);
    mySpeed = countSpeed(myLastPos, myPos);
    opponentSpeed = countSpeed(opponentLastPos, opponentPos, true);
    collusion = checkCollusion(myPos, opponentPos, nextCP.pos, mySpeed, opponentSpeed);
    thrust = collusion ? 'SHIELD' : myPod.adjustThrust(mySpeed, nextCP.dist);

    log.basic = `nextCP_dist: ${nextCP.dist} nextCP_angle: ${nextCP.angle} thrust: ${thrust} speed: ${mySpeed} collusion: ${collusion}`;
    log.incompleteMap = `mapReady: ${mapReady} mapLength: ${map.length} x: ${map[CPIndex].x} y: ${map[CPIndex].y} CPIndex: ${CPIndex} CPIndexNext: ${CPIndexNext}`;


    console.error(log.basic);
    //console.error(log.incompleteMap);

    console.log(`${point.x} ${point.y} ${thrust} ${thrust}`);

}
