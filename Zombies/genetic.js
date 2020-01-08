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


function toRadians(degrees) {
    return degrees * (Math.PI / 180);
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
    }
    best () {
        return this.candidates[0];
    }
    initialize (initialPoolSize) {
        this.candidates = [];
        this.addRandomCandidates(initialPoolSize);
    }
    addRandomCandidates(initialPoolSize) {
        let candidatesLength = this.candidates.length;
        for (let i = candidatesLength; i < candidatesLength + initialPoolSize; i++)
            this.candidates.push(this.generator(i));

    }
    iterate (numberOfIterations, iterationAdditionalRandomGenerated, selectionNumber, mergedNumber, mutatedNumber) {
        for (i = 0; i < numberOfIterations; i++)
            this.runOneIteration(iterationAdditionalRandomGenerated, selectionNumber, mergedNumber, mutatedNumber);
    }
    runOneIteration (iterationAdditionalRandomGenerated, selectionNumber, mergedNumber, mutatedNumber) {
        this.addRandomCandidates(iterationAdditionalRandomGenerated);
        shuffle(this.candidates);
        this.merge(mergedNumber);
        shuffle(this.candidates);
        this.mutate(mutatedNumber);


    }
    merge (mergedNumber) {
        for (i = 0; i < mergedNumber; i++) {
            let firstIndex = (2 * i) % this.candidates.length,
                secondIndex = (2 * i + 1) % this.candidates.length;

            this.candidates.push(this.merger(firstIndex, secondIndex));
        }
    }
    mutate (mutatedNumber) {
        for (i = 0; i < mutatedNumber; i++)
            this.candidates.push(this.mutator());
    }
    merger (firstIndex, secondIndex) {

        let id = this.candidates.length,
            candidateLength = rnd(1, DEPTH),
            candidateCoords = this.candidates[firstIndex].push(...this.candidates[secondIndex]);

        shuffle(candidateCoords);

        candidateCoords = candidateCoords.slice(0, candidateLength);

        let candidate = new Candidate(id);

       candidate.coords = candidateCoords;

       return candidate;

    }
    mutator () {

        let id = this.candidates.length,
            randomPosition = this.createRandomPosition(),
            candidateIndex = rnd(1, this.candidates.length),
            candidateStep = rnd(1, this.candidates[candidateIndex].coords.length),
            candidateCoords = cloneArray(this.candidates[candidateIndex].coords);

        candidateCoords[candidateStep].x = randomPosition.x;
        candidateCoords[candidateStep].y = randomPosition.y;

        let candidate = new Candidate(id);

        candidate.coords = candidateCoords;

        return candidate;


    }
    generator (id) {
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
    };
    createRandomPosition () {

        let x = rnd(-1000, 1000),
            y = rnd(-1000, 1000),
            centerPosition = new Point(0, 0),
            randomPosition = new Point(x, y),
            base = baseVector(centerPosition, randomPosition),
            direction = new Vector(base.x, base.y);

        return direction.truncate(MY_MOVE_RANGE);
    }
    computeScores () {

        let candidatesLength = this.candidates.length;

        for (let i = 0; i < candidatesLength; i++) {
            if (this.candidates[i].score === -Infinity)
                this.candidates[i].score = this.fitnessFunction(this.candidates[i])
        }

    };
    fitnessFunction (candidate) {


    }

}
