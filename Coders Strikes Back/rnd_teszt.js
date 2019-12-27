function rnd(n, b = 0) {
    return Math.round(rand() * (b - n) + n);
}

function rnd1(a, b = 0) {
    return Math.floor(a + Math.random() * (b - a + 1));
}
function roundAngle(angle) {
    return Math.max(-18, Math.min(18, angle));
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

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function BB(x) {
    return JSON.stringify(x, null, 2);
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

//console.log(fib(5));




const
    MY_MOVE_RANGE = 1000,
    PI = Math.PI,
    ANGLES = [0, PI / 4, PI / 2, (PI * 3) / 4, PI, (PI * 5) / 4, (PI * 6) / 4, (PI * 7) / 4];

let rand = Alea(),
    array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];



//console.log(Math.max(0, Math.min(MAX_THRUST, rnd(-0.5 * MAX_THRUST, 2 * MAX_THRUST))));

//console.log(roundAngle(3));

/*
for (let i = 0; i < 100; i++)
    console.log(rnd(-5, 5));
*/
/*
for (let i = 0; i < 8; i++) {
    let magnitude = 1000,
        x = Math.round(magnitude * Math.cos(ANGLES[i])),
        y = -1 * Math.round(magnitude * Math.sin(ANGLES[i]));

    console.log(`turn: ${i} magnitude: ${magnitude} x: ${x} y: ${y}`);
}
*/
/*
let shuffled = array.sort(function () {
    return 0.5 - Math.random()
});

console.log(`${BB(array)}`);
console.log(`${BB(shuffled)}`);
*/


