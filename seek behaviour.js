"use strict";



class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add (vector) {
        return new Vector(this.x + vector.x, this.y + vector.y);
    }
    subtract (vector) {
        return new Vector(this.x - vector.x, this.y - vector.y);
    }
    multiply (scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }
    magnitude () {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    divide (scalar) {
        return new Vector(Math.round(this.x / scalar), Math.round(this.y / scalar));
    }
    normalisedVector () {
        return this.divide(this.magnitude());
    }
    position (velocity) {
        return this.add(velocity);
    }
    /*
    velocityVector (target) {
        return target.subtract(this).normalisedVector().multiply(maxVelocity);
    }
    */

}
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    distSquare (point) {

        let x = this.x - point.x,
            y = this.y - point.y;

        return Math.pow(x, 2) + Math.pow(y, 2);
    }
    dist (point) {
        return Math.sqrt(this.distSquare(point));
    }
    closest (pointA, pointB) { // find the closest point on a line (described by two points) to my point.
        let da = pointB.y - pointA.y,
            db = pointA.x - pointB.x,
            c1 = da * pointA.x + db * pointA.y,
            c2 = -db * this.x + da * this.y,
            det = Math.pow(da, 2) + Math.pow(db, 2),
            cx,
            cy;
        if (det !== 0) { // point on the line
            cx = (da * c1 - db * c2) / det;
            cy = (da * c2 + db * c1) / det;
        } else { // The point is already on the line
            cx = this.x;
            cy = this.y;
        }
        return new Point(cx, cy);
    }
}
class Checkpoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 600;
    }
}


const
    collusionDistToOpp = 800, // pod radius * 2
    boostDist = 2000, // Minimum distance for activating boost
    targetRadius = 350, // Distance starting from the middle of the checkpoint for the racer to aim for
    vectorMagnitude = 1,
    maxVelocity = 100,
    breakDist = 1300;

