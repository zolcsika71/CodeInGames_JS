function PID(p, i, d) {
    this.sampleTime = 100;
    this.target = 0;
    this.output = 0;

    this.errorSum = 0;
    this.lastInput = 0;
    this.lastTime = Date.now() - this.sampleTime;

    this.setTunings(p, i, d)
}

PID.prototype.setTunings = function(p, i, d) {
    let ratio = this.sampleTime / 1000;

    this.p = p;
    this.i = i * ratio;
    this.d = d / ratio;
};

PID.prototype.setSampleTime = function(sampleTime) {
    let ratio = sampleTime / this.sampleTime;

    this.i *= ratio;
    this.d /= ratio;
    this.sampleTime = sampleTime;
};

PID.prototype.setOutputLimits = function(min, max) {
    this.min = min;
    this.max = max;
};

PID.prototype.setTarget = function(value) {
    this.target = value
};

PID.prototype.compute = function(input) {
    let now = Date.now(),
        timeDiff = now - this.lastTime;

    if (timeDiff >= this.sampleTime) {
        let error = this.target - input,
            inputDiff = input - this.lastInput;

        this.errorSum = Math.max(this.min, Math.min(this.max, this.errorSum + (this.i * error)));
        this.output = Math.max(this.min, Math.min(this.max, (this.p * error) + this.errorSum - (this.d * inputDiff)));
        this.lastInput = input;
        this.lastTime = now;
    }

    return this.output
};

let pid = new PID(0.03, 0, 0.02);
pid.setSampleTime(1000);
pid.setOutputLimits(-100, 100);
pid.setTarget(0);

let processVariable = 3000;

setInterval(function () {

    let output = pid.compute(processVariable) * -1;
    console.log(`in: ${processVariable} out: ${output}`);
    processVariable -= 100;
}, 500);
