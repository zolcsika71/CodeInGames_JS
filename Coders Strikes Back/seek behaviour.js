"use strict";

/*

A boost is in fact an acceleration of 650.

How exactly works thrust?
Why max_speed(thrust) is equal to 51 if thrust =10
And for thrust =10+n10
max_speed(thrust) = 51+57n
(checking by hand)
 */

const
    collisionDistToOpp = 800, // pod radius * 2
    collisionThreshold = 500, // opponent velocity - my velocity
    boostDist = 6000, // Minimum distance for activating boost
    targetRadius = 350, // Distance starting from the middle of the checkpoint for the racer to aim for
    maxVelocity = 10,
    maxThrust = 100,
    breakDist = 1200,
    //disabledAngle = 45 + 18,
    disabledAngle = 90 - 18,
    p = 0.03,
    i = 0,
    d = 0.02,
    gauss = {
        far: { // x: angle
            a: -90, // min x
            b: 90, // max x
            mu: 0, // location parameter
            sigma: 30 // scale parameter
        },
        break: { // x: speed
            a: 0, // min x
            b: 600, // max x
            mu: 0, // location parameter
            sigma: 100 // scale parameter
        },
        targetRadius: { // x: targetRadius
            a: -90, // min x
            b: 90, // max x
            mu: 0, // location parameter
            sigma: 20 // scale parameter
        }
    };

function baseVector(point1, point2) {
    return {
        x: point2.x - point1.x,
        y: point2.y - point1.y
    };
}
function nextIndex(index, array) {
    return index + 1 === array.length ? 0 : index + 1;
}
function lastIndex(index, array) {
    return index - 1 < 0 ? array.length : index - 1;

}
function toDegrees (radians) {
    return radians * (180 / Math.PI);
}
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
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

class LIFO {

    constructor() {
        this.itemArray = [];
    }

    addItem (item) {
        this.itemArray.push(item);
    }

