"use strict";


const
    MY_KILL_RANGE = 2000,
    MY_MOVE_RANGE = 1000,
    ZOMBIE_KILL_RANGE = 400,
    DEPTH = 3,
    TIME = 100,
    RAND = new Alea();

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
function cloneArray(array) {
    return array.map(a => Object.assign({}, a));
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
function truncateValue(x, min, max) {
    return Math.round(Math.max(min, Math.min(max, x)));
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

        //console.error(`this: ${this.x}`);
        //console.error(`point: ${point.x}`);

        let x = this.x - point.x,
            y = this.y - point.y;

        return x * x + y * y;
    }
    dist (point) {
        return Math.sqrt(this.distSquare(point));
    }
}
class Sim extends Point {
    constructor(x, y, humans, zombies) {
        super(x, y);
        this.cache = {};
        this.endGameCache = {};
        this.solution = {};
        this.humans = cloneArray(humans);
        this.zombies = cloneArray(zombies);
        this.zombieKilled = 0;
        this.humanKilled = 0;

    }
    save () {
        this.cache.x = this.x;
        this.cache.y = this.y;
        this.cache.humans = cloneArray(this.humans);
        this.cache.zombies = cloneArray(this.zombies);
        this.cache.zombieKilled = this.zombieKilled;
        this.cache.humanKilled = this.humanKilled;
    }
    load () {
        this.x = this.cache.x;
        this.y = this.cache.y;
        this.humans = cloneArray(this.cache.humans);
        this.zombies = cloneArray(this.cache.zombies);
        this.zombieKilled = this.cache.zombieKilled;
        this.humanKilled = this.cache.humanKilled;
    }
    update (x, y, humans, zombies) {
        this.x = x;
        this.y = y;
        this.humans = cloneArray(humans);
        this.zombies = cloneArray(zombies);
    }
    saveHuman () {
        let closestDist = Infinity,
            id;

        for (let i = 0; i < this.humans.length; i ++) {
            let currentDist = this.dist(this.humans[i]);
            if (currentDist < closestDist) {
                closestDist = currentDist;
                id = i;
            }
        }
        let base = baseVector(this, this.humans[id]),
            direction = new Vector(base.x, base.y);

        //direction = direction.truncate(MY_MOVE_RANGE);
        this.solution.x = this.x + Math.round(direction.x);
        this.solution.y = this.y + Math.round(direction.y);
        this.solution.score = 'SAVE HUMANS';

    }
    move (target) {
        this.x = truncateValue(this.x + target.x, 0, 15999);
        this.y = truncateValue(this.y + target.y, 0, 8999);
    }
    moveToZombie (id) {
        let base = baseVector(this, this.zombies[id]),
            direction = new Vector(base.x, base.y);
        direction = direction.truncate(MY_MOVE_RANGE);
        this.move(direction);
    }
    solve () {

        let bestSolution = new Solution(this.x, this.y),
            turns = rnd(1, DEPTH);

        console.error(`solutionLength: ${turns}`);
        let zombiePos = new Point(this.zombies[0].nextX, this.zombies[0].nextY);
        console.error(`dist: ${this.dist(zombiePos)}`);
        console.error(`humansKilled ${this.humanKilled} zombiesKilled: ${this.zombieKilled}`);

        // simulate
        while (Date.now() - now < TIME) {

            sol_ct++;

            let solution = new Solution(this.x, this.y);

            // create a random solution
            for (let i = 0; i < turns; i++)
                solution.randomize();

            this.save();

            solution.score = this.getSolutionScore(solution);

            this.load();

            if (solution.score > bestSolution.score) {
                bestSolution = solution;
            }
        }

        if (bestSolution.score === -1)
            this.saveHuman();
        else {
            console.error(`x: ${bestSolution.coords[0].x} y: ${bestSolution.coords[0].y}`);
            this.solution.x = truncateValue(this.x + bestSolution.coords[0].x, 0, 15999);
            this.solution.y = truncateValue(this.y + bestSolution.coords[0].y, 0, 8999);
            this.solution.score = bestSolution.score;
        }
    }
    getSolutionScore (solution) {

        let score = 0,
            counter = 0,
            zombiesLength = this.zombies.length,
            solutionLength = solution.coords.length;

        // move on solution, count score on the move
        for (let i = 0; i < solutionLength; i++) {
            this.move(solution.coords[i]);
            score += this.score();
        }

        // shuffle zombies array
        shuffle(this.zombies);

        for (let i = 0; i < zombiesLength; i++) {
            if (this.zombies[i].alive) {
                let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);
                while (this.dist(zombiePos) > MY_KILL_RANGE) {
                    this.moveToZombie(i);
                    score += this.score();
                    counter++;
                }
            }
        }

