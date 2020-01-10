"use strict";

const
    MY_KILL_RANGE = 2000,
    MY_MOVE_RANGE = 1000,
    ZOMBIE_KILL_RANGE = 400,
    DEPTH = 3,
    TIME = 100,
    RAND = new Alea(),
    GENETIC = {
        initialPoolSize: 100,
        randomNumber: 5,
        mergedNumber: 5,
        mutatedNumber: 5
    };

let round = -1,
    now,
    sol_ct = -1,
    humans = [],
    zombies = [],
    humanCount,
    zombieCount,
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
function shuffle(array) {
    return array.sort(function () {
        return 0.5 - RAND();
    });
}
function baseVector(point1, point2) {
    return {
        x: point2.x - point1.x,
        y: point2.y - point1.y
    };
}
function cloneArray(array) {
    return array.map(a => Object.assign({}, a));
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
class Candidate {
    constructor(id) {
        this.id = id;
        this.score = -Infinity;
        this.coords = [];
    }
}
class GeneticAlgorithm {
    constructor() {
        this.candidates = [];
        this.evaluations = 0; // TODO is it necessary?
    }
    best () {
        if (this.candidates.length > 0)
            return this.candidates.reduce((p, c) => p.score > c.score ? p : c);
        else
            return new Candidate(0);
    }
    initialize (initialPoolSize) {
        this.candidates = [];
        this.addRandomCandidates(initialPoolSize);
    }
    resetScores () {
        for (let candidate of this.candidates)
            candidate.score = -Infinity;
    }
    addRandomCandidates(numberOfCandidates) {
        for (let i = 0; i < numberOfCandidates; i++)
            this.candidates.push(this.generator.run(i));
    }
    iterate (randomNumber, mergedNumber, mutatedNumber) {
        return this.runOneIteration(randomNumber, mergedNumber, mutatedNumber);
    }
    runOneIteration (randomNumber, mergedNumber, mutatedNumber) {
        // TODO shuffle?
        this.addRandomCandidates(randomNumber);
        shuffle(this.candidates);
        this.merge(mergedNumber);
        //shuffle(this.candidates);
        this.mutate(mutatedNumber);
        this.computeScores();
        this.dropUnselected();
        return this.best();
    }
    merge (mergedNumber) {
        for (let i = 0; i < mergedNumber; i++) {
            let firstIndex = (2 * i) % this.candidates.length,
                secondIndex = (2 * i + 1) % this.candidates.length;

            //console.error(`length: ${this.candidates.length} firstIndex: ${firstIndex} secondIndex: ${secondIndex}`);

            this.candidates.push(this.merger(firstIndex, secondIndex));
        }
    }
    mutate (mutatedNumber) {
        for (let i = 0; i < mutatedNumber; i++)
            this.candidates.push(this.mutator());
    }
    computeScores () {

        let candidatesLength = this.candidates.length;

        //console.error(`merger: ${BB(this.candidates[105])}`);

        for (let i = 0; i < candidatesLength; i++) {
            if (this.candidates[i].score === -Infinity) {
                //console.error(`candidate: ${BB(this.candidates[i])}`);
                this.candidates[i].score = this.evaluator(this.candidates[i]);
                //console.error(`i: ${i} score: ${this.candidates[i].score}`);
                this.evaluations++;
            }
        }
    }
    dropUnselected () {
        this.candidates = this.candidates.filter(candidate => candidate.score > -1);
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
    getSolutionScore (candidate) {

        if (!candidate)
            return;

        this.save();

        //console.error(`candidates:`);

        let score = 0,
            counter = 0,
            zombiesLength = this.zombies.length,
            candidateLength = candidate.coords.length;

        // move on solution, count score on the move
        for (let i = 0; i < candidateLength; i++) {
            //console.error(`moveTo: ${BB(candidate.coords[i])}`);
            this.move(candidate.coords[i]);
            score += this.score();
        }
        //console.error(`score: ${score}`);

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

        score = score / (counter + candidateLength);

        console.error(`id: ${candidate.id} score: ${score} steps: ${counter + candidateLength}`);

        this.load();

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
        //console.error(`humanKilled: ${this.humanKilled} zombieKilled: ${this.zombieKilled} score: ${this.evaluate()}`);
        return this.evaluate();
    }
    evaluate () {

        let humansAlive = this.humans.length - this.humanKilled,
            score = 0;

        if (humansAlive < 1)
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

myX = 0;
myY = 0;
humanCount = 1;
zombieCount = 1;
humans.push(new Human(0, 8250, 4500));
zombies.push(new Zombie(0, 8250, 8999, 8250, 8599));

let me = new Sim(myX, myY, humans, zombies),
    genetic = new GeneticAlgorithm,
    best = new Candidate(0);

genetic.generator = {
    run: function (id) {
        let candidate = new Candidate(id),
            r = rnd(1, 3);

        for (let i = 0; i < r; i++) {

            let randomPosition = this.createRandomPosition();

            candidate.coords.push({
                x: Math.round(randomPosition.x),
                y: Math.round(randomPosition.y)
            });
        }
        return candidate;
    },
    createRandomPosition: function () {
        // TODO try 2000
        let x = rnd(-GENERATOR_RANGE, GENERATOR_RANGE),
            y = rnd(-GENERATOR_RANGE, GENERATOR_RANGE),
            centerPosition = new Point(0, 0),
            randomPosition = new Point(x, y),
            base = baseVector(centerPosition, randomPosition),
            direction = new Vector(base.x, base.y);

        return direction.truncate(MY_MOVE_RANGE);
    }
};
genetic.merger = (firstIndex, secondIndex) => {

    if (!genetic.candidates)
        return;

    //console.error(`running merger`);
    //console.error(`first: ${BB(genetic.candidates[firstIndex])} second: ${BB(genetic.candidates[secondIndex])}`);

    let id = genetic.candidates.length,
        candidateLength = rnd(1, DEPTH),
        candidateCoords = genetic.candidates[firstIndex].coords.concat(genetic.candidates[secondIndex].coords);

    //console.error(`candidateCoords: ${BB(candidateCoords)}`);

    shuffle(candidateCoords);

    candidateCoords = candidateCoords.slice(0, candidateLength);

    let candidate = new Candidate(id);

    candidate.coords = candidateCoords;

    //console.error(`return candidate: ${BB(candidate)}`);

    return candidate;

};
genetic.mutator = () => {

    if (!genetic.candidates)
        return;

    let id = genetic.candidates.length,
        randomPosition = genetic.generator.createRandomPosition(),
        candidateIndex = rnd(0, genetic.candidates.length - 1),
        candidateStep = rnd(0, genetic.candidates[candidateIndex].coords.length - 1),
        candidateCoords = cloneArray(genetic.candidates[candidateIndex].coords);

    candidateCoords[candidateStep].x = randomPosition.x;
    candidateCoords[candidateStep].y = randomPosition.y;

    let candidate = new Candidate(id);

    candidate.coords = candidateCoords;

    //console.error(`mutator candidate: ${BB(candidate)}`);

    return candidate;


};
genetic.evaluator = (candidate) => me.getSolutionScore(candidate);

genetic.initialize(GENETIC.initialPoolSize);




round++;

now = Date.now();

while (Date.now() - now < TIME) {

    sol_ct++;

    let solution = genetic.iterate(GENETIC.randomNumber, GENETIC.mergedNumber, GENETIC.mutatedNumber);

    if (solution.score > best.score)
        best = solution;

    console.error(`sol.score: ${solution.score} best.score: ${best.score} best.id: ${best.id}`);
    //console.error(`x: ${solution.coords[0].x} y: ${solution.coords[0].y}`);
}

console.error(`elapsed time: ${Date.now() - now}`);

console.error(`sol_ct ${round === 0 ? sol_ct : sol_ct / (round + 1)} score: ${best.score} evaluations: ${genetic.evaluations}`);

console.error(`best.id ${best.id}`);

console.log(`${best.coords[0].x} ${best.coords[0].y}`);


genetic.resetScores();



