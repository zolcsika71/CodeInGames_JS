class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add (vector) {
        return new Vector(this.x + vector.x, this.y + vector.y);
    }
    subtract (vector) {
        return new Vector(this.x - vector.x, this.y - vector.y);
    }
    multiply (scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }
    magnitude () {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    divide (scalar) {
        return new Vector(Math.round(this.x / scalar), Math.round(this.y / scalar));
    }
    normalisedVector () {
        return this.divide(this.magnitude());
    }
    truncate(max) {
        let i = max / this.magnitude(),
            velocity;
        i = i < 1 ? i : 1;
        velocity = this.multiply(i);

        return velocity;
    }
    dot (vector) {
        return this.x * vector.x + this.y * vector.y;
    }
    angleTo (vector) {
        let dot = this.dot(vector),
            m1 = this.magnitude(),
            m2 = vector.magnitude(),
            angleRadian = dot === 0 ? 0 : Math.acos(dot / (m1 * m2));

        //console.error(`stuff: ${dot} ${m1} ${m2}`);

        return Math.round(toDegrees(angleRadian));
    }
}

class PID {
    constructor (p, i, d) {
        this.p = p;
        this.i = i;
        this.d = d;
        this.min = -100;
        this.max = 100;
        this.target = 0;
        this.errorSum = 0;
        this.output = 0;
        this.lastInput = 0;
    }
    compute (input) {
        let error = this.target - input,
            inputDiff = input - this.lastInput;

        this.errorSum = Math.max(this.min, Math.min(this.max, this.errorSum + (this.i * error)));
        this.output = Math.max(this.min, Math.min(this.max, (this.p * error) + this.errorSum - (this.d * inputDiff)));
        this.lastInput = input;

        return this.output;

    }
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
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

function BB(x) {
    return JSON.stringify(x, null, 2);
}

function shuffle(array) {
    return array.sort(function () {
        return 0.5 - RAND();
    });
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
