"use strict";


let mapReady = false;

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
    }
    setAngleToMyHeading (angle) {
        this.angle = angle;
    }
    setDistanceToMyPos (distance) {
        this.distance = distance;
    }
    setDistanceFromPrevCheckPoint (distance) {
        this.distanceFromPrevCheckPoint = distance;
    }
}
class Map {
    constructor() {
        this.mapArray = [];
        this.lap = 0;
    }
    getLap () {
        if (mapReady && this.findIndex(checkpoint) === 0) {
            this.lap++;
            return this.lap;
        } else
            return 0;
    }
    findIndex (checkpoint) {
        return this.mapArray.findIndex(i => i.x === checkpoint.x && i.y === checkpoint.y);
    }
    addCheckpoint (checkpoint) {
        let index = this.findIndex(checkpoint);

        if (index === -1) {

            let mapArrayLength = this.mapArray.length;

            if (mapArrayLength === 0) {
                checkpoint.setDistanceFromPrevCheckPoint(checkpoint.distance);
                this.mapArray.push(checkpoint);
            } else {
                let lastIndex = mapArrayLength - 1 < 0 ? 0 : mapArrayLength - 1,
                    dist = this.mapArray[lastIndex].dist(checkpoint);

                checkpoint.setDistanceFromPrevCheckPoint(dist);
                this.mapArray.push(checkpoint);
            }

        } else if (index !== this.mapArray.length - 1) {
            mapReady = true;
        }
    }
}



