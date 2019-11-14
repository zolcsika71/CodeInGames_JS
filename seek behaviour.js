"use strict";

const
    collisionDistToOpp = 800, // pod radius * 2
    collisionThreshold = 500, // opponent velocity - my velocity
    boostDist = 3000, // Minimum distance for activating boost
    targetRadius = 350, // Distance starting from the middle of the checkpoint for the racer to aim for
    maxVelocity = 10,
    maxThrust = 100,
    breakDist = 1300,
    //disabledAngle = 45 + 18,
    disabledAngle = 90,

    gauss = {
        far: { // x: angle
            a: -90, // min x
            b: 90, // max x
            mu: 0, // location parameter
            sigma: 1000 // scale parameter
        },
        break: { // x: speed
            a: 0, // min x
            b: 600, // max x
            mu: 0, // location parameter
            sigma: 1000 // scale parameter
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
        //console.error(`velocity: ${baseV.x} ${baseV.y}`);
        return new Vector(baseV.x, baseV.y);
    }
    seekDesiredVelocity () {
        //console.error(`desiredVelocity: ${returnValue.x} ${returnValue.y}`);
        //return this.targetPos().subtract(this.pos()).normalisedVector().multiply(maxVelocity);
        return this.targetPos().subtract(this.pos());
    }
    seekSteeringForce () {
        return this.shield ? this.seekDesiredVelocity().subtract(this.velocity()).divide(10) : this.seekDesiredVelocity().subtract(this.velocity());
    }
    calculatedSeekVelocity () {

        //console.error(`SEEK steeringForce: ${this.seekSteeringForce().x} ${this.seekSteeringForce().y}`);

        //let velocity = this.velocity().add(this.seekSteeringForce()).truncate(maxVelocity);
        let velocity = this.velocity().add(this.seekSteeringForce());


        //velocity.x = velocity.x < 0 ? Math.floor(velocity.x) : Math.ceil(velocity.x);
        //velocity.y = velocity.y < 0 ? Math.floor(velocity.y) : Math.ceil(velocity.y);

        return velocity;
    }
    nextSeekPos () {
        return this.pos().add(this.calculatedSeekVelocity().truncate(this.velocity().magnitude()));
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
let myLastPosClass = new LIFO(),
    opponentLastPosClass = new LIFO(),
    myLastVelocityClass = new LIFO(),
    opponentLastVelocityClass = new LIFO(),
    myLastPos,
    opponentLastPos,
    myLastVelocity,
    opponentLastVelocity,
    checkpoints = [],
    mapReady = false,
    boostAvailable = true,
    log = {},
    checkpointIndex,
    nextCheckPointIndex,
    lastCheckPointIndex,
    targetPoint,
    myPod = new Pod(),
    opponentPod = new Pod(),
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
        far: maxThrust / gaussValue(0, gauss.far),
        break: maxThrust / gaussValue(gauss.break.a, gauss.break),
        targetRadius: targetRadius / gaussValue(0, gauss.targetRadius)
    },
    setThrust = (speed, dist, angle) => {

        let returnValue;

        //if (dist >= breakDist || (Math.abs(angle) > 3)) {
        if (dist >= breakDist) {
            returnValue = gaussValue(angle, gauss.far) * gaussConst.far;
            console.error(`speed far: ${returnValue}`);
        } else {
            returnValue = gaussValue(speed, gauss.break) * gaussConst.break;
            //returnValue = myPod.arrivalVelocity().truncate(maxThrust).magnitude();
            console.error(`speed break: ${returnValue}`);
        }
        return Math.round(returnValue);
    },
    adjustThrust = (speed, dist, angle) => {
        // If angle is too wide
        if (Math.abs(angle) >= disabledAngle) {
            console.error(`speed angle: 0`);
            return 0;
        } else {
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


    myLastPosClass.addItem(myPos);
    opponentLastPosClass.addItem(opponentPos);
    myLastPos = myLastPosClass.lastItem();
    opponentLastPos = opponentLastPosClass.lastItem();

    let xOffset,
        yOffset,
        mySpeed = countSpeed(myLastPos, myPos),
        thrust;

    if (mapReady) {
        checkpointIndex = findCoords(checkpoint.pos);
        nextCheckPointIndex = checkpointIndex + 1 === checkpoints.length ? 0 : checkpointIndex + 1;
        lastCheckPointIndex = checkpointIndex - 1 < 0 ? 0 : checkpointIndex - 1;
        targetPoint = calculateGoal(checkpoints[nextCheckPointIndex], checkpoint.pos, checkpoint.angle);
        myPod.setPod(myPos, myLastPos, targetPoint);
        console.error(`velocity: x: ${myPod.velocity().x} y: ${myPod.velocity().y} magnitude: ${Math.round(myPod.velocity().magnitude())}`);
        console.error(`seekDesiredVelocity: x: ${myPod.seekDesiredVelocity().x} y: ${myPod.seekDesiredVelocity().y} magnitude: ${Math.round(myPod.seekDesiredVelocity().magnitude())}`);
        console.error(`seekSteeringForce: x: ${myPod.seekSteeringForce().x} y: ${myPod.seekSteeringForce().y} magnitude: ${Math.round(myPod.seekSteeringForce().magnitude())}`);
        console.error(`calculatedSeekVelocity: x: ${myPod.calculatedSeekVelocity().x} y: ${myPod.calculatedSeekVelocity().y} magnitude: ${Math.round(myPod.calculatedSeekVelocity().magnitude())}`);
        opponentPod.setPod(opponentPos, opponentLastPos, checkpoint.pos);
    } else {
        checkpointIndex = fillMap(checkpoint.pos);
        targetPoint = calculateGoal(myPos, checkpoint.pos, checkpoint.angle);
        myPod.setPod(myPos, myLastPos, targetPoint);
        console.error(`velocity: x: ${myPod.velocity().x} y: ${myPod.velocity().y} magnitude: ${Math.round(myPod.velocity().magnitude())}`);
        console.error(`seekDesiredVelocity: x: ${myPod.seekDesiredVelocity().x} y: ${myPod.seekDesiredVelocity().y} magnitude: ${Math.round(myPod.seekDesiredVelocity().magnitude())}`);
        console.error(`seekSteeringForce: x: ${myPod.seekSteeringForce().x} y: ${myPod.seekSteeringForce().y} magnitude: ${Math.round(myPod.seekSteeringForce().magnitude())}`);
        console.error(`calculatedSeekVelocity: x: ${myPod.calculatedSeekVelocity().x} y: ${myPod.calculatedSeekVelocity().y} magnitude: ${Math.round(myPod.calculatedSeekVelocity().magnitude())}`);
        opponentPod.setPod(opponentPos, opponentLastPos, checkpoint.pos);
    }

    myLastVelocityClass.addItem(myPod.velocity());
    opponentLastVelocityClass.addItem(opponentPod.velocity());
    myLastVelocity = myLastVelocityClass.lastItem();
    opponentLastVelocity = opponentLastVelocityClass.lastItem();


    if (myPod.shield) {
        myPod.decrementShieldTimer();
        console.error(`shieldTimer: ${myPod.shieldTimer}`)
    }
    else
        myPod.activateShield(checkCollision(collisionThreshold, myPod, opponentPod));

    thrust = myPod.shield ? 'SHIELD' : adjustThrust(mySpeed, checkpoint.distance, checkpoint.angle);

    if (mapReady && !lastCheckPointIndex)
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
    xOffset = Math.round(myPod.calculatedSeekVelocity().x);
    yOffset = Math.round(myPod.calculatedSeekVelocity().y);

    log.basic = `nextCP_dist: ${checkpoint.distance} nextCP_angle: ${checkpoint.angle} thrust: ${thrust} speed: ${mySpeed} collusion: ${myPod.shield}`;
    log.incompleteMap = `mapReady: ${mapReady} mapLength: ${checkpoints.length} CPIndex: ${checkpointIndex} CPIndexNext: ${nextCheckPointIndex} CPIndexLast ${lastCheckPointIndex}`;
    log.offset = `x: ${xOffset} y: ${yOffset}`;
    log.speed = `speed: ${Math.round(myPod.velocity().magnitude())} lastSpeed: ${Math.round(myLastVelocity.magnitude())}`;
    log.pos = `myPos -> x: ${myPos.x} y: ${myPos.y} nextPos -> x: ${myPod.nextSeekPos().x} y: ${myPod.nextSeekPos().y} `;

    console.error(log.offset);
    console.error(log.basic);
    //console.error(log.incompleteMap);
    console.error(log.speed);
    console.error(log.pos);



    console.log(`${Math.round(myPos.x + xOffset)} ${Math.round(myPos.y + yOffset)} ${thrust} ${thrust}`);

}



