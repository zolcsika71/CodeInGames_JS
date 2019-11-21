/**
 * Auto-generated code below aims at helping you parse
 * the standard input according to the problem statement.
 **/

const
    BOOST_DIST = 6000,
    CP_ANGLE = [0, 9, 18, 27, 36, 45, 54, 63, 72, 81, 90],
    THRUST = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'BOOST'],
    CP_DIST = {
        MIDDLE: 2000,
        CLOSE: 1000,
        BORDER: 600,
        SCORED: 400
    },
    Point = (x, y) => {
        this.x = x;
        this.y = y;
        this.distSquare = (point) => {

            let x = Math.abs(this.x - point.x),
                y = Math.abs(this.y - point.y);

            return Math.pow(x, 2) + Math.pow(y, 2);
        };
        this.dist = (point) => {
            return Math.sqrt(distSquare(point));
        };
    },
    Pod = (angle) => {
        Point.call(this);
        this.angle = angle;
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
    angleToThrust = (CP_angle) => {

        let thrust;

        if (CP_angle <= 1)
            thrust = THRUST[10];
        else if (CP_angle === 2)
            thrust = THRUST[9];
        else if (CP_angle === 3)
            thrust = THRUST[8];
        else if (CP_angle === 4)
            thrust = THRUST[7];
        else if (CP_angle === 5)
            thrust = THRUST[6];
        else if (CP_angle === 6)
            thrust = THRUST[5];
        else if (CP_angle === 7)
            thrust = THRUST[4];
        else if (CP_angle === 8)
            thrust = THRUST[3];
        else if (CP_angle === 9)
            thrust = THRUST[2];
        else if (CP_angle === 10)
            thrust = THRUST[1];
        else if (CP_angle === 10)
            thrust = THRUST[1];

        return thrust;

    },
    checkAngle = (nextCP_Angle) => {

        let returnValue;

        for (let i = 0; i < CP_ANGLE.length; i++) {
            if (nextCP_Angle <= CP_ANGLE[i] && nextCP_Angle >= CP_ANGLE[i] * -1) {
                returnValue = i;
                break;
            }
        }
        if (returnValue)
            return returnValue;
        else
            return false;
    },
    checkDist = (nextCP_dist) => {
        let NEXT_CP_DIST = {
            BOOST_DIST: nextCP_dist > BOOST_DIST,
            FAR: nextCP_dist >= CP_DIST.MIDDLE,
            MIDDLE: nextCP_dist < CP_DIST.MIDDLE && nextCP_dist >= CP_DIST.CLOSE,
            CLOSE: nextCP_dist < CP_DIST.CLOSE && nextCP_dist >= CP_DIST.BORDER,
            SLIP: nextCP_dist < CP_DIST.BORDER && nextCP_dist > CP_DIST.SCORED
        };

        for (let dist in NEXT_CP_DIST)
            if (NEXT_CP_DIST[dist])
                return dist;
    },
    checkSpeed = (myLastPos, myPos) => {

        let x = Math.abs(myLastPos.x - myPos.x),
            y = Math.abs(myLastPos.y - myPos.y),
            speed = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));

        myLastPos.x = myPos.x;
        myLastPos.y = myPos.y;

        return Math.round(speed);
    },
    setThrust = (CP_angle, CP_dist, MY_speed) => {

        let thrust;

        switch (CP_dist) {

            case 'BOOST_DIST':
                if (CP_angle <= 1) {
                    thrust = THRUST[11];
                } else
                    thrust = angleToThrust(CP_angle);
                break;
            case 'FAR':
                thrust = angleToThrust(CP_angle);
                break;
            case 'MIDDLE':
                if (MY_speed >= 450 && CP_angle <= 2)
                    thrust = THRUST[0];
                else
                    thrust = angleToThrust(CP_angle);
                break;
            case 'CLOSE':
                if (MY_speed < 300 && CP_angle <= 1)
                    thrust = THRUST[7];
                else
                    thrust = THRUST[0];
                break;
            case 'SLIP':
                if (MY_speed < 100)
                    thrust = THRUST[3];
                else
                    thrust = THRUST[0];
                break;
            default:
                thrust = THRUST[11];

        }
        return thrust;
    },
    findCoords = (nextCPPos) => {
        return map.findIndex(i => i.x === nextCPPos.x && i.y === nextCPPos.y);
    },
    fillMap = (nextCPPos) => {

    let index = findCoords(nextCPPos);

    if (index === -1)
        map.push(nextCPPos);
    else if (index !== map.length - 1)
        mapReady = true;

    if (index === -1)
        return map.length - 1;
    else
        return index;
},
    convertAngle = (angle) => {

        if (angle < 90 && angle >= -180)
            angle = angle + 270;
        else if (angle >= 90 && angle <= 180)
            angle = angle - 90;

        return angle;

    };

let myLastPos = {
        x: 0,
        y: 0
    },
    CPNumber = 0,
    myPod,
    podInit = false,
    map = [],
    mapReady = false;



// game loop
while (true) {

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
        CP_angle = checkAngle(nextCP.angle),
        convertedAngle = convertAngle(nextCP.angle),
        CP_dist = checkDist(nextCP.dist),
        MY_speed = checkSpeed(myLastPos, myPos),
        thrust = setThrust(CP_angle, CP_dist, MY_speed),
        text = {};

    if (!mapReady)
        CPNumber = fillMap(nextCP.pos);
    else
        CPNumber = findCoords(nextCP.pos);

    if (!podInit) {

        myPod = new Pod(myPos.x, myPos.y, convertedAngle);
        podInit = true;
    }


    // returns (next turn will be): myPod.angle, myPod.x, myPod.y
    myPod.run(nextCP.pos, thrust); // Nodes => based on thrustToTry


    text.map = `mapReady: ${mapReady} mapLength: ${map.length} x: ${map[CPNumber].x} y: ${map[CPNumber].y} CP#: ${CPNumber + 1}`;
    text.coord = `thrust: ${thrust} speed: ${MY_speed} angle: ${nextCP.angle} dist: ${CP_dist}`;
    text.CP = `CP x: ${nextCP.pos.x} CP y: ${nextCP.pos.y}`;
    text.sim = `SIM -> x: ${myPod.x} y: ${myPod.y} angle: ${myPod.angle}`;
    text.checkSim = `${myPod.x === myPos.x ? 'OK' : myPod.x - myPos.x} ${myPod.y === myPos.y ? 'OK' : myPod.y - myPos.y} ${myPod.angle === convertedAngle ? 'OK' : myPod.angle - convertedAngle}`;

    console.error(`${text.map}`);
    console.error(`${text.CP}`);
    console.error(`${text.coord}`);


    console.log(`${nextCP.pos.x} ${nextCP.pos.y} ${thrust} ${thrust}`);

}
