"use strict";

const
    MY_KILL_RANGE_SQUARE = 4000000,
    MY_MOVE_RANGE = 1000,
    ZOMBIE_KILL_RANGE_SQUARE = 160000,
    DEPTH = 3,
    TIME = 100,
    RAND = new Alea(),
    GENERATOR_RANGE = 3000;

let geneticParameters = {
        initialPoolSize: 100,
        randomNumber: 0,
        mergedNumber: 5,
        mutatedNumber: 5
    },
    round = -1,
    now,
    iterationCount = -1,
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
    return Math.max(min, Math.min(max, x));
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
        this.evaluations = 0;
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
        this.addRandomCandidates(randomNumber);
        //shuffle(this.candidates);
        this.merge(mergedNumber);
        //shuffle(this.candidates);
        this.mutate(mutatedNumber);
        this.computeScores();
        this.dropUnselected();
        return this.best();
    }
    merge (mergedNumber) {
        for (let i = 0; i < mergedNumber; i++) {
            let candidatesLength = this.candidates.length,
                firstIndex = rnd(candidatesLength - 1),
                secondIndex = (firstIndex + rnd(candidatesLength - 1)) % candidatesLength;

            this.candidates.push(this.merger(firstIndex, secondIndex));
        }
    }
    mutate (mutatedNumber) {
        for (let i = 0; i < mutatedNumber; i++)
            this.candidates.push(this.mutator());
    }
    computeScores () {

        let candidatesLength = this.candidates.length;

        for (let i = 0; i < candidatesLength; i++) {
            if (this.candidates[i].score === -Infinity) {
                this.candidates[i].score = this.evaluator(this.candidates[i]);
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
    // TODO why cloneArray is necessary?
    constructor(x, y, humans, zombies) {
        super(x, y);
        this.cache = {};
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
    getCandidateScore (candidate) {

        if (!candidate)
            return;

        this.save();

        let score = 0,
            counter = 0,
            zombiesLength = this.zombies.length,
            candidateLength = candidate.coords.length;

        // move on solution, count score on the move
        for (let i = 0; i < candidateLength; i++) {
            this.move(candidate.coords[i]);
            score += this.score(candidateLength - i);
        }

        // shuffle zombies array
        // TODO uncomment shuffle?
        shuffle(this.zombies);

        for (let i = 0; i < zombiesLength; i++) {
            if (this.zombies[i].alive) {
                let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);
                while (this.distSquare(zombiePos) > MY_KILL_RANGE_SQUARE) {
                    this.moveToZombie(i);
                    score += this.score(1);
                    counter++;
                }
            }
        }

        score = score / (counter + candidateLength);

        this.load();

        return score;
    }
    score(candidateLength) {

        let zombieLength = this.zombies.length,
            humanLength = this.humans.length;

        for (let i = 0; i < zombieLength; i++) {

            if (this.zombies[i].alive) {

                let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);

                // zombie killed?
                if (zombiePos.distSquare(this) <= MY_KILL_RANGE_SQUARE) {
                    this.zombieKilled++;
                    this.zombies[i].alive = false;
                }

                // human killed?
                // TODO check ZOMBIE_KILL_RANGE_SQUARE multiplier (ZOMBIE_KILL_RANGE_SQUARE * candidateLength * candidateLength)
                for (let j = 0; j < humanLength; j++) {
                    if (this.humans[j].alive && zombiePos.distSquare(this.humans[j]) <= ZOMBIE_KILL_RANGE_SQUARE * candidateLength * candidateLength) {
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
        // TODO check most compromised human?
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


let inputs = readline().split(' ');

myX = parseInt(inputs[0]);
myY = parseInt(inputs[1]);

humanCount = parseInt(readline());

for (let i = 0; i < humanCount; i++) {
    let inputs = readline().split(' '),
        x = parseInt(inputs[1]),
        y = parseInt(inputs[2]);
    humans.push(new Human(i, x, y));
}

zombieCount = parseInt(readline());

for (let i = 0; i < zombieCount; i++) {
    let inputs = readline().split(' '),
        x = parseInt(inputs[1]),
        y = parseInt(inputs[2]),
        nextX = parseInt(inputs[3]),
        nextY = parseInt(inputs[4]);
    zombies.push(new Zombie(i, x, y, nextX, nextY));
}

let me = new Sim(myX, myY, humans, zombies),
    genetic = new GeneticAlgorithm(),
    best = new Candidate(0);

genetic.generator = {

    // TODO it costs 3-7 rnd

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

    // TODO it costs 4 rnd

    if (!genetic.candidates)
        return;

    let candidatesLength = genetic.candidates.length,
        id  = candidatesLength,
        //zip = (a, b) => a.length ? [a[0], ...zip(b, a.slice(1))] : b,
        //candidateCoords = zip(genetic.candidates[firstIndex].coords, genetic.candidates[secondIndex].coords),
        candidateCoords = genetic.candidates[firstIndex].coords.concat(genetic.candidates[secondIndex].coords),
        candidateCoordsLength = candidateCoords.length,
        //candidateLength = rnd(1, candidateCoords.length);
        indexStart = rnd(candidateCoordsLength - 1),
        candidateLength = indexStart === candidateCoordsLength - 1 ? 1 : rnd(1, DEPTH);

    candidateCoords = candidateCoords.slice(indexStart, indexStart + candidateLength);
    //candidateCoords = candidateCoords.slice(0, candidateLength);

    let candidate = new Candidate(id);

    candidate.coords = candidateCoords;

    return candidate;

};
genetic.mutator = () => {

    // TODO it costs 4 rnd

    if (!genetic.candidates)
        return;

    let id = genetic.candidates.length,
        randomPosition = genetic.generator.createRandomPosition(),
        candidateIndex = rnd(0, genetic.candidates.length - 1),
        candidateStep = rnd(0, genetic.candidates[candidateIndex].coords.length - 1),
        candidateCoords = cloneArray(genetic.candidates[candidateIndex].coords);

    //console.error(`candidateIndex: ${candidateIndex} candidate: ${BB(genetic.candidates[candidateIndex])}`);

    candidateCoords[candidateStep].x = Math.round(randomPosition.x);
    candidateCoords[candidateStep].y = Math.round(randomPosition.y);

    let candidate = new Candidate(id);

    candidate.coords = candidateCoords;

    //console.error(`mutator candidate: ${BB(candidate)}`);

    return candidate;


};
genetic.evaluator = (candidate) => me.getCandidateScore(candidate);

genetic.initialize(geneticParameters.initialPoolSize);


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

    let poolLength = 0;

    while (Date.now() - now < TIME) {

        iterationCount++;

        poolLength = genetic.candidates.length;

        geneticParameters.randomNumber = geneticParameters.initialPoolSize - poolLength < 0 ? geneticParameters.randomNumber : geneticParameters.initialPoolSize - poolLength;

        let solution = genetic.iterate(geneticParameters.randomNumber, geneticParameters.mergedNumber, geneticParameters.mutatedNumber);

        if (solution.score > best.score)
            best = solution;
    }

    console.error(`elapsed time: ${Date.now() - now}`);

    console.error(`iterations ${round === 0 ? iterationCount : iterationCount / (round + 1)} score: ${best.score} evaluations: ${genetic.evaluations}`);

    console.error(`poolSize: ${poolLength}`);

    genetic.resetScores();

    let x = truncateValue(myX + best.coords[0].x,  0, 15999),
        y = truncateValue(myY + best.coords[0].y,  0, 8999);

    console.log(`${x} ${y}`);



}

