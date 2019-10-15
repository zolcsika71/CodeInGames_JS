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
        CLOSE: 1500,
        BORDER: 600,
        SCORED: 400
    };

let angleToThrust = (CP_angle) => {

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

    myLastPos = {
        x: 0,
        y: 0
    },
    CPNumber = 0,
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
        CP_angle,
        CP_dist,
        MY_speed,
        thrust,
        text = {};



    if (!mapReady) {
        CPNumber = fillMap(nextCP.pos);
        CP_angle = checkAngle(nextCP.angle);
        CP_dist = checkDist(nextCP.dist);
        MY_speed = checkSpeed(myLastPos, myPos);
        thrust = setThrust(CP_angle, CP_dist, MY_speed);
    }
    else {
        CPNumber = findCoords(nextCP.pos);


    }

    text.basic = `thr: ${thrust} spd: ${MY_speed} dst: ${nextCP.dist} dstN: ${CP_dist} ang: ${nextCP.angle} angN: ${CP_angle}`;
    text.map = `mapReady: ${mapReady} mapLength: ${map.length} x: ${map[CPNumber].x} y: ${map[CPNumber].y} CP#: ${CPNumber + 1}`;

    console.error(`${text.basic}`);
    console.error(`${text.map}`);

    console.log(`${nextCP.pos.x} ${nextCP.pos.y} ${thrust} ${thrust}`);

}
