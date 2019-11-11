"use strict";

const
    collisionDistToOpp = 800, // pod radius * 2
    collisionThreshold = 100, // opponent velocity - my velocity
    boostDist = 4000, // Minimum distance for activating boost
    targetRadius = 350, // Distance starting from the middle of the checkpoint for the racer to aim for
    maxVelocity = 1,
    breakDist = 1300,
    disabledAngle = 45 + 18,
    gauss = {
        far: { // x: angle
            a: -90, // min x
            b: 90, // max x
            mu: 0, // location parameter
            sigma: 30 // scale parameter
        },
        break: { // x: speed
            a: 0, // min x
            b: 700, // max x
            mu: 0, // location parameter
            sigma: 40 // scale parameter
        },
        targetRadius: { // x: targetRadius
            a: -90, // min x
            b: 90, // max x
            mu: 0, // location parameter
            sigma: 10 // scale parameter
        }
    };

function baseVector(point1, point2) {
    return {
        x: point2.x - point1.x,
        y: point2.y - point1.y
    };
}

function lastPosition(position, variable) {
    let returnValue;
    variable.push(position);
    if (variable.length === 1)
        returnValue = variable[0];
    else {
        returnValue = variable[0];
        variable = variable.slice(1);
    }
    return {
        lastPos: returnValue,
        tempVariable: variable
    };
}

function erf(x) {
    const ERF_A = 0.147;
    let the_sign_of_x;

    if (x === 0) {
        the_sign_of_x = 0;
        return 0;
    } else if (x > 0)
        the_sign_of_x = 1;
    else
        the_sign_of_x = -1;


    let one_plus_axSquared = 1 + ERF_A * x * x,
        four_ovr_pi_etc = 4 / Math.PI + ERF_A * x * x,
        ratio = four_ovr_pi_etc / one_plus_axSquared;

    ratio *= x * -x;

    let expRatio = Math.exp(ratio),
        radical = Math.sqrt(1 - expRatio);

    return radical * the_sign_of_x;

}

/**
 *
 * @param x
 * @param gauss
 * @returns {number}
 */

function cdf(x, gauss) {
    return 0.5 * (1 + erf((x - gauss.mu) / (Math.sqrt(2 * gauss.sigma))));
}

/**
 *
 * @param gauss (a: min x, b: max x, mu: location parameter, sigma: scale parameter
 * @param x
 * @returns {number} evaluated pdf
 */

function pdf(x, gauss) {
    if (x < gauss.a || x > gauss.b)
        return 0;

    let s2 = Math.pow(gauss.sigma, 2),
        A = 1 / (Math.sqrt(2 * s2 * Math.PI)),
        B = -1 / (2 * s2),
        //C = cdf((gauss.b - gauss.mu) / gauss.sigma, gauss.mu, gauss.sigma) - cdf((gauss.a - gauss.mu) / gauss.sigma, gauss.mu, gauss.sigma);
        C = cdf((gauss.b - gauss.mu) / gauss.sigma, gauss) - cdf((gauss.a - gauss.mu) / gauss.sigma, gauss);

    return A * Math.exp(B * Math.pow(x - gauss.mu, 2)) / C;
}

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
class Checkpoint extends Point{
    constructor(x, y, angle, dist) {
        super(x, y);
        this.pos = {
            x: this.x,
            y: this.y
        };
        this.radius = 600;
        this.angle = angle;
        this.distance = dist;
    }
}
class Pod {
    constructor(position, lastPosition, target) {
        this.position = position;
        this.lastPosition = lastPosition;
        this.target = target;
        this.radius = 400;
        this.shield = false;
        this.shieldTimer = 0;
    }
    pos () {
        return new Vector(this.position.x, this.position.y);
    }
    targetPos () {
        return new Vector(this.target.x, this.target.y);
    }
    velocity () {
        let baseV = baseVector(this.lastPosition, this.position);
        console.error(`velocity: ${this.position.x} ${this.position.y}`);
        return new Vector(baseV.x, baseV.y);
    }
    lastVelocity () {

        let returnValue;
        tempVelocity.push(this.velocity());

        //console.error(`velocity: ${this.velocity().x} ${this.velocity().y}`);
        //console.error(`tempVelLength: ${tempVelocity.length}`);

        if (tempVelocity.length === 1)
            returnValue = tempVelocity[0];
        else {
            returnValue = tempVelocity[0];
            tempVelocity = tempVelocity.slice(1);
        }
        //console.error(`lastVelocity: ${returnValue.x} ${returnValue.y}`);
        return returnValue;
    }
    seekDesiredVelocity () {
        let returnValue = this.targetPos().subtract(this.pos()).normalisedVector().multiply(maxVelocity);
        console.error(`desiredVelocity: ${returnValue.x} ${returnValue.y}`);
        return returnValue;
    }
    fleeDesiredVelocity () {
        return this.seekDesiredVelocity().multiply(-1);
    }
    seekSteeringForce () {
        return this.shield ? this.seekDesiredVelocity().subtract(this.velocity()).divide(10) : this.seekDesiredVelocity().subtract(this.velocity());
    }
    fleeSteeringForce () {
        return this.shield ? this.fleeDesiredVelocity().subtract(this.velocity()).divide(10) : this.fleeDesiredVelocity().subtract(this.velocity());
    }
    calculatedSeekVelocity () {

        console.error(`steeringForce: ${this.seekSteeringForce().x} ${this.seekSteeringForce().y}`);

        let velocity = this.velocity().add(this.seekSteeringForce()),
            velocityMagnitude = velocity.magnitude();

        console.error(`velocity: ${velocity.x} ${velocity.y} magnitude: ${velocity.magnitude()}`);

        if (velocityMagnitude > maxVelocity)
            velocity = velocity.normalisedVector().multiply(maxVelocity);

        return velocity;
    }
    calculatedFleeVelocity () {

        console.error(`flee steeringForce: ${this.fleeSteeringForce().x} ${this.fleeSteeringForce().y}`);

        let velocity = this.velocity().add(this.fleeSteeringForce()),
            velocityMagnitude = velocity.magnitude();

        console.error(`velocity: ${velocity.x} ${velocity.y} magnitude: ${velocity.magnitude()}`);

        if (velocityMagnitude > maxVelocity)
            velocity = velocity.normalisedVector().multiply(maxVelocity);

        return velocity;
    }
    arrivalForce () {
        let velocity = this.velocity() + this.fleeSteeringForce().normalisedVector().multiply(maxVelocity),
            position = this.pos().add(velocity);

        function truncate (vector, max) {

            let i = max / vector.magnitude();

            i = i < 1 ? i : 1;
            vector.multiply(i);
        }
    }