        score = score / (counter + solutionLength);

        return score;
    }
    score() {

        let zombieLength = this.zombies.length,
            humanLength = this.humans.length;

        for (let i = 0; i < zombieLength; i++) {

            if (this.zombies[i].alive) {

                let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);

                // zombie killed?
                if (zombiePos.dist(this) <= MY_KILL_RANGE) {
                    this.zombieKilled++;
                    this.zombies[i].alive = false;
                }

                // human killed?
                for (let j = 0; j < humanLength; j++) {
                    if (this.humans[j].alive && zombiePos.dist(this.humans[j]) <= ZOMBIE_KILL_RANGE) {
                        this.humanKilled++;
                        this.humans[j].alive = false;
                    }
                }
            }
        }
        return this.evaluate();
    }
    evaluate () {

        let humansAlive = this.humans.length - this.humanKilled,
            score = 0;

        if (humansAlive < 2)
            score = -1;
        else if (this.zombieKilled > 1)
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
    constructor(x, y) {
        this.coords = [];
        this.simX = x;
        this.simY = y;
        this.score = -Infinity;
    }
    selectRange () {

        let rand = {
            min: 0,
            max: 359
        };

        // corner cases, side cases
        if (this.simX <= 707 && this.simY <= 707) { // top left
            rand.min = 270;
            rand.max = 359;
        } else if (this.simX >= 15293 && this.simY <= 707) { // top right
            rand.min = 180;
            rand.max = 270;
        } else if (this.simX >= 15293 && this.simY >= 8293) { // bottom right
            rand.min = 90;
            rand.max = 180;
        } else if (this.simX <= 707 && this.simY >= 8293) { // bottom left
            rand.min = 0;
            rand.max = 90;
        } else if (this.simY === 0) { // top
            rand.min = 180;
            rand.max = 359;
        } else if (this.simY === 8999) { // bottom
            rand.min = 0;
            rand.max = 180;
        } else if (this.simX === 0) {  // left
            let side = rnd(1);
            if (side === 0) {
                rand.min = 0;
                rand.max = 90;
            } else {
                rand.min = 270;
                rand.max = 359;
            }
        } else if (this.simX === 15999) { // right
            rand.min = 90;
            rand.max = 270;
        }

        return rand;
    }
    randomize () {

        let rand = this.selectRange(),
            turn = toRadians(rnd(rand.min, rand.max)),
            randMagnitude =  rnd(-0.5 * MY_MOVE_RANGE, 2 * MY_MOVE_RANGE),
            magnitude = truncateValue(randMagnitude, 0, MY_MOVE_RANGE),
            x = magnitude * Math.cos(turn),
            y = -1 * magnitude * Math.sin(turn);

        this.coords.push({
            x: Math.round(x),
            y: Math.round(y)
        });
    }
}

let lastSolution = new Solution(0,0);

let inputs = readline().split(' ');

myX = parseInt(inputs[0]);
myY = parseInt(inputs[1]);

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

let me = new Sim(myX, myY, humans, zombies);

// game loop
while (true) {

    round++;

    if (round > 0) {
        let inputs = readline().split(' ');

        myX = parseInt(inputs[0]);
        myY = parseInt(inputs[1]);

        humanCount = parseInt(readline());

        humans = humans.slice(0, humanCount);

        for (let i = 0; i < humanCount; i++) {
            let inputs = readline().split(' '),
                x = parseInt(inputs[1]),
                y = parseInt(inputs[2]);
            humans[i].update(x, y);
        }

        zombieCount = parseInt(readline());

        zombies = zombies.slice(0, zombieCount);

        for (let i = 0; i < zombieCount; i++) {
            let inputs = readline().split(' '),
                x = parseInt(inputs[1]),
                y = parseInt(inputs[2]),
                nextX = parseInt(inputs[3]),
                nextY = parseInt(inputs[4]);
            zombies[i].update(x, y, nextX, nextY);
        }

        me.update(myX, myY, humans, zombies);
    }


    now = Date.now();
    me.solve();

    console.error(`elapsed time: ${Date.now() - now}`);

    console.error(`sol_ct ${round === 0 ? sol_ct : sol_ct / (round + 1)} score: ${me.solution.score}`);

    console.error(`humans: ${humans.length} zombies: ${zombies.length}`);

    console.error(`zombie.coords: ${zombies[0].x} ${zombies[0].y}`);

    console.log(`${me.solution.x} ${me.solution.y}`);


}