    lastItem () {
        let returnValue;
        if (this.itemArray.length === 1)
            returnValue = this.itemArray[0];
        else {
            returnValue = this.itemArray[0];
            this.itemArray = this.itemArray.slice(1);
        }
        return returnValue;
    }
}
class PID {
    constructor (p, i, d) {
        this.p = p;
        this.i = i;
        this.d = d;
        this.min = -100;
        this.max = 100;
        this.target = 0;
        this.errorSum = 0;
        this.output = 0;
        this.lastInput = 0;
    }
    compute (input) {
        let error = this.target - input,
            inputDiff = input - this.lastInput;

        this.errorSum = Math.max(this.min, Math.min(this.max, this.errorSum + (this.i * error)));
        this.output = Math.max(this.min, Math.min(this.max, (this.p * error) + this.errorSum - (this.d * inputDiff)));
        this.lastInput = input;

        return this.output;

    }
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
    truncate(max) {
        let i = max / this.magnitude(),
            velocity;
        i = i < 1 ? i : 1;
        velocity = this.multiply(i);

        return velocity;
    }
    dot (vector) {
        return this.x * vector.x + this.y * vector.y;
    }
    angleTo (vector) {
        let dot = this.dot(vector),
            m1 = this.magnitude(),
            m2 = vector.magnitude(),
            angleRadian = dot === 0 ? 0 : Math.acos(dot / (m1 * m2));

        //console.error(`stuff: ${dot} ${m1} ${m2}`);

        return Math.round(toDegrees(angleRadian));
    }
    rotate(angle) {
        let radian = toRadians(angle),
            sinAngle = Math.sin(radian),
            cosAngle = Math.cos(radian);
        return new Vector(this.x * cosAngle - this.y * sinAngle, this.y * cosAngle + this.x * sinAngle);
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
class Checkpoint extends Point {
    constructor(x, y, angle, dist) {
        super(x, y);
        this.pos = {
            x: this.x,
            y: this.y
        };
        this.radius = 600;
        this.angle = angle;
        this.distance = dist;
        this.farest = false;
        this.distanceFromPrevCheckPoint = 0;
    }
}
class Map {
    constructor() {
        this.checkpoints = [];
        this.lap = 0;
        this.blockCounting = false;
        this.mapReady = false;
    }
    getLap (checkpoint) {

        if (!this.mapReady)
            return 0;

        if (this.blockCounting && this.findIndex(checkpoint) !== 0)
            this.blockCounting = false;
        else if (this.findIndex(checkpoint) === 0 && !this.blockCounting) {
            this.lap++;
            this.blockCounting = true;
        }
        return this.lap;
    }
    findIndex (checkpoint) {
        return this.checkpoints.findIndex(i => i.x === checkpoint.x && i.y === checkpoint.y);
    }
    addCheckpoint (checkpoint) {

        if (this.mapReady)
            return;

        let index = this.findIndex(checkpoint),
            checkpointsLength = this.checkpoints.length;

        if (index === -1) {

            if (checkpointsLength === 0) {
                checkpoint.distanceFromPrevCheckPoint = checkpoint.distance;
                checkpoint.farest = true;
                this.checkpoints.push(checkpoint);
            } else {

                let lastCheckpointIndex = lastIndex(checkpointsLength, this.checkpoints);

                checkpoint.distanceFromPrevCheckPoint = this.checkpoints[lastCheckpointIndex].dist(checkpoint);

                let maxDist = Math.max.apply(Math, this.checkpoints.map(object => object.distanceFromPrevCheckPoint));

                //console.error(`maxDist: ${maxDist} CPLength: ${checkpointsLength} CPDistFromPrev: ${checkpoint.distanceFromPrevCheckPoint} `);

                if (maxDist < checkpoint.distanceFromPrevCheckPoint) {
                    checkpoint.farest = true;
                    for (let i = 0; i < checkpointsLength; i++)
                        if (this.checkpoints[i].farest)
                            this.checkpoints[i].farest = false;
                }
                this.checkpoints.push(checkpoint);
            }

        } else if (index !== checkpointsLength - 1 && !this.mapReady)
            this.mapReady = true;
    }
}
class Pod {
    constructor() {
        this.radius = 400;
        this.shield = false;
        this.shieldTimer = 0;
    }
    setPod (position, lastPosition, target) {
        this.position = position;
        this.lastPosition = lastPosition;
        this.target = target;
    }
    pos () {
        return new Vector(this.position.x, this.position.y);
    }
    targetPos () {
        return new Vector(this.target.x, this.target.y);
    }
    velocity () {
        let baseV = baseVector(this.lastPosition, this.position);
        return new Vector(baseV.x, baseV.y);
    }
    seekDesiredVelocity () {
        return this.targetPos().subtract(this.pos());
    }
    seekSteeringForce () {
        return this.shield ? this.seekDesiredVelocity().subtract(this.velocity()).divide(10) : this.seekDesiredVelocity().subtract(this.velocity());
    }
    calculatedSeekVelocity () {
        //return this.velocity().add(this.seekSteeringForce()).normalisedVector().multiply(maxVelocity);
        //return this.velocity().add(this.seekSteeringForce()).truncate(maxVelocity);
        return this.velocity().add(this.seekSteeringForce());
    }
    acceleration () {
        return this.seekSteeringForce().truncate(this.velocity().magnitude());
    }
    nextSeekPos () {
        let velocity = this.velocity().add(this.acceleration()).multiply(0.85);
        //console.error(`velocity -> x: ${velocity.x} y: ${velocity.y}`);
        return this.pos().add(velocity);

    }
    fleeDesiredVelocity () {
        return this.seekDesiredVelocity().multiply(-1);
    }
    fleeSteeringForce () {
        return this.shield ? this.fleeDesiredVelocity().subtract(this.velocity()).divide(10) : this.fleeDesiredVelocity().subtract(this.velocity());
    }
    calculatedFleeVelocity () {

        //console.error(`FLEE steeringForce: ${this.fleeSteeringForce().x} ${this.fleeSteeringForce().y}`);

        let velocity = this.velocity().add(this.fleeSteeringForce()).truncate(maxVelocity);
        //console.error(`FLEE velocity: ${velocity.x} ${velocity.y} magnitude: ${velocity.magnitude()}`);

        //if (velocityMagnitude > maxVelocity)
        //    velocity = velocity.truncate(maxVelocity);

        return velocity;
    }
    nextFleePos () {
        return this.pos().add(this.calculatedFleeVelocity());
    }
    arrivalVelocity () {
        let velocity = this.velocity().add(this.calculatedFleeVelocity()),
            position = this.nextFleePos(),
            desiredVelocity = this.targetPos().subtract(position),
            distance = desiredVelocity.magnitude();

        if (distance < breakDist)
            desiredVelocity = desiredVelocity.normalisedVector().multiply(maxThrust).multiply(distance / breakDist);
        else
            desiredVelocity = desiredVelocity.normalisedVector().multiply(maxThrust);

        return desiredVelocity.subtract(velocity);

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
let maxSpeed = 0,
    boostIndex,
    myLastPosClass = new LIFO(),
    opponentLastPosClass = new LIFO(),
    myLastVelocityClass = new LIFO(),
    opponentLastVelocityClass = new LIFO(),
    lastNextCPDistClass = new LIFO(),
    pid = new PID(p, i, d),
    map = new Map(),
    myLastPos,
    opponentLastPos,
    myLastVelocity,
    opponentLastVelocity,
    lastNextCPDist,
    boostAvailable = true,
    log = {},
    checkpointIndex,
    nextCheckPointIndex,
    lastCheckPointIndex,
    targetPoint,
    myPod = new Pod(),
    opponentPod = new Pod(),
    findCoords = checkpoint => map.findIndex(checkpoint),
    fillMap = checkpoint => map.addCheckpoint(checkpoint),
    gaussValue = (value, gauss) => pdf(value, gauss),
    gaussConst = {
        far: maxThrust / gaussValue(0, gauss.far),
        break: maxThrust / gaussValue(gauss.break.a, gauss.break),
        targetRadius: targetRadius / gaussValue(0, gauss.targetRadius)
    },
    setThrust = (flee, mySpeed, myLastSpeed, dist, angle) => {

        let returnValue;

        //if (dist >= breakDist || (Math.abs(angle) > 3)) {
        if (dist > breakDist) {
            returnValue = gaussValue(angle, gauss.far) * gaussConst.far;
            console.error(`speed far: ${returnValue} angle: ${angle}`);
        } else if (flee) {
            returnValue = gaussValue(angle, gauss.break) * gaussConst.break;
            console.error(`speed flee: ${returnValue} angle: ${angle}`);
        } else {
            //returnValue = myPod.arrivalVelocity().truncate(maxThrust).magnitude();
            returnValue = pid.compute(dist) * -1;
            console.error(`speed break: ${returnValue} angle: ${angle}`);
        }
        return Math.round(returnValue);
    },
    adjustThrust = (boostTarget, flee, mySpeed, myLastSpeed, dist, angle) => {
        // If angle is too wide
        if (Math.abs(angle) >= disabledAngle) {
            console.error(`speed angle: 0`);
            return 5;
        } else {
            if (boostTarget && boostAvailable && Math.abs(angle) <= 3 && map.mapReady) {
                //console.error(`angle: ${angle}`);
                boostAvailable = false;
                return 'BOOST';
            } else
                return setThrust(flee, mySpeed, myLastSpeed, dist, angle);
        }
    },
    calculateGoal = (angle, myPos, targetPos) => {

        let //m = targetPos.x - myPos.x === 0 ? 1000 : (targetPos.y - myPos.y) / (targetPos.x - myPos.x),
            m = (targetPos.y - myPos.y) / (targetPos.x - myPos.x),
            b = targetPos.y - m * targetPos.x,
            targetR = gaussValue(angle, gauss.targetRadius) * gaussConst.targetRadius,
            //targetR = targetRadius,
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
            return new Point(point1.x, point1.y);

        return new Point(point2.x, point2.y);
    },
    calculateGoalInDirection = (checkpoint, myPod) => {

        if (Math.abs(checkpoint.angle) !== 0) {
            let desiredDirection = myPod.seekDesiredVelocity(),
                currentDirection = desiredDirection.rotate(checkpoint.angle * -1),
                steeringDirection = desiredDirection.subtract(currentDirection).normalisedVector().multiply(maxThrust);

            console.error(`currentDir: ${steeringDirection.x} ${steeringDirection.y}`);

            return new Point(checkpoint.x + steeringDirection.x, checkpoint.y + steeringDirection.y)

        } else
            return checkpoint;
    },
    countSpeed = (position, target) => {

        let myPosition = new Point(position.x, position.y),
            speed = myPosition.dist(target);

        return Math.round(speed);

    },
    checkCollision = (threshold, myPod, opponentPod) => {

        let drag = 0.85,
            myPredictedPosition = myPod.pos().add(myPod.velocity()),
            //myPredictedPosition = myPod.nextSeekPos();
            opponentPredictedForce = opponentPod.velocity().multiply(1 / drag).subtract(opponentLastVelocity),
            opponentPredictedVelocity = opponentPod.velocity().add(opponentPredictedForce),
            opponentPredictedPosition = opponentPod.pos().add(opponentPredictedVelocity),
            //opponentPredictedPosition = opponentPod.nextSeekPos(),
            myPoint = new Point(myPredictedPosition.x, myPredictedPosition.y),
            opponentPoint = new Point(opponentPredictedPosition.x, opponentPredictedPosition.y),
            realMyPoint = new Point(myPod.pos().x, myPod.pos().y),
            realOpponentPoint = new Point(opponentPod.pos().x, opponentPod.pos().y);

        //console.error(`OPRF: ${opponentPod.velocity().multiply(1 / drag).x} ${opponentPod.velocity().multiply(1 / drag).y}`);

        //console.error(`points: ${myPoint.x} ${myPoint.y} ${opponentPoint.x} ${opponentPoint.y}`);
        let velocityDiff = Math.round(opponentPredictedVelocity.subtract(myPod.velocity()).magnitude());
        console.error(`OpponentDist -> counted: ${Math.round(myPoint.dist(opponentPoint))} real: ${Math.round(realMyPoint.dist(realOpponentPoint))} velocityDiff: ${velocityDiff}`);
        return myPoint.dist(opponentPoint) < collisionDistToOpp && velocityDiff > threshold;
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

    map.addCheckpoint(checkpoint);

    myLastPosClass.addItem(myPos);
    opponentLastPosClass.addItem(opponentPos);
    lastNextCPDistClass.addItem(checkpoint.distance);
    myLastPos = myLastPosClass.lastItem();
    opponentLastPos = opponentLastPosClass.lastItem();
    lastNextCPDist = lastNextCPDistClass.lastItem();


    let flee = checkpoint.distance > lastNextCPDist && checkpoint.distance < breakDist,
        xOffset,
        yOffset,
        mySpeed,
        myLastSpeed,
        thrust;

    if (map.mapReady) {
        checkpointIndex = map.findIndex(checkpoint);
        nextCheckPointIndex = nextIndex(checkpointIndex, map.checkpoints);
        lastCheckPointIndex = lastIndex(checkpointIndex, map.checkpoints);
        //nextCheckPointIndex = checkpointIndex + 1 === map.checkpoints.length ? 0 : checkpointIndex + 1;
        //lastCheckPointIndex = checkpointIndex - 1 < 0 ? map.checkpoints.length : checkpointIndex - 1;
        targetPoint = calculateGoal(checkpoint.angle, map.checkpoints[nextCheckPointIndex], checkpoint.pos);
        myPod.setPod(myPos, myLastPos, targetPoint);
        //targetPoint = calculateGoalInDirection(checkpoint, myPod);
        //myPod.setPod(myPos, myLastPos, targetPoint);
        //console.error(`velocity: x: ${myPod.velocity().x} y: ${myPod.velocity().y} magnitude: ${Math.round(myPod.velocity().magnitude())}`);
        console.error(`seekDesiredVelocity: x: ${myPod.seekDesiredVelocity().x} y: ${myPod.seekDesiredVelocity().y} magnitude: ${Math.round(myPod.seekDesiredVelocity().magnitude())}`);
        //console.error(`seekSteeringForce: x: ${myPod.seekSteeringForce().x} y: ${myPod.seekSteeringForce().y} magnitude: ${Math.round(myPod.seekSteeringForce().magnitude())}`);
        //console.error(`calculatedSeekVelocity: x: ${myPod.calculatedSeekVelocity().x} y: ${myPod.calculatedSeekVelocity().y} magnitude: ${Math.round(myPod.calculatedSeekVelocity().magnitude())}`);
        //console.error(`acceleration: ${Math.round(myPod.acceleration().magnitude())}`);
        opponentPod.setPod(opponentPos, opponentLastPos, checkpoint.pos);
    } else {
        checkpointIndex =  map.findIndex(checkpoint);
        targetPoint = calculateGoal(checkpoint.angle, myPos, checkpoint.pos);
        myPod.setPod(myPos, myLastPos, targetPoint);
        //targetPoint = calculateGoalInDirection(checkpoint, myPod);
        //myPod.setPod(myPos, myLastPos, targetPoint);
        //console.error(`velocity: x: ${myPod.velocity().x} y: ${myPod.velocity().y} magnitude: ${Math.round(myPod.velocity().magnitude())}`);
        console.error(`seekDesiredVelocity: x: ${myPod.seekDesiredVelocity().x} y: ${myPod.seekDesiredVelocity().y} magnitude: ${Math.round(myPod.seekDesiredVelocity().magnitude())}`);
        //console.error(`seekSteeringForce: x: ${myPod.seekSteeringForce().x} y: ${myPod.seekSteeringForce().y} magnitude: ${Math.round(myPod.seekSteeringForce().magnitude())}`);
        //console.error(`calculatedSeekVelocity: x: ${myPod.calculatedSeekVelocity().x} y: ${myPod.calculatedSeekVelocity().y} magnitude: ${Math.round(myPod.calculatedSeekVelocity().magnitude())}`);
        //console.error(`acceleration: ${Math.round(myPod.acceleration().magnitude())}`);
        opponentPod.setPod(opponentPos, opponentLastPos, checkpoint.pos);
    }

    myLastVelocityClass.addItem(myPod.velocity());
    opponentLastVelocityClass.addItem(opponentPod.velocity());
    myLastVelocity = myLastVelocityClass.lastItem();
    opponentLastVelocity = opponentLastVelocityClass.lastItem();

    //checkpoint.angle = myPod.velocity().angleTo(myPod.seekDesiredVelocity());

    mySpeed = countSpeed(myLastPos, myPos);
    myLastSpeed = Math.round(myLastVelocity.magnitude());

    if (mySpeed > maxSpeed)
        maxSpeed = mySpeed;

    if (myPod.shield) {
        myPod.decrementShieldTimer();
        console.error(`shieldTimer: ${myPod.shieldTimer}`)
    }else
        myPod.activateShield(checkCollision(collisionThreshold, myPod, opponentPod));

    let boostTarget = map.mapReady ? map.checkpoints[checkpointIndex].farest : false;

    thrust = myPod.shield ? 'SHIELD' : adjustThrust(boostTarget, flee, mySpeed, myLastSpeed, checkpoint.distance, checkpoint.angle);

    if (mySpeed > maxSpeed && thrust !== 'BOOST')
        maxSpeed = mySpeed;

    if (map.mapReady && !lastCheckPointIndex)
        lastCheckPointIndex = 0;
    /*
        if (mapReady && checkpoints[lastCheckPointIndex].dist(myPos) <= breakDist) {
            console.error(`mapReady`);
            xOffset = myPod.calculatedFleeVelocity().x;
            yOffset = myPod.calculatedFleeVelocity().y;
            magnitude = myPod.calculatedFleeVelocity().magnitude();
        } else if (checkpoint.distance > breakDist) {
            console.error(`checkPoint dist FAR: ${checkpoint.distance}`);
            xOffset = myPod.calculatedSeekVelocity().x;
            yOffset = myPod.calculatedSeekVelocity().y;
            magnitude = myPod.calculatedSeekVelocity().magnitude();
        } else if (checkpoint.distance <= breakDist) {
            console.error(`checkPoint dist close: ${checkpoint.distance}`);
            xOffset = myPod.calculatedFleeVelocity().x;
            yOffset = myPod.calculatedFleeVelocity().y;
            magnitude = myPod.calculatedFleeVelocity().magnitude();
        }
    */

    let steeringForce = myPod.seekSteeringForce().truncate(10);

    xOffset = Math.round(steeringForce.x);
    yOffset = Math.round(steeringForce.y);

    log.basic = `nextCP_dist: ${checkpoint.distance} nextCP_angle: ${checkpoint.angle} thrust: ${thrust} speed: ${mySpeed} acceleration: ${Math.round(myPod.acceleration().magnitude())} collusion: ${myPod.shield} farest: ${boostTarget}`;
    log.incompleteMap = `mapReady: ${map.mapReady} mapLength: ${map.checkpoints.length} CPIndexLast ${lastCheckPointIndex} CPIndex: ${checkpointIndex} CPIndexNext: ${nextCheckPointIndex} lap: ${map.getLap(map.checkpoints[checkpointIndex])}`;
    log.offset = `x: ${xOffset} y: ${yOffset}`;
    log.speed = `speed: ${mySpeed} lastSpeed: ${myLastSpeed}`;
    log.pos = `myPos -> x: ${myPos.x} y: ${myPos.y} nextPos -> x: ${Math.round(myPod.nextSeekPos().x)} y: ${Math.round(myPod.nextSeekPos().y)} `;

    console.error(log.offset);
    console.error(log.basic);
    //console.error(log.incompleteMap);
    //console.error(log.speed);
    console.error(log.pos);
    console.error(maxSpeed);



    console.log(`${Math.round(myPos.x + xOffset)} ${Math.round(myPos.y + yOffset)} ${thrust} ${thrust}`);

}