    nextPos () {
        return this.pos().add(this.calculatedSeekVelocity());
    }
    activateShield (boolean) {
        this.shield = boolean;
        if (boolean)
            this.shieldTimer = 3;
    }
    decrementShieldTimer () {
        this.shieldTimer--;
        if (this.shieldTimer === 0)
            this.shield = false;
    }

}
let tempVelocity = [],
    myLastPos,
    opponentLastPos,
    myTempPosition = [],
    opponentTempPosition = [],
    checkpoints = [],
    mapReady = false,
    boostAvailable = true,
    firstRound = true,
    log = {},
    checkpointIndex,
    nextCheckPointIndex,
    targetPoint,
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
    countSpeed = (position, target) => {

        let myPosition = new Point(position.x, position.y),
            speed = myPosition.dist(target);

        return Math.round(speed);

    },
    gaussValue = (value, gauss) => pdf(value, gauss),
    gaussConst = {
        far: 100 / gaussValue(0, gauss.far),
        break: 100 / gaussValue(gauss.break.a, gauss.break),
        targetRadius: targetRadius / gaussValue(0, gauss.targetRadius)
    },
    setThrust = (speed, dist, angle) => {

        let returnValue;

        if (dist >= breakDist || (Math.abs(angle) > 3)) {
            returnValue = gaussValue(angle, gauss.far) * gaussConst.far;
            console.error(`gaussValue far: ${returnValue}`);
        } else {
            returnValue = gaussValue(speed, gauss.break);
            console.error(`gaussValue break: ${returnValue}`);
        }
        return Math.round(returnValue);
    },
    adjustThrust = (speed, dist, angle) => {
        // If angle is too wide
        if (Math.abs(angle) >= disabledAngle)
            return 0;
        else {
            if (dist > boostDist && boostAvailable && angle === 0 && mapReady) {
                boostAvailable = false;
                return 'BOOST';
            } else
                return setThrust(speed, dist, angle);
        }
    },
    calculateGoal = (myPos, targetPos, angle) => {

        let //m = targetPos.x - myPos.x === 0 ? 1000 : (targetPos.y - myPos.y) / (targetPos.x - myPos.x),
            m = (targetPos.y - myPos.y) / (targetPos.x - myPos.x),
            b = targetPos.y - m * targetPos.x,
            targetR = gaussValue(angle, gauss.targetRadius) * gaussConst.targetRadius,
            // Calculate the two interference points
            x1 = (targetPos.x + targetR / Math.sqrt(1 + m * m)),
            x2 = (targetPos.x - targetR / Math.sqrt(1 + m * m)),
            point1 = {
                x: Math.round(x1),
                y: Math.round(m * x1 + b)
            },
            point2 = {
                x: Math.round(x2),
                y: Math.round(m * x2 + b)
            },
            myPosition = new Point(myPos.x, myPos.y);

        if (myPosition.distSquare(point1) < myPosition.distSquare(point2))
            return new Checkpoint(point1.x, point1.y);

        return new Checkpoint(point2.x, point2.y);
    },
    checkCollision = (threshold, myPod, opponentPod) => {

        let drag = 0.85,
            myPredictedPosition = myPod.nextPos(),
            opponentPredictedForce = opponentPod.velocity().multiply(1 / drag).subtract(opponentPod.lastVelocity()),
            opponentPredictedVelocity = opponentPod.velocity().add(opponentPredictedForce),
            opponentPredictedPosition = opponentPod.pos().add(opponentPredictedVelocity),
            myPoint = new Point(myPredictedPosition.x, myPredictedPosition.y),
            opponentPoint = new Point(opponentPredictedPosition.x, opponentPredictedPosition.y),
            realMyPoint = new Point(myPod.pos().x, myPod.pos().y),
            realOpponentPoint = new Point(opponentPod.pos().x, opponentPod.pos().y);

        //console.error(`OPRF: ${opponentPod.velocity().multiply(1 / drag).x} ${opponentPod.velocity().multiply(1 / drag).y}`);

        //console.error(`points: ${myPoint.x} ${myPoint.y} ${opponentPoint.x} ${opponentPoint.y}`);

        console.error(`OpponentDist -> counted: ${Math.round(myPoint.dist(opponentPoint))} real: ${Math.round(realMyPoint.dist(realOpponentPoint))}`);

        return myPoint.dist(opponentPoint) < collisionDistToOpp && opponentPredictedVelocity.subtract(myPod.velocity()).magnitude() > threshold;
    };


