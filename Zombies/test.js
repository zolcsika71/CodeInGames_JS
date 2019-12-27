"use strict";

const
    RAND = Alea(),
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



let zombie = [
    {id: 0}, {id: 1}, {id: 2}, {id: 3}, {id: 4},
],
    filteredBy = [2, 3];

function reduce(array, idArray) {
    return array.filter(arrayElement => {
        return !idArray.some(idArrayElement => {
            return idArrayElement === arrayElement.id;
        })
    })
}
//console.log(`${reduce(zombie, filteredBy)}`);

class Solution {
    constructor(x, y) {
        this.coords = {};
        this.simX = x;
        this.simY = y;
    }
    randomize () {
        let turn = toRadians(315),
            magnitude = Math.max(0, Math.min(MY_MOVE_RANGE, rnd(-0.5 * MY_MOVE_RANGE, 2 * MY_MOVE_RANGE))),
            x = magnitude * Math.cos(turn),
            y = -1 * magnitude * Math.sin(turn);
        this.coords = {
            x: Math.round(x),
            y: Math.round(y)
        };
        console.log(`magnitude ${magnitude}`);
    }
}
/*
let sol = new Solution(0, 0);
for (let i = 0; i < 50; i++) {
    sol.randomize();
    //console.log(`x: ${sol.coords.x} y: ${sol.coords.y}`);
}
*/

let position = {
        x: 0,
        y: 9000
    },
    target = {
        x: 2000,
        y: 7000
    };


function count(position, target) {
    let base = baseVector(position, target),
        direction = new Vector(base.x, base.y);
    console.log(`dir: ${base.x}, ${base.y}`);
    direction = direction.truncate(MY_KILL_RANGE);
    return direction;
}

console.log(`x: ${position.x + count(position, target).x} y: ${position.y + count(position, target).y}`);





