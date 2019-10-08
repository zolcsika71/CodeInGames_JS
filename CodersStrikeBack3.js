const
    CP_ANGLE = [0, 9, 18, 27, 36, 45, 54, 63, 72, 81, 89];



let myLastPos = {
        x: 0,
        y: 0
    },
    opponentLastPos = {
        x: 0,
        y: 0
    },
    boosted = false,
    Pod = (name) => {

        this.name = name;

        this.pos = {
            x: this.x,
            y: this.y
        };

        this.lastPos = {
            x: this.x,
            y: this.y
        };

        this.angle = 0;

        this.dist = Infinity;

        this.checkSpeed = (lastPos, pos) => {

            let x = Math.abs(lastPos.x - pos.x),
                y = Math.abs(lastPos.y - pos.y),
                speed = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));

            return Math.round(speed);
        };
        this.checkAngle = (angle) => {

            let returnValue;

            for (let i = 0; i < CP_ANGLE.length; i++) {
                if (angle <= CP_ANGLE[i] && angle >= CP_ANGLE[i] * -1) {
                    returnValue = i;
                    break;
                }
            }
            if (returnValue)
                return returnValue;
            else
                return false;
        };

        this.angleLevel = this.checkAngle(this.angle);

        this.speed = () => {

            let speed = this.checkSpeed(this.lastPos, this.pos);
            this.lastPos = this.pos;
            return speed;

        };
    },
    Node = (parent) => {

        if (parent)
            this.parent = parent;
        else
            this.parent = 'root';

        this.score = 0;

        this.firstChildIndex = 0;

        this.childCount = 0;

        this.visited = 0;

        this.angle = 0;

        this.thrust = 0;

    },
    myPodInit = new Pod('myPodInit'),
    myPodEvolve = new Pod('myPodEvolve');




while (true) {
    let myData = readline().split(' '),
        nextCP = {
            x: parseInt(myData[2]), // x position of the next check point
            y: parseInt(myData[3]), // y position of the next check point
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
        myPodInit = (name) => {
            name.pos.x = myPos.x;
            name.pos.y = myPos.y;

            if (myLastPos.x === 0 && myLastPos.y === 0) {
                name.lastPos.x = myPos.x;
                name.lastPos.y = myPos.y;
            }

            name.angle = nextCP.angle;
            name.dist = nextCP.dist;

        };

    myPodInit('myPodInit');








}
