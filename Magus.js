"use strict";

let Point = () => {
        this.x = 0;
        this.y = 0;
        this.distSquare = (point) => {

            let x = Math.abs(this.x - point.x),
                y = Math.abs(this.y - point.y);

            return Math.pow(x, 2) + Math.pow(y, 2);
        };
        this.dist = (point) => {
            return Math.sqrt(distSquare(point));
        };
    },
    Pod = () => {
        Point.call(this);
        this.angle = 0;
        this.vx = 0;
        this.vy = 0;
        this.getAngle = (point) => {
            let dist = this.dist,
                dx = (point.x - this.x) / dist,
                dy = (point.y - this.y) / dist,
                angle = Math.acos(dx) * 180 / Math.PI;

            if (dy < 0)
                angle = 360 - angle;
            return angle;
        };
        this.diffAngle = (point) => {
            let angle = this.getAngle(point),
                right = this.angle <= angle ? angle - this.angle : 360 - this.angle + angle,
                left = this.angle >= angle ? this.angle - angle : this.angle + 360 - angle;

            if (right < left)
                return right;
            else
                return -left;

        };
        this.rotate = (point) => {
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
        };
        this.calcVectors = (thrust) => {

            let radiant = this.angle * Math.PI / 180;

            this.vx += Math.cos(radiant) * thrust;
            this.vy += Math.sin(radiant) * thrust;
        };
        this.move = (t = 1) => {
            this.x += this.vx * t;
            this.y += this.vy * t;
        };
        this.end = () => {
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);
            this.vx = Math.floor(this.vx * 0.85);
            this.vy = Math.floor(this.vy * 0.85);

        };
        this.run = (point, thrust) => {

            this.rotate(point);
            this.calcVectors(thrust);
            // What is the purpose of this t parameter in move()?
            // It will be useful later when we'll want to simulate an entire turn while taking into account collisions.
            // It is used to indicate by how much the pod should move forward. If t is 1.0 then the pod will move for a turn's worth.
            // If it's 0.5 it will only move for half a turn's worth. If you don't want to simulate collisions you can replace t by 1.0.
            this.move();
            this.end();
        };
    },
    timeout = 0,
    map = [],
    mapReady = false;

while (true) { // infinite loop in inspections

    let myData = readline().split(' '),
        nextCP = {
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
        fillMap = (nextCPPos) => {

           let index = map.indexOf(nextCPPos);

           if (index === -1)
              map.push(nextCPPos);
           else if (index !== map.length -1)
               mapReady = true;

        },
        myPod = new Pod(),
        text = `hello`,
        thrustToTry = 100;

    // fill possible maps
    if (!mapReady)
        fillMap(nextCP.pos);


    // init myPod
    myPod.x = myPos.x;
    myPod.y = myPos.y;
    if (nextCP.angle < 90 && nextCP.angle >= -180)
        myPod.angle = nextCP.angle + 270;
    else if (nextCP.angle >= 90 && nextCP.angle <= 180)
        myPod.angle = nextCP.angle - 90;


    while (timeout < 60000) {
        // returns (next turn will be): myPod.angle, myPod.x, myPod.y
        myPod.run(nextCP.pos, thrustToTry); // Nodes => based on thrustToTry
        timeout += 1;
    }



    console.log(`${nextCP.pos.x} ${nextCP.pos.y} ${thrust} ${text}`);




}







