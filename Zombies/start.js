"use strict";


const
    MY_KILL_RANGE = 2000,
    MY_MOVE_RANGE = 1000,
    ZOMBIE_KILL_RANGE = 400,
    ZOMBIE_MOVE_RANGE = 400,
    PG_X = 16000,
    PG_Y = 9000,
    DEPTH = 3,
    TIME = 100,
    PI = Math.PI,
    RAND = Alea();

let round = -1,
    now,
    sol_ct = -1,
    humans = [],
    zombies = [],
    myX,
    myY;





function BB(x) {
    return JSON.stringify(x, null, 2);
}
function Mash() {
    let n = 0xefc8249d,
        mash = function (data) {
            data = String(data);
            for (let i = 0; i < data.length; i++) {
                n += data.charCodeAt(i);
                let h = 0.02519603282416938 * n;
                n = h >>> 0;
                h -= n;
                h *= n;
                n = h >>> 0;
                h -= n;
                n += h * 0x100000000; // 2^32
            }
            return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
        };

    return mash;
}
function Alea() {
    return (function (args) {
        // Johannes Baagøe <baagoe@baagoe.com>, 2010
        let s0 = 0,
            s1 = 0,
            s2 = 0,
            c = 1;

        if (args.length === 0)
            args = [+new Date];

        let mash = Mash();

        s0 = mash(' ');
        s1 = mash(' ');
        s2 = mash(' ');

        for (let i = 0; i < args.length; i++) {
            s0 -= mash(args[i]);

            if (s0 < 0)
                s0 += 1;

            s1 -= mash(args[i]);

            if (s1 < 0)
                s1 += 1;

            s2 -= mash(args[i]);

            if (s2 < 0)
                s2 += 1;
        }
        mash = null;

        let random = function () {
            let t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
            s0 = s1;
            s1 = s2;
            return s2 = t - (c = t | 0);
        };
        random.uint32 = function () {
            return random() * 0x100000000; // 2^32
        };
        random.fract53 = function () {
            return random() +
                (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
        };
        random.version = 'Alea 0.9';
        random.args = args;
        return random;

    } (Array.prototype.slice.call(arguments)));
}
function rnd(n, b = 0) {
    return Math.round(RAND() * (b - n) + n);
}
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
function shuffle(array) {
    return array.sort(function () {
        return 0.5 - RAND();
    });
}
function cloneClass(classToClone) {
    return Object.assign(Object.create(Object.getPrototypeOf(classToClone)), classToClone);
}
function fib(n) {
    let result = [0, 1];
    for (let i = 2; i <= n; i++) {
        let a = result[i - 1],
            b = result[i - 2];
        result.push(a + b);
    }
    return result[n];
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
    multiply (scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }
    magnitude () {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    truncate(max) {
        let i = max / this.magnitude(),
            velocity;
        i = i < 1 ? i : 1;
        velocity = this.multiply(i);

        return velocity;
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

        return x * x + y * y;
    }
    dist (point) {
        return Math.sqrt(this.distSquare(point));
    }
}
class Sim extends Point {
    constructor(x, y) {
        super(x, y);
        this.cache = {};
        this.solution = {};
        this.zombieKilled = 0;
        this.humanKilled = 0;

    }
    save () {
        this.cache.x = this.x;
        this.cache.y = this.y;
    }
    load () {
        this.x = this.cache.x;
        this.y = this.cache.y;
    }
    update (x, y) {
        this.x = x;
        this.y = y;
    }
    move (target) {
        this.update(this.x + target.x, this.y + target.y);
    }
    moveToZombie (id) {
        let direction = new Vector(baseVector(this, zombies[id]));
        direction = direction.truncate(MY_MOVE_RANGE);
        this.move(direction);
    }
    solve () {

        let lastScore = 0,
            score = 0,
            solution = new Solution(),
            best = new Solution();

        best.coords.x = this.x;
        best.coords.y = this.y;

        // simulate
        while (Date.now() - now < TIME) {
            sol_ct++;
            // create a solution
            if (sol_ct > 0)
                solution.randomize();
            else {
                solution.coords.x = this.x;
                solution.coords.y = this.y;
            }

            score = this.getSolutionScore(solution);

            //console.error(`x: ${solution.coords.x} y: ${solution.coords.y}`);
            //console.error(`score: ${score}`);

            if (score > lastScore) {
                lastScore = score;
                best = cloneClass(solution);
                //console.error(`best: ${best.coords.x} ${best.coords.y}`);
            }
        }
        console.error(`${this.x} ${this.y}`);
        console.error(`${best.coords.x} ${best.coords.y}`);
        this.solution.x = this.x + best.coords.x;
        this.solution.y = this.x + best.coords.y;

    }
    getSolutionScore (solution) {

        let score = 0,
            moveScore = 0,
            lastMoveScore = 0;

        this.save();
        //shuffle(zombies);

        this.move(solution);

        score += this.play();

        /*
        // TODO for further combos
        this.moveToZombie(i);
        score += this.play();
        */
        this.load();
        return score;
    }
    play() {

        let zombieLength = zombies.length,
            humanLength = humans.length;

        for (let i = 0; i < zombieLength; i++) {
            let zombiePos = new Point(zombies[i].nextX, zombies[i].nextY);

            // zombie killed?
            if (zombiePos.dist(this) <= MY_KILL_RANGE)
                this.zombieKilled++;

            // human killed?
            for (let k = 0; k < humanLength; k++)
                if (zombiePos.dist(humans[k]) <= ZOMBIE_KILL_RANGE)
                    this.humanKilled++;
        }
        return this.evaluate();

    }
    evaluate () {

        let humansAlive = humans.length - this.humanKilled,
            score = 0;

        if (this.zombieKilled > 1)
            score = humansAlive * humansAlive * 10 * fib(this.zombieKilled + 3);
        else if (this.zombieKilled === 1)
            score = humansAlive * humansAlive * 10;

        return score;

    }
}
class Human extends Point {
    constructor(id, x, y) {
        super(x, y);
        this.id = id;
        this.alive = true;
    }
    update(x, y) {
        this.x = x;
        this.y = y;
    }
}
class Zombie extends Point {
    constructor(id, x, y, nextX, nextY) {
        super(x, y);
        this.id = id;
        this.nextX = nextX;
        this.nextY = nextY;
        this.alive = true;
    }
    update(x, y, nextX, nextY) {
        this.x = x;
        this.y = y;
        this.nextX = nextX;
        this.nextY = nextY;
    }
}
class Solution {
    constructor() {
        this.coords = {};
    }
    randomize () {
        let turn = toRadians(rnd(359)),
            magnitude = rnd(MY_MOVE_RANGE),
            x = magnitude * Math.cos(turn),
            y = magnitude * Math.sin(turn);
        this.coords = {
            x: Math.round(x),
            y: Math.round(y)
        };
    }
}

let inputs = readline().split(' ');

myX = parseInt(inputs[0]);
myY = parseInt(inputs[1]);

let me = new Sim(myX, myY);

let humanCount = parseInt(readline());

for (let i = 0; i < humanCount; i++) {
    let inputs = readline().split(' '),
        x = parseInt(inputs[1]),
        y = parseInt(inputs[2]);
    humans.push(new Human(i, x, y));
}

let zombieCount = parseInt(readline());

for (let i = 0; i < zombieCount; i++) {
    let inputs = readline().split(' '),
        x = parseInt(inputs[1]),
        y = parseInt(inputs[2]),
        nextX = parseInt(inputs[3]),
        nextY = parseInt(inputs[4]);
    zombies.push(new Zombie(i, x, y, nextX, nextY));
}

// game loop
while (true) {

    round++;

    if (round > 0) {
        let inputs = readline().split(' ');

        myX = parseInt(inputs[0]);
        myY = parseInt(inputs[1]);

        me.update(myX, myY);

        humanCount = parseInt(readline());

        for (let i = 0; i < humanCount; i++) {
            let inputs = readline().split(' '),
                x = parseInt(inputs[1]),
                y = parseInt(inputs[2]);
            humans[i].update(x, y);
        }

        zombieCount = parseInt(readline());

        for (let i = 0; i < zombieCount; i++) {
            let inputs = readline().split(' '),
                x = parseInt(inputs[1]),
                y = parseInt(inputs[2]),
                nextX = parseInt(inputs[3]),
                nextY = parseInt(inputs[4]);
            zombies[i].update(x, y, nextX, nextY);
        }
    }

    now = Date.now();
    me.solve();

    console.error(`so_ct ${round === 0 ? sol_ct : sol_ct / round}`);

    console.log(`${me.solution.x} ${me.solution.y}`);

}
