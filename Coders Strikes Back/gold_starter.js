const
    CP = 0,
    POD = 1,
    DEPTH = 6,
    SHIELD_PROB = 10,
    MAX_THRUST = 100,
    DISABLED_ANGLE = 90,
    THRUST_BOOST = 'BOOST',
    THRUST_SHIELD = 'SHIELD',
    E = 0.00001;

let r = -1,
    turn = 0,
    sols_ct = 0,
    is_p2 = false,
    laps = parseInt(readline()),
    cp_ct = parseInt(readline()),
    pods = [],
    cps = [],
    podPartner = {
        0: 1,
        1: 0,
        2: 3,
        3: 2
    },
    x, y, vx, vy, angle, ncpId;

function rnd(n, b = 0) {
    return Math.random() * (b - n) + n;
}
function roundAngle(angle) {
    return Math.max(-18, Math.min(18, angle));
}
function printMove(thrust, angle, pod) {
    let a = pod.angle + roundAngle(angle);
    if (a >= 360)
        a = a - 360;
    else if (a < 0)
        a += 360;

    a = a * Math.PI / 180.0;

    let px = Math.round(pod.x + Math.cos(a) * 10000),
        py = Math.round(pod.y + Math.sin(a) * 10000);

    if (thrust === -1) {
        console.log(`${px} ${py} ${THRUST_SHIELD}`);
        pod.shield = 4;
    } else if (thrust === 650) {
        console.log(`${px} ${py} ${THRUST_BOOST}`);
        pod.boostAvailable = false;
    } else
        console.log(`${px} ${py} ${thrust}`);
}
function play() {
    let t = 0;
    while (t < 1) {

        let firstCollision = new Collision(null, null, -1);
        for (let i = 0; i < 4; i++) {
            for (let j = i + 1; j < 4; j++) {
                let collisionTime = pods[i].collisionTime(pods[j]);
                if (collisionTime > -1 && collisionTime + t < 1 && (firstCollision.time === -1 || collisionTime < firstCollision.time)) {
                    firstCollision.a = pods[i];
                    firstCollision.b = pods[j];
                    firstCollision.time = collisionTime
                }
            }
        }
        if (firstCollision.time === -1) {
            for (let i = 0; i < 4; i++)
                pods[i].move(1.0 - t);

            t = 1;
        } else {

            for (let i = 0; i < 4; i++)
                pods[i].move(firstCollision.time);

            firstCollision.a.bounce(firstCollision.b);
            t += firstCollision.time;
        }
        for (let i = 0; i < 4; i++)
            pods[i].end();
    }
}

