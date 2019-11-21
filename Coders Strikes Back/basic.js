"use strict";

const
    maxThrust = 100,
    breakDist = 1200,
    disabledAngle = 90 - 18;


function nextIndex(index, array) {
    return index + 1 === array.length ? 0 : index + 1;
}
function lastIndex(index, array) {
    return index - 1 < 0 ? array.length : index - 1;

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



let map = new Map(),
    boostAvailable = true,
    countSpeed = (position, target) => {

        let myPosition = new Point(position.x, position.y),
            speed = myPosition.dist(target);

        return Math.round(speed);

    },
    adjustThrust = (checkpoint, target) => {
        // If angle is too wide
        if (Math.abs(checkpoint.angle) >= disabledAngle) {
            console.error(`speed angle: 5`);
            return 5;
        } else {
            if (checkpoint.farest && boostAvailable && Math.abs(Math.abs(checkpoint.angle) <= 3 && map.mapReady)) {
                //console.error(`angle: ${angle}`);
                boostAvailable = false;
                return 'BOOST';
            } else
                return setThrust(checkpoint, target);
        }
    },
    setThrust = (checkpoint, target) => {
        let m1 = 1 - checkpoint.angle / disabledAngle,
            m2 = checkpoint.distance / (checkpoint.radius * 2);

        m2 = m2 > 1 ? 1 : m2;

        let returnValue = Math.round(maxThrust * m1 * m2);

        returnValue = returnValue > 100 ? 100 : returnValue;

        return returnValue;

    },
    lastPos = null;


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
        index,
        checkpoint,
        log = {};

    if (!map.mapReady) {
        checkpoint = new Checkpoint(nextCheckpoint.pos.x, nextCheckpoint.pos.y, nextCheckpoint.angle, nextCheckpoint.dist);
        map.addCheckpoint(checkpoint);
    } else {
        index = map.findIndex(nextCheckpoint.pos);
        checkpoint = map.checkpoints[index];
        checkpoint.distance = nextCheckpoint.dist;
        checkpoint.angle = nextCheckpoint.angle;
    }

    if (lastPos === null)
        lastPos = new Point(myPos.x, myPos.y);

    let lastInd = lastIndex(index, map.checkpoints),
        nextInd =  nextIndex(index, map.checkpoints),
        speed = countSpeed(lastPos, myPos),
        target = new Point(checkpoint.x - 3 * speed, checkpoint.y - 3 * speed),
        thrust = adjustThrust(checkpoint, target);

    log.speed = `speed: ${Math.round(speed)}`;

    console.error(log.speed);

    console.log(`${target.x} ${target.y} ${thrust}`);

    lastPos.x = myPos.x;
    lastPos.y = myPos.y;

}



