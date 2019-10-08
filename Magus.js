"use strict";

const
    possibleMaps = [
        [{x: 12460, y: 1350}, {x: 10540, y: 5980}, {x: 3580, y: 5180}, {x: 13580, y: 7600}],
        [{x: 3600, y: 5280}, {x: 13840, y: 5080}, {x: 10680, y: 2280}, {x: 8700, y: 7460}, {x: 7200, y: 2160}],
        [{x: 4560, y: 2180}, {x: 7350, y: 4940}, {x: 3320, y: 7230}, {x: 14580, y: 7700}, {x: 10560, y: 5060}, {x: 13100, y: 2320}],
        [{x: 5010, y: 5260}, {x: 11480, y: 6080}, {x: 9100, y: 1840}], [{x: 14660, y: 1410}, {x: 3450, y: 7220}, {x: 9420, y: 7240}, {x: 5970, y: 4240}],
        [{x: 3640, y: 4420}, {x: 8000, y: 7900}, {x: 13300, y: 5540}, {x: 9560, y: 1400}],
        [{x: 4100, y: 7420}, {x: 13500, y: 2340}, {x: 12940, y: 7220}, {x: 5640, y: 2580}],
        [{x: 14520, y: 7780}, {x: 6320, y: 4290}, {x: 7800, y: 860}, {x: 7660, y: 5970}, {x: 3140, y: 7540}, {x: 9520, y: 4380}],
        [{x: 10040, y: 5970}, {x: 13920, y: 1940}, {x: 8020, y: 3260}, {x: 2670, y: 7020}], [{x: 7500, y: 6940}, {x: 6000, y: 5360}, {x: 11300, y: 2820}],
        [{x: 4060, y: 4660}, {x: 13040, y: 1900}, {x: 6560, y: 7840}, {x: 7480, y: 1360}, {x: 12700, y: 7100}],
        [{x: 3020, y: 5190}, {x: 6280, y: 7760}, {x: 14100, y: 7760}, {x: 13880, y: 1220}, {x: 10240, y: 4920}, {x: 6100, y: 2200}],
        [{x: 10323, y: 3366}, {x: 11203, y: 5425}, {x: 7259, y: 6656}, {x: 5425, y: 2838}]
    ];

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
    timeout = 100;

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
        selectMap = (possibleMaps) => {
            for (let map of possibleMaps)
                if (map[1].x === nextCP.pos.x && map[1].y === nextCP.pos.y)
                    return map;
        },
        map = selectMap(possibleMaps),
        myPod = new Pod(),
        text = `hello`,
        thrustToTry = 100;


    // init myPod
    myPod.x = myPos.x;
    myPod.y = myPos.y;
    if (nextCP.angle < 90 && nextCP.angle >= -180)
        myPod.angle = nextCP.angle + 270;
    else if (nextCP.angle >= 90 && nextCP.angle <= 180)
        myPod.angle = nextCP.angle - 90;


    if (timeout > 0) {
        myPod.run(nextCP.pos, thrustToTry); // Nodes => based on thrustToTry
        timeout -= 1;
    }

    // returns (next turn will be): myPod.angle(point), myPod.x, myPod.y, myPod.vx, myPod.vy

    console.log(`${nextCP.x} ${nextCP.y} ${thrust} ${text}`);




}







