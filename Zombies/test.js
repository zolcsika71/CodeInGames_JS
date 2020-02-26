"use strict";

const
    RAND = Alea(),
    DEPTH = 3,
    MY_KILL_RANGE = 2000,
    MY_MOVE_RANGE = 1000;

function BB(x) {
    return JSON.stringify(x, null, 2);
}
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
function toDegrees(radians) {
    return radians * (180 / Math.PI);
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
function baseVector(point1, point2) {
    return {
        x: point2.x - point1.x,
        y: point2.y - point1.y
    };
}
function cloneObject(objectToClone) {
    return Object.assign(Object.create(Object.getPrototypeOf(objectToClone)), objectToClone);
}
function cloneArray(array) {
    return array.map(a => Object.assign({}, a));
}
class Zombie {
    constructor() {
        this.alive = true;
    }
}



//for (let i = 0; i < 50; i++)
//    console.log(Math.max(0, Math.min(MY_MOVE_RANGE, rnd(-0.1 * MY_MOVE_RANGE, 2 * MY_MOVE_RANGE))));


let candidates = [];

let candidate1 = [
        {
            x: 10,
            y: 11
        },
        {
            x: 20,
            y: 21
        },
        {
            x: 30,
            y: 31
        }
    ],
    candidate2 = [
        {
            x: 0,
            y: 1
        },
        {
            x: 2,
            y: 3
        },
        {
            x: 4,
            y: 5
        }
    ];

candidates.push(candidate1);
candidates.push(candidate2);

let merger = (firstIndex, secondIndex) => {

    let candidatesLength = candidates.length,
        candidateCoords = candidates[firstIndex].concat(candidates[secondIndex]),
        candidateCoordsLength = candidateCoords.length,
        //indexStart = 4,
        //candidateLength = 3;
        indexStart = rnd(candidateCoordsLength - 1),
        candidateLength = indexStart === candidateCoordsLength - 1 ? 1 : rnd(1, 3);

    console.error(`candidateCoordsLength: ${candidateCoordsLength} indexStart: ${indexStart} candidateLength: ${candidateLength}`);

    candidateCoords = candidateCoords.slice(indexStart, indexStart + candidateLength);




    return candidateCoords;

};

//let candidate = merger (0, 1);
//console.log(`${BB(candidate)}`);

/*
let candidateCoords = candidates[0].concat(candidates[1]);
console.log(`${BB(candidateCoords)}`);
*/


let candidateLength = 3,
    zip = (a, b) => a.length ? [a[0], ...zip(b, a.slice(1))] : b,
    candidate = zip(candidates[0], candidates[1]);

console.log(`${BB(candidate.slice(0, candidateLength))}`);


/*
console.log(BB(candidates));

let first = cloneObject(candidates[0]),
    second = cloneObject(candidates[1]);

[first.x, second.y] = [second.y, first.x];
[second.x, first.y] = [first.y, second.x];
*/



