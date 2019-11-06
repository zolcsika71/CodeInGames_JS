"use strict";

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
class Collision {
    constructor(unitA, unitB, time) {
        this.unitA = unitA;
        this.uintB = unitB;
        this.time = time;
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
class Unit extends Point {
    constructor (x, y, id, radius, vx, vy) {
        super(x, y);
        this.id = id;
        this.radius = radius;
        this.vx = vx;
        this.vy = vy;
    }
    collision (unit) {

        if (this.vx === unit.vx && this.vy === unit.vy) // Optimisation. Objects with the same speed will never collide
            return null;

        let distanceSquare = this.distSquare(unit), // Square of the distance
            sumRadiusSquare = Math.pow(this.radius + unit.radius, 2); // Sum of the radius squared

        if (distanceSquare < sumRadiusSquare)  // Objects are already touching each other. We have an immediate collision.
            return new Collision(this, unit, 0);

        // We place ourselves in the reference frame of unit. unit is therefore stationary and is at (0,0)
        let x = this.x - unit.x,
            y = this.y - unit.y,
            vx = this.vx - unit.vx,
            vy = this.vy - unit.vy,
            myPoint = new Point(x, y),
            unitPoint = new Point(0, 0),
            closestPoint = unitPoint.closest(myPoint, new Point(x + vx, y + vy)), // We look for the closest point to unit (which is in (0,0)) on the line described by our speed vector
            unitPointDist = unitPoint.distSquare(closestPoint), // Square of the distance between unit and the closest point to unit on the line described by our speed vector
            myPointDist = myPoint.distSquare(closestPoint); // Square of the distance between us and that point

        // If the distance between unit and this line is less than the sum of the radius, there might be a collision
        if (unitPointDist < sumRadiusSquare) {
            let length = Math.sqrt(Math.pow(vx, 2) + Math.pow(vy, 2)), // Our speed on the line
                backDist = Math.sqrt(sumRadiusSquare - unitPointDist);

            // We move along the line to find the point of impact
            closestPoint.x = closestPoint.x - backDist * (vx / length);
            closestPoint.y = closestPoint.y - backDist * (vy / length);

            // If the point is now further away it means we are not going the right way, therefore the collision won't happen
            if (myPoint.distSquare(closestPoint) > myPointDist)
                return null;

            myPointDist = myPoint.dist(closestPoint);

            if (myPointDist > length) // The point of impact is further than what we can travel in one turn
                return null;

            let time = myPointDist / length;

            return new Collision(this, unit, time)
        }
        return null;
    }

}
class Checkpoint extends Unit {
    constructor(x, y) {
        super(x, y);
        this.radius = 600;
    }
}
class Pod extends Unit {
    constructor(x, y, id, radius, vx, vy, angle, shield) {
        super(x, y, id, radius, vx, vy);
        this.angle = angle;
        this.checkPointId = 0;
        this.checked = 0;
        this.timeout = 100;
        //this.podPartner = podPartner;
        this.shield = shield;
    }
    bounceWithCheckpoint () {
        this.checkPointId++;
        this.timeout = 100;
    }
    bounce (unit) {

        function applyImpactVector(fx, fy, myMass, unitMass) {
            this.vx -= fx / myMass;
            this.vy -= fy / myMass;
            unit.vx += fx / unitMass;
            unit.vy += fy / unitMass;

        }

        // If a pod has its shield active its mass is 10 otherwise it's 1
        let myMass = this.shield ? 10 : 1,
            unitMass = unit.shield ? 10 : 1,
            massCoefficient = (myMass + unitMass) / (myMass * unitMass),
            nx = this.x - unit.x,
            ny = this.y - unit.y,
            nxNySquare = Math.pow(nx, 2) + Math.pow(ny, 2),
            dvx = this.vx - unit.vx,
            dvy = this.vy - unit.vy,
            impactVector = nx * dvx + ny * dvy, // fx and fy are the components of the impact vector. impactVector is just there for optimisation purposes
            fx = (nx * impactVector) / (nxNySquare * massCoefficient),
            fy = (ny * impactVector) / (nxNySquare * massCoefficient),
            impulse = Math.sqrt(Math.pow(fx, 2) + Math.pow(fy, 2));

        // We apply the impact vector once
        applyImpactVector(fx, fy, myMass, unitMass);

        // If the norm of the impact vector is less than 120, we normalize it to 120
        if (impulse < 120) {
            fx = fx * 120.0 / impulse;
            fy = fy * 120.0 / impulse;
        }

        // We apply the impact vector a second time
        applyImpactVector(fx, fy, myMass, unitMass);

    }
    play (pods, checkpoints) {
        let collisionWithCheckPoint = false,
            time = 0,
            lastCollision = {
            unitA: this.unitA,
            unitB: this.unitB,
            time: this.time
        };

        while (time < 1) {

            let firstCollision = null,
                collision;

            this.checked++;

            for (let i = 0; i < pods.length; i++) {
                for (let j = i + 1; j < pods.length; j++) {

                    collision = pods[i].collision(pods[j]);

                    // If the collision happens earlier than the current one we keep it
                    if (collision !== null && collision.time + time < 1 && (firstCollision === null || collision.time < firstCollision.time))
                        firstCollision = collision;
                }
                // Collision with another checkpoint?
                // It is unnecessary to check all checkpoints here. We only test the pod's next checkpoint.
                // We could look for the collisions of the pod with all the checkpoints, but if such a collision happens it wouldn't impact the game in any way
                collision = pods[i].collision(checkpoints[pods[i].checkPointId]);

                // If the collision happens earlier than the current one we keep it
                if (collision !== null && collision.time + time < 1 && (firstCollision === null || collision.time < firstCollision.time)) {
                    firstCollision = collision;
                    collisionWithCheckPoint = true;
                }
            }

            if (firstCollision === null || collisionWithCheckPoint) {
                // No collision, we can move the pods until the end of the turn
                for (let i = 0; i < pods.length; i++)
                    pods[i].move(1 - time);

                if (collisionWithCheckPoint)
                    this.bounceWithCheckpoint();
                // End of the turn
                time = 1;
            } else {
                if (!(firstCollision.unitA === lastCollision.unitA && firstCollision.unitB === lastCollision.unitB && firstCollision.time === 0)) {
                    // Move the pods to reach the time `t` of the collision
                    for (let i = 0; i < pods.length; ++i)
                        pods[i].move(firstCollision.time);

                    // Play out the collision
                    firstCollision.unitA.bounce(firstCollision.unitB);
                    time += firstCollision.time;
                }
                lastCollision = Object.assign(firstCollision);

            }
        }
        for (let i = 0; i < pods.length; ++i)
            pods[i].end();

    }
    getAngle (point) {
        let dist = this.dist(point),
            dx = (point.x - this.x) / dist,
            dy = (point.y - this.y) / dist,
            angle = Math.acos(dx) * 180 / Math.PI;

        if (dy < 0)
            angle = 360 - angle;
        return angle;
    }
    diffAngle (point) {
        let angle = this.getAngle(point),
            right = this.angle <= angle ? angle - this.angle : 360 - this.angle + angle,
            left = this.angle >= angle ? this.angle - angle : this.angle + 360 - angle;

        if (right < left)
            return right;
        else
            return -left;

    }
    rotate (point) {
        let diffAngle = this.diffAngle(point);
        if (diffAngle > 18)
            diffAngle = 18;
        else if (diffAngle < -18)
            diffAngle = -18;

        this.angle += diffAngle;

        if (this.angle >= 360)
            this.angle = this.angle - 360;
        else if (this.angle < 0)
            this.angle += 360;
    }
    activeShield () {
        this.shield = true;
        this.shieldTimer = 3;
    }
    boost (thrust) {

        if (this.shield && this.shieldTimer > 0) {
            this.shieldTimer--;
            return;
        } else if (this.shield && this.shieldTimer === 0)
            this.shield = false;

        let radiant = this.angle * Math.PI / 180;

        this.vx += Math.cos(radiant) * thrust;
        this.vy += Math.sin(radiant) * thrust;
    }
    move (t) {
        this.x += this.vx * t;
        this.y += this.vy * t;
    }
    end () {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.vx = Math.trunc(this.vx * 0.85);
        this.vy = Math.trunc(this.vy * 0.85);

        // Don't forget that the timeout goes down by 1 each turn. It is reset to 100 when you pass a checkpoint
        this.timeout -= 1;

    }
    run (pods, checkpoints, target, thrust) {
        for (let i = 0; i < pods.length; i++) {
            pods[i].rotate(new Point(target.x, target.y));
            pods[i].boost(thrust);
        }
        this.play(pods, checkpoints)
    }
    score (checkpoints) {
        return this.checked * 50000 - this.dist(checkpoints[this.checkPointId]);
    }
}

const
    collusionDistToOpp = 800, // pod radius * 2
    boostDist = 2000, // Minimum distance for activating boost
    targetRadius = 350, // Distance starting from the middle of the checkpoint for the racer to aim for
    // gauss parameters
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
            sigma: 40 // scale parameter
        },
        targetRadius: { // x: targetRadius
            a: -90, // min x
            b: 90, // max x
            mu: 0, // location parameter
            sigma: 10 // scale parameter
        }
    },
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
    gaussValue = (value, gauss) => pdf(value, gauss),
    gaussConst = {
        far: 100 / gaussValue(0, gauss.far), // x = angle
        break: 100 / gaussValue(gauss.break.a, gauss.break), // x = speed
        targetRadius: targetRadius / gaussValue(0, gauss.targetRadius) // x = angle
    },
    //gaussValue = (gauss, value) => Math.round(gauss.a / Math.pow(Math.E, (Math.pow(value - gauss.b, 2)) / (2 * gauss.c * gauss.c))),
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
    calculateGoal = (startPos, targetPos, angle) => {

        console.error(`startPos.x: ${startPos.x} startPos.y: ${startPos.y} targetPos.x: ${targetPos.x} targetPos.y: ${targetPos.y}`);

        let //m = targetPos.x - myPos.x === 0 ? 1000 : (targetPos.y - myPos.y) / (targetPos.x - myPos.x),
            m = (targetPos.y - startPos.y) / (targetPos.x - startPos.x),
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
            myPosition = new Point(startPos.x, startPos.y),
            dist1 = myPosition.dist(point1),
            dist2 = myPosition.dist(point2),
            baseV,
            vector;

        console.error(`point1.x: ${point1.x} point1.y: ${point1.y} point2.x: ${point2.x} point2.y: ${point2.y} pointDist1: ${Math.round(dist1)} pointDist2: ${Math.round(dist2)}`);
        console.error(`targetRadius: ${targetR}`);

        if (dist1 < dist2)
            baseV = baseVector(startPos, point1);
        else
            baseV = baseVector(startPos, point2);

        vector = new Vector(baseV.x, baseV.y);
        //vector = vector.normalisedVector();

        //return new Point(startPos.x + vector.x, startPos.y + vector.y);

        console.error(`vector.x: ${vector.x} vector.y: ${vector.y}`);

        return {
            x: vector.x,
            y: vector.y
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
        targetPoint = calculateGoal(checkpoints[nextCheckPointIndex], checkpoint.pos, checkpoint.angle);
        targetPoint = new Point(myPos.x + targetPoint.x, myPos.y + targetPoint.y);
    } else {
        checkpointIndex = fillMap(checkpoint.pos);
        targetPoint = calculateGoal(myPos, checkpoint.pos, checkpoint.angle);
        targetPoint = new Point(myPos.x + targetPoint.x, myPos.y + targetPoint.y);
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



