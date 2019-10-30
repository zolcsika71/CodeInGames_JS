/**
 * Auto-generated code below aims at helping you parse
 * the standard input according to the problem statement.
 **/

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
            det = Math.pow(da, 2) + Math.pow(db,2),
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
        let time,
            x = this.x - unit.x,
            y = this.y - unit.y,
            vx = this.vx - unit.vx,
            vy = this.vy - unit.vy,
            myPoint = new Point(x, y),
            unitPoint = new Point(0, 0),
            closestPoint = unitPoint.closest(myPoint, new Point(x + vx, y + vy)), // We look for the closest point to u (which is in (0,0)) on the line described by our speed vector
            unitPointDist = unitPoint.distSquare(closestPoint), // Square of the distance between unit and the closest point to unit on the line described by our speed vector
            myPointDist = myPoint.distSquare(closestPoint); // Square of the distance between us and that point

        // If the distance between u and this line is less than the sum of the radii, there might be a collision
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

            time = myPointDist / length;

            return new Collision(this, unit, time)
        }
        return null;
    }
}

/*
class Pod extends Point {
    constructor(x, y, angle) {
        super(x, y);
        this.angle = angle;
        this.vx = 0;
        this.vy = 0;
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
    calcVectors (thrust) {

        let radiant = this.angle * Math.PI / 180;

        this.vx += Math.cos(radiant) * thrust;
        this.vy += Math.sin(radiant) * thrust;
    }
    move (t = 1) {
        this.x += this.vx * t;
        this.y += this.vy * t;
    }
    end () {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.vx = Math.floor(this.vx * 0.85);
        this.vy = Math.floor(this.vy * 0.85);

    }
    run (point, thrust) {

        this.rotate(point);
        this.calcVectors(thrust);
        // What is the purpose of this t parameter in move()?
        // It will be useful later when we'll want to simulate an entire turn while taking into account collisions.
        // It is used to indicate by how much the pod should move forward. If t is 1.0 then the pod will move for a turn's worth.
        // If it's 0.5 it will only move for half a turn's worth. If you don't want to simulate collisions you can replace t by 1.0.
        this.move();
        this.end();
    }
}
*/

