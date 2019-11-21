"use strict";

function toDegrees(radian) {
    return radian * (180 / Math.PI);
}
function toRadians(angle) {
    return angle * (Math.PI / 180);
}
function baseVector(point1, point2) {
    return {
        x: point2.x - point1.x,
        y: point2.y - point1.y
    };
}

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    zero () {
        return new Vector(0, 0)
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
class PodSim {
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
    acceleration () {
        return this.seekSteeringForce().truncate(this.velocity().magnitude());
    }
    friction () {
        return new Vector(this.velocity().multiply(0.85));
    }
    nextPos () {
        let velocity = this.velocity().add(this.acceleration()).friction();
        return this.pos().add(velocity);
    }
    seekDesiredVelocity () {
        return this.targetPos().subtract(this.pos());
    }
    seekSteeringForce () {
        return this.shield ? this.seekDesiredVelocity().subtract(this.velocity()).divide(10) : this.seekDesiredVelocity().subtract(this.velocity());
    }

}