class Collision {
    constructor(a, b, time) {
        this.a = a;
        this.b = b;
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

        if (vx === unit.vx && vy === unit.vy) // Optimisation. Objects with the same speed will never collide
            return -1;

        // We place ourselves in the reference frame of unit. unit is therefore stationary and is at (0,0)
        let dx = x - unit.x,
            dy = y - unit.y,
            dvx = vx - unit.vx,
            dvy = vy - unit.vy,
            a = Math.pow(dvx, 2) + Math.pow(dvy, 2),
            sr2 = this.type === 'CP' ? 357604 : 640000;

        if (a < E)
            return -1;

        let b = -2 * (dx * dvx + dy * dvy),
            delta = Math.pow(b, 2) - 4 * a * (Math.pow(dx, 2) + Math.pow(dy, 2) - sr2);

        if (delta < 0)
            return -1;

        let t = (b - Math.sqrt(delta)) * (1 / (2 * a));

        if (t <= 0 || t > 1)
            return -1;

        return t;
    }
}
class Checkpoint extends Unit {
    constructor(id, x, y) {
        super(x, y);
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.type = 'CP';
        this.radius = 600;
    }
}
class Pod extends Unit {
    constructor(id, x, y) {
        super(id, x, y);
        this.id = id;
        this.radius = 400;
        this.type = 'POD';
        this.ncpId = 1;
        this.timeout = 100;
        this.boostAvailable = true;
        this.checked = 0;
        this.shield = 0;
        this.cache = {};
        this.podPartner = pods[podPartner[this.id]];
        this.angle = -1;
        this.nextAngle = -1;
    }
    play (pods, checkpoints) {
        let collisionWithCheckPoint = false,
            time = 0,
            lastCollision = new Collision(null, null, -1);

        while (time < 1) {

            let firstCollision = new Collision(null, null, -1),
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
                collision = pods[i].collision(checkpoints[pods[i].ncpId]);

                // If the collision happens earlier than the current one we keep it
                if (collision !== null && collision.time + time < 1 && (firstCollision === null || collision.time < firstCollision.time)) {
                    firstCollision = collision;
                    collisionWithCheckPoint = true;
                }
            }

            if (firstCollision.a === null || collisionWithCheckPoint) {
                // No collision, we can move the pods until the end of the turn
                for (let i = 0; i < pods.length; i++)
                    pods[i].move(1 - time);

                if (collisionWithCheckPoint)
                    this.bounceWithCheckpoint();
                // End of the turn
                time = 1;
            } else {
                if (!(firstCollision.a === lastCollision.a && firstCollision.b === lastCollision.b && firstCollision.t === 0)) {
                    // Move the pods to reach the time `t` of the collision
                    for (let i = 0; i < pods.length; ++i)
                        pods[i].move(firstCollision.time);

                    // Play out the collision
                    firstCollision.a.bounce(firstCollision.b);
                    time += firstCollision.time;
                }
                lastCollision = Object.assign(firstCollision);

            }
        }
        for (let i = 0; i < pods.length; ++i)
            pods[i].end();

    }
    run (pods, checkpoints, target, thrust) {
        for (let i = 0; i < pods.length; i++) {
            pods[i].rotate(new Point(target.x, target.y));
            pods[i].boost(thrust);
        }
        this.play(pods, checkpoints)
    }
    score (checkpoints) {
        return this.checked * 50000 - this.dist(checkpoints[this.ncpId]);
    }
    setAngle (angle) {
        // Can't turn by more than 18° in one turn
        angle = roundAngle(angle);

        this.angle += angle;

        if (this.angle >= 360)
            this.angle = this.angle - 360;
        else if (this.angle < 0)
            this.angle += 360;


    }
    apply (thrust, angle) {

        this.setAngle(angle);

        if (thrust === -1)
            this.shield = 4;
        else
            this.boost(thrust);
    }
    rotate (point) {
        let angle = this.diffAngle(point);
        this.setAngle(angle);
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

        if (this.checked > cp_ct * laps) {
            this.ncpId = 0;
            this.checked = cp_ct * laps;
        }

        // Don't forget that the timeout goes down by 1 each turn. It is reset to 100 when you pass a checkpoint
        this.timeout--;

        if (this.shield > 0)
            this.shield--;
    }
    bounce (unit) {
        if (unit.type === 'CP') {
            this.checked++;
            this.timeout = this.podPartner.timeout = 100;
            this.ncpId = (ncpId + 1) % cp_ct;
            return;
        }
        this.bounceWithPod(pods[unit.id]);
    }
    bounceWithPod (pod) {
        // This is one of the rare places where a Vector class would have made the code more readable.
        // But this place is called so often that I can't pay a performance price to make it more readable.
        function applyImpactVector(fx, fy, myMass, unitMass) {
            this.vx -= fx / myMass;
            this.vy -= fy / myMass;
            pod.vx += fx / unitMass;
            pod.vy += fy / unitMass;

        }
        // If a pod has its shield active its mass is 10 otherwise it's 1
        let m1 = this.shield === 4 ? 10 : 1,
            m2 = pod.shield === 4 ? 10 : 1,
            mCoEff = (m1 + m2) / (m1 * m2),
            nx = this.x - pod.x,
            ny = this.y - pod.y,
            dst2 = Math.pow(nx, 2) + Math.pow(ny, 2),
            dvx = this.vx - pod.vx,
            dvy = this.vy - pod.vy,
            impactVector = nx * dvx + ny * dvy, // fx and fy are the components of the impact vector. impactVector is just there for optimisation purposes
            fx = (nx * impactVector) / (dst2 * mCoEff),
            fy = (ny * impactVector) / (dst2 * mCoEff),
            impulse = Math.sqrt(Math.pow(fx, 2) + Math.pow(fy, 2));

        // We apply the impact vector once
        applyImpactVector(fx, fy, m1, m2);

        // If the norm of the impact vector is less than 120, we normalize it to 120
        if (impulse < 120) {
            fx = fx * 120.0 / impulse;
            fy = fy * 120.0 / impulse;
        }

        // We apply the impact vector a second time
        applyImpactVector(fx, fy, m1, m2);

    }
    diffAngle (point) {
        let a = this.getAngle(point),
            // To know whether we should turn clockwise or not we look at the two ways and keep the smallest
            // The ternary operators replace the use of a modulo operator which would be slower
            right = this.angle <= a ? a - this.angle : 360 - this.angle + a,
            left = this.angle >= a ? this.angle - a : this.angle + 360 - a;

        if (right < left)
            return right;
        else
            // We return a negative angle if we must rotate to left
            return -left;

    }
    getAngle (point) {
        let dist = this.dist(point),
            dx = (point.x - x) / dist,
            dy = (point.y - y) / dist,
            // Simple trigonometry. We multiply by 180.0 / PI to convert radiants to degrees.
            angle = Math.acos(dx) * 180 / Math.PI;

        // If the point I want is below me, I have to shift the angle for it to be correct
        if (dy < 0)
            angle = 360 - angle;
        return angle;
    }
    update (x, y, vx, vy, angle, ncpId) {
        if (this.shield > 0)
            this.shield--;

        if (ncpId !== this.ncpId) {
            this.timeout = this.podPartner.timeout = 100;
            this.checked++;
        } else
            this.timeout--;

        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.ncpId = ncpId;

        if (is_p2 && this.id > 1)
            [angle, this.nextAngle] = [this.nextAngle, angle]; // swap the variables

        this.angle = angle;

        if (r === 0)
            this.angle = 1 + this.diffAngle(cps[1]);

        this.save();

    }
    save () {
        this.cache.x = this.x;
        this.cache.y = this.y;
        this.cache.vx = this.vx;
        this.cache.vy = this.vy;
        this.cache.npcId = this.ncpId;
        this.cache.checked = this.checked;
        this.cache.timeout = this.timeout;
        this.cache.shield = this.shield;
        this.cache.angle = this.angle;
        this.cache.boostAvailable = this.boostAvailable;
    }
    load () {
        this.x = this.cache.x;
        this.y = this.cache.y;
        this.vx = this.cache.vx;
        this.vy = this.cache.vy;
        this.ncpId = this.cache.npcId;
        this.checked = this.cache.checked;
        this.timeout = this.cache.timeout;
        this.shield = this.cache.shield;
        this.angle = this.cache.angle;
        this.boostAvailable = this.cache.boostAvailable;
    }
}
class Solution {
    constructor() {
        this.score = -1;
        this.thrusts = [...Array(DEPTH * 2)];
        this.angles = [...Array(DEPTH * 2)];
    }
    shift () {
        for (let i = 1; i < DEPTH; i++) {
            this.angles[i - 1] = this.angles[i];
            this.thrusts[i - 1] = this.thrusts[i];
            this.angles[i - 1 + DEPTH] = this.angles[i + DEPTH];
            this.thrusts[i - 1 + DEPTH] = this.thrusts[i + DEPTH];
        }
        this.randomize(DEPTH - 1, true);
        this.randomize(2 * DEPTH - 1, true);
        this.score = -1;
    }
    mutate () {
        this.randomize(rnd(2 * DEPTH));
    }
    mutateChild (child) {
        child.angles = [...this.angles];
        child.thrusts = [...this.thrusts];
        child.mutate()
    }
    randomize (idx, full = false) {
        let r = rnd(2);
        if (full || r === 0)
            this.angles[idx] = Math.max(-18, Math.min(18, rnd(-40, 40)));

        if (full || r === 1) {
            if (rnd(100) >= SHIELD_PROB)
                this.thrusts[idx] = Math.max(0, Math.min(MAX_THRUST, rnd(-0.5 * MAX_THRUST, 2 * MAX_THRUST)));
            else
                this.thrusts[idx] = -1;
        }
        this.score = -1;
    }
    runRandomize () {
        for (let i = 0; i < 2 * DEPTH; i++)
            this.randomize(i, true);
    }
}
class Bot {
    constructor(id) {
        this.id = id;
    }
    runner () {
        return this.getScore(pods[this.id], pods[this.id + 1]);
    }
    blocker () {
        return this.getScore(pods[this.id].podPartner, pods[this.id + 1].podPartner)
    }
    getScore (pod0, pod1) {
        return pod0.score() - pod1.score() >= 1000 ? pod0 : pod1;
    }
}
class ReflexBot extends Bot {
    constructor(id) {
        super(id);
        this.id = id;
    }
    move () {
        this.moveBot('runner');
        this.moveBot('blocker');
    }
    moveAsMain () {
        this.moveBot('runner', true);
        this.moveBot('blocker', true);
    }
    moveBot (type, forOutput = false,) {
        let pod = type === 'runner' ? forOutput ? pods[0] : this.runner() : forOutput ? this.blocker() : pods[1],
            cp = cps[pod.ncpId],
            target = new Point(cp.x - 3 * pod.vx,cp.y - 3 * pod.vy),
            rawAngle = pod.diffAngle(target),
            thrust = Math.abs(rawAngle) < DISABLED_ANGLE ? MAX_THRUST : 0;

        if (forOutput)
            printMove(thrust, rawAngle, pod);
        else
            pod.apply(thrust, rawAngle);
    }
}
class SearchBot extends Bot {
    constructor(id, solution) {
        super(id);
        this.solution = solution;
    }
    
}

// create CheckPoint classes array
for (let i = 0; i < cp_ct; i++) {
    let inputs = readline().split(' '),
        cpX = parseInt(inputs[0]),
        cpY = parseInt(inputs[1]);
    cps[i] = new Checkpoint(i, cpX, cpY);
}
// create pod classes array
for (let i = 0; i < 4; i++)
    pods[i] = new Pod(i, 0, 0);


while (true) {

    r++;

    for (let i = 0; i < 4; i++) {

        let inputs = readline().split(' ');

        x = parseInt(inputs[0]);
        y = parseInt(inputs[1]);
        vx = parseInt(inputs[2]);
        vy = parseInt(inputs[3]);
        angle = parseInt(inputs[4]);
        ncpId = parseInt(inputs[5]);

        if (r === 0 && i > 1 && angle > -1)
            is_p2 = true;

        pods[i].update(x, y, vx, vy, angle, ncpId);

    }



}