while (true) {

    let myData = readline().split(' '),
        nextCheckpoint = {
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
        },
        checkpoint = new Checkpoint(nextCheckpoint.pos.x, nextCheckpoint.pos.y, nextCheckpoint.angle, nextCheckpoint.dist);


    if (firstRound) {
        myTempPosition.push(myPos);
        opponentTempPosition.push(opponentPos);
        firstRound = false;
    }

    let myPod,
        opponentPod,
        lastPos;

    lastPos = lastPosition(myPos, myTempPosition);
    myLastPos = lastPos.lastPos;
    myTempPosition = lastPos.tempVariable;

    lastPos = lastPosition(opponentPos, opponentTempPosition);
    opponentLastPos = lastPos.lastPos;
    opponentTempPosition = lastPos.tempVariable;


    let mySpeed = countSpeed(myLastPos, myPos),
        opponentSpeed = countSpeed(opponentLastPos, opponentPos),
        collisionDetected = false,
        thrust;

    if (mapReady) {
        checkpointIndex = findCoords(checkpoint.pos);
        nextCheckPointIndex = checkpointIndex + 1 === checkpoints.length ? 0 : checkpointIndex + 1;
        targetPoint = calculateGoal(checkpoints[nextCheckPointIndex], checkpoint.pos, checkpoint.angle);
        myPod = new Pod(myPos, myLastPos, targetPoint);
        opponentPod = new Pod(opponentPos, opponentLastPos, checkpoint.pos);
    } else {
        checkpointIndex = fillMap(checkpoint.pos);
        targetPoint = calculateGoal(myPos, checkpoint.pos, checkpoint.angle);
        myPod = new Pod(myPos, myLastPos, targetPoint);
        opponentPod = new Pod(opponentPos, opponentLastPos, checkpoint.pos);
    }

    if (!myPod.activeShield || myPod.shieldTimer === 0)
        myPod.activateShield(checkCollision(collisionThreshold, myPod, opponentPod));
    else
        myPod.decrementShieldTimer();

    console.error(`calculatedVelocity: ${myPod.calculatedVelocity().x} ${myPod.calculatedVelocity().y} magnitude: ${myPod.calculatedVelocity().magnitude()}`);

    thrust = myPod.shield ? 'SHIELD' : adjustThrust(mySpeed, checkpoint.distance, checkpoint.angle);

    if (myPod.shield)
        myPod.decrementShieldTimer();

    log.basic = `nextCP_dist: ${checkpoint.distance} nextCP_angle: ${checkpoint.angle} thrust: ${thrust} speed: ${mySpeed} collusion: ${myPod.shield}`;
    log.incompleteMap = `mapReady: ${mapReady} mapLength: ${checkpoints.length} x: ${checkpoints[checkpointIndex].x} y: ${checkpoints[checkpointIndex].y} CPIndex: ${checkpointIndex} CPIndexNext: ${nextCheckPointIndex}`;


    console.error(log.basic);
    console.error(log.incompleteMap);

    console.log(`${myPos.x + myPod.calculatedVelocity().x} ${myPos.y + myPod.calculatedVelocity().y} ${thrust} ${thrust}`);

}



