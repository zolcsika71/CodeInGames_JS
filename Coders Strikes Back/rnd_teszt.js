function rnd(n, b = 0) {
    return Math.floor(Math.random() * (b - n) + n);
}

function rnd1(a, b = 0) {
    return Math.floor(a + Math.random() * (b - a + 1));
}
function roundAngle(angle) {
    return Math.max(-18, Math.min(18, angle));
}

const
    MAX_THRUST = 100;

//console.log(Math.max(0, Math.min(MAX_THRUST, rnd(-0.5 * MAX_THRUST, 2 * MAX_THRUST))));

//console.log(roundAngle(3));


//for (let i = 0; i < 100; i++)
//    console.log(roundAngle(rnd(-40, 40)));

let a = 1,
    b = 2;

[a, b] = [b, a];

console.log(a, b);
