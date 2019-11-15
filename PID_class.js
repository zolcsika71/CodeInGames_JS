"use strict";

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

let pid = new PID(0.03, 0, 0.02),
    processVariable = 1300;



for (let dist = processVariable; dist > 0; dist -= 100) {
    let output = pid.compute(dist) * -1;
    console.log(`in: ${dist} out: ${output}`);
}