let checkpoints = [],
    collisionTimer = 0,
    mapReady = false,
    boostAvailable = true,
    firstRound = true,
    log = {},
    myLastPos = {},
    opponentLastPos = {},
    checkpointIndex,
    nextCheckPointIndex,
    targetPoint,
    baseVector = (point1, point2) => {
        return {
            x: point2.x - point1.x,
            y: point2.y - point1.y
        };
    },
    velocityVector = (position, target) => {
        let baseV = baseVector(position, target),
            vector = new Vector(baseV.x, baseV.y);

        vector = vector.normalisedVector();

        return vector.multiply(maxVelocity)

    },

    findCoords = checkpoint => checkpoints.findIndex(i => i.x === checkpoint.x && i.y === checkpoint.y),
    fillMap = checkpoint => {
        let index = findCoords(checkpoint);

        if (index === -1)
            checkpoints.push(new Checkpoint(checkpoint.x, checkpoint.y));
        else if (index !== checkpoints.length - 1)
            mapReady = true;

        if (index === -1)
            return checkpoints.length - 1;
        else
            return index;
    },
    countSpeed = (position, target, opponent = false) => {

        let myPosition = new Point(position.x, position.y),
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
    setThrust = (dist, speed, angle) => {

        let thrust;

        if (dist >= breakDist || (Math.abs(angle) > 3)) {
            thrust = gaussValue(angle, gauss.far) * gaussConst.far;
            console.error(`gaussValue far: ${thrust}`);
        } else {
            thrust = gaussValue(speed, gauss.break);
            console.error(`gaussValue break: ${thrust}`);
        }
        return Math.round(thrust);
    },
    adjustThrust = (speed, dist, angle) => {
        // If angle is too wide
        if (Math.abs(angle) >= 90)
            return 0;
        else {

            if (dist > boostDist && boostAvailable && angle === 0 && mapReady) {
                boostAvailable = false;
                return 'BOOST';
            } else
                return setThrust(dist, speed, angle);
        }
    },
    calculateGoal = (myPos, startPos, targetPos, angle) => {

        //console.error(`startPos.x: ${startPos.x} startPos.y: ${startPos.y} targetPos.x: ${targetPos.x} targetPos.y: ${targetPos.y}`);

        let //m = targetPos.x - myPos.x === 0 ? 1000 : (targetPos.y - myPos.y) / (targetPos.x - myPos.x),
            m = (targetPos.y - startPos.y) / (targetPos.x - startPos.x),
            b = targetPos.y - m * targetPos.x,
            //targetR = targetRadius,
            // Calculate the two interference points
            x1 = (targetPos.x + targetRadius / Math.sqrt(1 + m * m)),
            x2 = (targetPos.x - targetRadius / Math.sqrt(1 + m * m)),
            point1 = {
                x: Math.round(x1),
                y: Math.round(m * x1 + b)
            },
            point2 = {
                x: Math.round(x2),
                y: Math.round(m * x2 + b)
            },
            myPosition = new Point(startPos.x, startPos.y),
            dist1 = myPosition.dist(point1),
            dist2 = myPosition.dist(point2),
            baseV,
            vector;

        //console.error(`point1.x: ${point1.x} point1.y: ${point1.y} point2.x: ${point2.x} point2.y: ${point2.y} pointDist1: ${Math.round(dist1)} pointDist2: ${Math.round(dist2)}`);
        console.error(`targetRadius: ${Math.round(targetR)}`);

        if (dist1 < dist2) {
            if (mapReady)
                baseV = baseVector(myPos, point1);
            else
                baseV = baseVector(startPos, point1);
        } else {
            if (mapReady)
                baseV = baseVector(myPos, point2);
            else
                baseV = baseVector(startPos, point2);
        }

        vector = new Vector(baseV.x, baseV.y);
        vector = vector.normalisedVector();

        //return new Point(startPos.x + vector.x, startPos.y + vector.y);

        console.error(`vector.x: ${vector.x * vectorMagnitude} vector.y: ${vector.y * vectorMagnitude}`);

        return {
            x: vector.x * vectorMagnitude,
            y: vector.y * vectorMagnitude
        }

    };

while (true) {

    let myData = readline().split(' '),
        checkpoint = {
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



    if (firstRound) {
        myLastPos.x = myPos.x;
        myLastPos.y = myPos.y;
        opponentLastPos.x = opponentPos.x;
        opponentLastPos.y = opponentPos.y;
        firstRound = false;
    }
    if (mapReady) {
        checkpointIndex = findCoords(checkpoint.pos);
        nextCheckPointIndex = checkpointIndex + 1 === checkpoints.length ? 0 : checkpointIndex + 1;
        targetPoint = targetPoint = calculateGoal(myPos, checkpoints[nextCheckPointIndex], checkpoint.pos, checkpoint.angle);
    } else {
        checkpointIndex = fillMap(checkpoint.pos);
        targetPoint = calculateGoal(myPos, myPos, checkpoint.pos, checkpoint.angle);
    }
    let mySpeed = countSpeed(myLastPos, myPos),
        collisionDetected = false,
        thrust;

    if (!collisionDetected || collisionTimer === 0)
        collisionDetected = checkCollusion(myPos, opponentPos);
    else
        collisionTimer -= 1;

    thrust = collisionDetected ? 'SHIELD' : adjustThrust(mySpeed, checkpoint.dist, checkpoint.angle);

    log.basic = `nextCP_dist: ${checkpoint.dist} nextCP_angle: ${checkpoint.angle} thrust: ${thrust} speed: ${mySpeed} collusion: ${collisionDetected}`;
    log.incompleteMap = `mapReady: ${mapReady} mapLength: ${checkpoints.length} x: ${checkpoints[checkpointIndex].x} y: ${checkpoints[checkpointIndex].y} CPIndex: ${checkpointIndex} CPIndexNext: ${nextCheckPointIndex}`;


    console.error(log.basic);
    console.error(log.incompleteMap);

    console.log(`${targetPoint.x} ${targetPoint.y} ${thrust} ${thrust}`);

}



