"use strict";

function erf(x) {
    const ERF_A = 0.147;
    let the_sign_of_x;

    if (x === 0) {
        the_sign_of_x = 0;
        return 0;
    } else if (x > 0)
        the_sign_of_x = 1;
    else
        the_sign_of_x = -1;


    let one_plus_axSquared = 1 + ERF_A * x * x,
        four_ovr_pi_etc = 4 / Math.PI + ERF_A * x * x,
        ratio = four_ovr_pi_etc / one_plus_axSquared;

    ratio *= x * -x;

    let expRatio = Math.exp(ratio),
        radical = Math.sqrt(1 - expRatio);

    return radical * the_sign_of_x;

}

/**
 *
 * @param x
 * @param gauss
 * @returns {number}
 */

function cdf(x, gauss) {
    return 0.5 * (1 + erf((x - gauss.mu) / (Math.sqrt(2 * gauss.sigma))));
}

/**
 *
 * @param gauss (a: min x, b: max x, mu: location parameter, sigma: scale parameter
 * @param x
 * @returns {number} evaluated pdf
 */

function pdf(x, gauss) {
    if (x < gauss.a || x > gauss.b)
        return 0;

    let s2 = Math.pow(gauss.sigma, 2),
        A = 1 / (Math.sqrt(2 * s2 * Math.PI)),
        B = -1 / (2 * s2),
        //C = cdf((gauss.b - gauss.mu) / gauss.sigma, gauss.mu, gauss.sigma) - cdf((gauss.a - gauss.mu) / gauss.sigma, gauss.mu, gauss.sigma);
        C = cdf((gauss.b - gauss.mu) / gauss.sigma, gauss) - cdf((gauss.a - gauss.mu) / gauss.sigma, gauss);

    return A * Math.exp(B * Math.pow(x - gauss.mu, 2)) / C;
}

let type = 'flee',
    disabledAngle = 90,
    dist = 1800,
    gauss = {
    far: { // x: angle
        a: -90, // min x
        b: 90, // max x
        mu: 0, // location parameter
        sigma: 30 // scale parameter
    },
    break: { // x: speed
        a: 0, // min x
        b: 600, // max x
        mu: 0, // location parameter
        sigma: 100 // scale parameter
    },
    flee: { // x: speed
        a: 0, // min x
        b: dist, // max x
        mu: 0, // location parameter
        sigma: 700 // scale parameter
    },
    targetRadius: { // x: targetRadius
        a: -90, // min x
        b: 90, // max x
        mu: 0, // location parameter
        sigma: 20 // scale parameter
    }
},
    gaussConst = {
        far: 100 / pdf(0, gauss.far),
        break: 100 / pdf(gauss.break.a, gauss.break),
        targetRadius: 350 / pdf(0, gauss.targetRadius),
        flee: 100 / pdf(0, gauss.flee)
    };

switch (type) {

    case "radius":
        for (let x = -disabledAngle; x <= disabledAngle; x += 10) {
            console.log(x, pdf(x, gauss.targetRadius) * gaussConst.targetRadius)
        }
        break;
    case "far":
        for (let x = -disabledAngle; x <= disabledAngle; x += 5) {
            console.log(x, pdf(x, gauss.far) * gaussConst.far)
        }
        break;
    case "break":
        for (let x = 0; x <= 600; x += 50) {
            console.log(x, pdf(x, gauss.break) * gaussConst.break)
        }
        break;
    case "flee":
        for (let x = 0; x <= dist; x += 100) {
            console.log(x, 100 - pdf(x, gauss.flee) * gaussConst.flee)
        }
        break;
}

