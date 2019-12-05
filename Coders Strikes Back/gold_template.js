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
            lastCollision = new Collision(null, null, 0);

        while (time < 1) {

            let firstCollision = new Collision(null, null, 0),
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

            if (firstCollision.unitA === null || collisionWithCheckPoint) {
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
                lastCollision = firstCollision;

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
        let diffAngle = this.diffAngle(point);
        // Can't turn by more than 18° in one turn
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
        return this.checked * 50000 - this.dist(checkpoints[this.checkPointId]);
    }
}
