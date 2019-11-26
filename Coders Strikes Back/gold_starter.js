"use strict";

const
    CP = 0,
    POD = 1,
    DEPTH = 6,
    SHIELD_PROB = 10,
    MAX_THRUST = 100,
    E = 0.00001;

let r = -1,
    turn = 0,
    sols_ct = 0,
    is_p2 = false,
    cp_ct,
    laps,
    pods = [],
    cps = [];

function rnd(x, y) {
    return Math.floor((Math.random() * Math.floor(y))) + x;
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
    constructor (x, y, id, type, radius, vx, vy) {
        super(x, y);
        this.id = id;
        this.type = type;
        this.radius = radius;
        this.vx = vx;
        this.vy = vy;
    }
    collisionTime (unit) {

        if (this.vx === unit.vx && this.vy === unit.vy) // Optimisation. Objects with the same speed will never collide
            return -1;

        // We place ourselves in the reference frame of unit. unit is therefore stationary and is at (0,0)
        let dx = this.x - unit.x,
            dy = this.y - unit.y,
            dvx = this.vx - unit.vx,
            dvy = this.vy - unit.vy,
            a = Math.pow(dvx, 2) + Math.pow(dvy, 2),
            sr2 = this.type === 'CP' ? 357604 : 640000;

        if (a < E)
            return -1;

        let b = -2 * (dx * dvx + dy * dvy),
            delta = Math.pow(b, 2) - 4 * a * (Math.pow(dx, 2) + Math.pow(dy, 2) - sr2);

        if (delta < 0)
            return -1;

        let t = (b - Math.sqrt(delta)) * (1 / (2 * a));

        if (t <= 0 || t > 0)
            return -1;

        return t;
    }
    save () {
        cache.x = this.x;
        this.cache.y = this.y;
        this.cache.vx = this.vx;
        this.cache.vy = this.vy;
    }
    load () {
        this.x = this.cache.x;
        this.y = this.cache.y;
        this.vx = this.cache.vx;
        this.vy = this.cache.vy;
    }
}
class Checkpoint extends Unit {
    constructor(id, x, y) {
        super(x, y);
        this.id = id;
        this.type = 'CP';
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 600;
    }
}
class Pod extends Unit {
    constructor(id, x, y) {
        let ncpid,
            checked,
            timeout,
            shield,
            boostAvailable,
            cache = {},
            angle = -1,
            nextAngle = -1;

        super(x, y, id);
        this.id = id;
        this.radius = 400;
        this.type = 'POD';
        this.ncpid = 1;
        this.timeout = 100;
        this.boostAvailable = true;
        this.checked = 0;
        this.shield = 0;
        this.x = x;
        this.y = y;
        //this.podPartner = podPartner;


    }
    bounceWithCheckpoint () {
        this.ncpid++;
        this.timeout = 100;
    }
    bounce (unit) {
        // This is one of the rare places where a Vector class would have made the code more readable.
        // But this place is called so often that I can't pay a performance price to make it more readable.
        function applyImpactVector(fx, fy, myMass, unitMass) {
            this.vx -= fx / myMass;
            this.vy -= fy / myMass;
            unit.vx += fx / unitMass;
            unit.vy += fy / unitMass;

        }
        if (unit instanceof Checkpoint)
            this.bounceWithCheckpoint();
        else {
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

            let firstCollision = {},
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
                collision = pods[i].collision(checkpoints[pods[i].ncpid]);

                // If the collision happens earlier than the current one we keep it
                if (collision !== null && collision.time + time < 1 && (firstCollision === null || collision.time < firstCollision.time)) {
                    firstCollision = collision;
                    collisionWithCheckPoint = true;
                }
            }

            if (Object.keys(firstCollision).length === 0 || collisionWithCheckPoint) {
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
            // Simple trigonometry. We multiply by 180.0 / PI to convert radiants to degrees.
            angle = Math.acos(dx) * 180 / Math.PI;

        // If the point I want is below me, I have to shift the angle for it to be correct
        if (dy < 0)
            angle = 360 - angle;
        return angle;
    }
    diffAngle (point) {
        let angle = this.getAngle(point),
            // To know whether we should turn clockwise or not we look at the two ways and keep the smallest
            // The ternary operators replace the use of a modulo operator which would be slower
            right = this.angle <= angle ? angle - this.angle : 360 - this.angle + angle,
            left = this.angle >= angle ? this.angle - angle : this.angle + 360 - angle;

        if (right < left)
            return right;
        else
            // We return a negative angle if we must rotate to left
            return -left;

    }
    rotate (point) {
        let a = this.diffAngle(point);
        if (a > 18)
            a = 18;
        else if (a < -18)
            a = -18;
        angle += a;

    }
    activeShield () {
        this.shield = true;
        this.shieldTimer = 3;
    }
    boost (thrust) {

        if (this.shield > 0)
            return;

        // Conversion of the angle to radiants
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
        return this.checked * 50000 - this.dist(checkpoints[this.ncpid]);
    }
    apply (thrust, angle) {
        // Can't turn by more than 18° in one turn
        if (angle > 18)
            angle = 18;
        else if (angle < -18)
            angle = -18;
        this.angle += angle;

        if (thrust === -1)
            this.shield = 4;
        else
            this.boost(thrust);
    }
}


