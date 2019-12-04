function rnd(n, b = 0) {
    return Math.round(Math.random() * (b - n) + n);
}
function roundAngle(angle) {
    return Math.max(-18, Math.min(18, angle));
}

console.log(rnd(-50, 200));

//console.log(roundAngle(3));
