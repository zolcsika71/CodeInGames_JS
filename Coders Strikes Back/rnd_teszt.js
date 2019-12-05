function rnd(n, b = 0) {
    return Math.round(Math.random() * (b - n) + n);
}
function roundAngle(angle) {
    return Math.max(-18, Math.min(18, angle));
}

const
    MAX_THRUST = 100;

console.log(Math.max(0, Math.min(MAX_THRUST, rnd(-0.5 * MAX_THRUST, 2 * MAX_THRUST))));

//console.log(roundAngle(3));
