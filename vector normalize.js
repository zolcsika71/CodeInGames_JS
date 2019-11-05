"use strict";

var Vector = (function () {
    function Vector(pX, pY, pZ) {
        this.setX(pX);
        this.setY(pY);
        this.setZ(pZ);

    }
    Vector.prototype.getX = function () {
        return this.mX;
    };
    Vector.prototype.setX = function (pX) {
        this.mX = pX;
    };
    Vector.prototype.getY = function () {
        return this.mY;
    };
    Vector.prototype.setY = function (pY) {
        this.mY = pY;
    };
    Vector.prototype.getZ = function () {
        return this.mZ;
    };
    Vector.prototype.setZ = function (pZ) {
        this.mZ = pZ;
    };

    Vector.prototype.add = function (v) {
        return new Vector(this.getX() + v.getX(), this.getY() + v.getY(), this.getZ() + v.getZ());
    };

    Vector.prototype.subtract = function (v) {
        return new Vector(this.getX() - v.getX(), this.getY() - v.getY(), this.getZ() - v.getZ());
    };

    Vector.prototype.multiply = function (scalar) {
        return new Vector(this.getX() * scalar, this.getY() * scalar, this.getZ() * scalar);
    };

    Vector.prototype.divide = function (scalar) {
        return new Vector(this.getX() / scalar, this.getY() / scalar, this.getZ() /scalar);
    };

    Vector.prototype.magnitude = function () {
        return Math.sqrt(this.getX() * this.getX() + this.getY() * this.getY() + this.getZ() + this.getZ())
    };


    //this is the vector I have tried for the normalisation
    Vector.prototype.normalisedVector = function () {
        var mag = this.magnitude();
        return new Vector(this.mX / mag, this.mY / mag, this.mZ / mag);
    };
    return Vector;
}());
