"use strict";

function erf(x) {
    const ERF_A = 0.147;
    let the_sign_of_x;

    if(x === 0) {
        the_sign_of_x = 0;
        return 0;
    } else if(x > 0)
        the_sign_of_x = 1;
    else
        the_sign_of_x = -1;


    let one_plus_axSquared = 1 + ERF_A * x * x,
        four_ovr_pi_etc = 4 / Math.PI + ERF_A * x * x,
        ratio = four_ovr_pi_etc / one_plus_axSquared;

    ratio *= x * -x;

    let expRatio = Math.exp(ratio),
        radical = Math.sqrt(1-expRatio);

    return radical * the_sign_of_x;

}
/**
@param {Number} x - input value
@param {Number} mu - mean
@param {Number} sigma - standard deviation
@returns {Number} evaluated CDF
*/

function cdf(x, mu = 0, sigma = 1) {
    if( sigma === 0 ) {
        return (x < mu) ? 0 : 1;
    }
    let A = 1 / 2,
        B = sigma * Math.sqrt( 2 ),
        C = x - mu;
    return A * ( 1 + erf( C / B ) );
}

/**
 * FUNCTION: pdf( x, a, b, mu, sigma )
 *	Evaluates the probability density function (PDF) for a truncated normal distribution with endpoints `a` and `b`, location parameter `mu` and scale parameter `sigma` at a value `x`.
 *
 * @param {Number} x - input value
 * @param {Number} a - minimum support
 * @param {Number} b - maximum support
 * @param {Number} mu - location parameter
 * @param {Number} sigma - scale parameter
 * @returns {Number} evaluated PDF
 */

function pdf(x, a, b, mu, sigma) {
    if ( x < a || x > b )
        return 0;

    let s2 = Math.pow( sigma, 2 ),
        A = 1 / (Math.sqrt( 2 * s2 * Math.PI ) ),
        B = -1 / ( 2 * s2 ),
        C = cdf( (b-mu)/sigma ) - cdf( (a-mu)/sigma );

    return A * Math.exp( B * Math.pow( x - mu, 2 ) ) / C;
}
