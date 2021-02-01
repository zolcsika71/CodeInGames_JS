'use strict';

/*

A boost is in fact an acceleration of 650.

How exactly works thrust?
Why max_speed(thrust) is equal to 51 if thrust =10
And for thrust =10+n10
max_speed(thrust) = 51+57n
(checking by hand)
 */

const
	collisionDistToOpp = 850, // pod radius * 2
	collisionThreshold = 200, // opponent velocity - my velocity > collisionThreshold
	targetRadius = 350, // Distance starting from the middle of the checkpoint for the racer to aim for
	maxThrust = 100,
	breakDist = 1800,
	minSpeedToBreak = 350,
	fleeDist = 1800,
	disabledAngle = 90,
	p = 0.03,
	i = 0,
	d = 0.02,
	gauss = {
		far: { // x: angle
			a: -90, // min x
			b: 90, // max x
			mu: 0, // location parameter
			sigma: 100 // scale parameter
		},
		break: { // x: maxSpeed
			a: 0, // min x
			b: 600, // max x
			mu: 0, // location parameter
			sigma: 100 // scale parameter
		},
		targetRadius: { // x: targetRadius
			a: -90, // min x
			b: 90, // max x
			mu: 0, // location parameter
			sigma: 20 // scale parameter
		},
		flee: { // x: maxSpeed
			a: 0, // min x
			b: fleeDist, // max x
			mu: 0, // location parameter
			sigma: 700 // scale parameter
		}
	};

function baseVector(point1, point2) {
	return new Vector(point2.x - point1.x, point2.y - point1.y);
}
function nextIndex(index, array) {
	return index + 1 === array.length ? 0 : index + 1;
}
function lastIndex(index, array) {
	return index - 1 < 0 ? array.length : index - 1;

}
function toDegrees(radians) {
	return radians * (180 / Math.PI);
}
function toRadians(degrees) {
	return degrees * (Math.PI / 180);
}
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
	rotate(angle) {
		let radian = toRadians(angle),
			sinAngle = Math.sin(radian),
			cosAngle = Math.cos(radian);
		return new Vector(this.x * cosAngle - this.y * sinAngle, this.y * cosAngle + this.x * sinAngle);
	}
}
class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	distSquare (point) {
		let x = this.x - point.x,
			y = this.y - point.y;

		return Math.pow(x, 2) + Math.pow(y, 2);
	}
	dist (point) {
		return Math.sqrt(this.distSquare(point));
	}
	heading (point, abs = true) {
		let baseV = baseVector(this, point),
			xVector = abs ? new Vector(Math.abs(baseV.x), 0) : new Vector(baseV.x, 0);

		return xVector.angleTo(baseV);
	}
	closest (pointA, pointB) { // find the closest point on a line (described by two points) to my point.
		let da = pointB.y - pointA.y,
			db = pointA.x - pointB.x,
			c1 = da * pointA.x + db * pointA.y,
			c2 = -db * this.x + da * this.y,
			det = Math.pow(da, 2) + Math.pow(db, 2),
			cx,
			cy;
		if (det !== 0) { // point on the line
			cx = (da * c1 - db * c2) / det;
			cy = (da * c2 + db * c1) / det;
		} else { // The point is already on the line
			cx = this.x;
			cy = this.y;
		}
		return new Point(cx, cy);
	}
}
class Checkpoint extends Point {
	constructor(x, y, angle, dist) {
		super(x, y);
		this.x = x;
		this.y = y;
		this.pos = {
			x: this.x,
			y: this.y
		};
		this.radius = 600;
		this.angle = angle;
		this.distance = dist;
		this.farest = false;
		this.distanceFromPrevCheckPoint = 0;
	}
}
class Pod extends Point {
	constructor(x, y) {
		super(x, y);
		this.x = x;
		this.y = y;
		this.radius = 400;
		this.shield = false;
		this.shieldTimer = 0;
	}
	setPod (position, lastPosition, target) {
		this.x = position.x;
		this.y = position.y;
		this.position = position;
		this.lastPosition = lastPosition;
		this.target = target;
	}
	pos () {
		return new Vector(this.x, this.y);
	}
	targetPos () {
		return new Vector(this.target.x, this.target.y);
	}
	velocity () {
		return baseVector(this.lastPosition, this.position);
	}
	seekDesiredVelocity () {
		return this.targetPos().subtract(this.pos());
	}
	seekSteeringForce () {
		return this.shield ? this.seekDesiredVelocity().subtract(this.velocity()).divide(10) : this.seekDesiredVelocity().subtract(this.velocity());
	}
	calculatedSeekVelocity () {
		//return this.velocity().add(this.seekSteeringForce()).normalisedVector().multiply(maxVelocity);
		//return this.velocity().add(this.seekSteeringForce()).truncate(maxVelocity);
		return this.velocity().add(this.seekSteeringForce());
	}
	acceleration () {
		return this.seekSteeringForce().truncate(this.velocity().magnitude());
	}
	nextSeekPos () {
		let velocity = this.velocity().add(this.acceleration()).multiply(0.85);
		//console.error(`velocity -> x: ${velocity.x} y: ${velocity.y}`);
		return this.pos().add(velocity);


	}
	fleeDesiredVelocity () {
		return this.seekDesiredVelocity().multiply(-1);
	}
	fleeSteeringForce () {
		return this.shield ? this.fleeDesiredVelocity().subtract(this.velocity()).divide(10) : this.fleeDesiredVelocity().subtract(this.velocity());
	}
	calculatedFleeVelocity () {

		//console.error(`FLEE steeringForce: ${this.fleeSteeringForce().x} ${this.fleeSteeringForce().y}`);

		let velocity = this.velocity().add(this.fleeSteeringForce()).truncate(this.velocity().magnitude());
		//console.error(`FLEE velocity: ${velocity.x} ${velocity.y} magnitude: ${velocity.magnitude()}`);

		//if (velocityMagnitude > maxVelocity)
		//    velocity = velocity.truncate(maxVelocity);

		return velocity;
	}
	nextFleePos () {
		return this.pos().add(this.calculatedFleeVelocity());
	}
	arrivalVelocity () {
		let velocity = this.velocity().add(this.calculatedFleeVelocity()),
			position = this.nextFleePos(),
			desiredVelocity = this.targetPos().subtract(position),
			distance = desiredVelocity.magnitude();

		if (distance < breakDist)
			desiredVelocity = desiredVelocity.normalisedVector().multiply(maxThrust).multiply(distance / breakDist);
		else
			desiredVelocity = desiredVelocity.normalisedVector().multiply(maxThrust);

		return desiredVelocity.subtract(velocity);

	}
	activateShield (boolean) {
		this.shield = boolean;
		if (boolean)
			this.shieldTimer = 3;
	}
	decrementShieldTimer () {
		this.shieldTimer--;
		if (this.shieldTimer === 0)
			this.shield = false;
	}

}
class Map {
	constructor() {
		this.checkpoints = [];
		this.lap = 0;
		this.blockCounting = false;
		this.mapReady = false;
	}
	getLap (checkpoint) {

		if (!this.mapReady)
			return 0;

		if (this.blockCounting && this.findIndex(checkpoint) !== 0)
			this.blockCounting = false;
		else if (this.findIndex(checkpoint) === 0 && !this.blockCounting) {
			this.lap++;
			this.blockCounting = true;
		}
		return this.lap;
	}
	findIndex (checkpoint) {
		return this.checkpoints.findIndex(i => i.x === checkpoint.x && i.y === checkpoint.y);
	}
	addCheckpoint (checkpoint) {

		let index = this.findIndex(checkpoint),
			checkpointsLength = this.checkpoints.length;

		if (index === -1) {

			if (checkpointsLength === 0) {
				checkpoint.distanceFromPrevCheckPoint = checkpoint.distance;
				checkpoint.farest = true;
				this.checkpoints.push(checkpoint);
			} else {

				let lastCheckpointIndex = lastIndex(checkpointsLength, this.checkpoints);

				checkpoint.distanceFromPrevCheckPoint = this.checkpoints[lastCheckpointIndex].dist(checkpoint);

				let maxDist = Math.max.apply(Math, this.checkpoints.map(object => object.distanceFromPrevCheckPoint));

				if (maxDist < checkpoint.distanceFromPrevCheckPoint) {
					checkpoint.farest = true;
					for (let i = 0; i < checkpointsLength; i++)
						if (this.checkpoints[i].farest)
							this.checkpoints[i].farest = false;
				}
				this.checkpoints.push(checkpoint);
			}

		} else if (index !== checkpointsLength - 1 && !this.mapReady)
			this.mapReady = true;
	}
}

let flee = false,
	maxSpeed = 0,
	pid = new PID(p, i, d),
	map = new Map(),
	myLastPos = null,
	myLastAngle,
	opponentLastPos,
	myLastVelocity,
	opponentLastVelocity,
	lastNextCPDist,
	boostAvailable = true,
	log = {},
	targetPoint,
	myPod = new Pod(0, 0),
	opponentPod = new Pod(0, 0),
	gaussValue = (value, gauss) => pdf(value, gauss),
	gaussConst = {
		far: maxThrust / gaussValue(0, gauss.far),
		break: maxThrust / gaussValue(gauss.break.a, gauss.break),
		targetRadius: targetRadius / gaussValue(0, gauss.targetRadius),
		flee: maxThrust / pdf(0, gauss.flee)
	},
	setThrust = (checkpoint, flee, speed) => {

		let returnValue;

		if (!flee && (checkpoint.distance > breakDist || speed < minSpeedToBreak)) {
			returnValue = gaussValue(checkpoint.angle, gauss.far) * gaussConst.far;
			returnValue = Math.round(returnValue);
			console.error(`speed far: ${returnValue} angle: ${checkpoint.angle}`);
		} else if (flee && speed < minSpeedToBreak) {
			returnValue = 100 - gaussValue(checkpoint.distance, gauss.flee) * gaussConst.flee;
			returnValue = Math.round(returnValue);
			console.error(`speed flee: ${returnValue} angle: ${checkpoint.angle}`);
		} else {
			returnValue = pid.compute(checkpoint.distance);
			returnValue = Math.round(returnValue);
			returnValue = returnValue < 0 ? returnValue * -1 : returnValue;
			console.error(`speed break: ${returnValue} dist: ${checkpoint.distance}`);
		}
		return returnValue;
	},
	adjustThrust = (checkpoint, boostTarget, flee, speed) => {
		// If angle is too wide
		if (Math.abs(checkpoint.angle) >= disabledAngle) {
			console.error('speed angle: 5');
			return 5;
		} else {
			if (boostTarget && boostAvailable && Math.abs(checkpoint.angle) <= 3 && map.mapReady) {
				boostAvailable = false;
				return 'BOOST';
			} else
				return setThrust(checkpoint, flee, speed);
		}
	},
	calculateGoal = (startPos, targetPos) => {

		let m = (targetPos.y - startPos.y) / (targetPos.x - startPos.x),
			b = targetPos.y - m * targetPos.x,
			//targetR = gaussValue(targetPos.angle, gauss.targetRadius) * gaussConst.targetRadius,
			targetR = targetRadius,
			// Calculate the two interference points
			x1 = (targetPos.x + targetR / Math.sqrt(1 + m * m)),
			x2 = (targetPos.x - targetR / Math.sqrt(1 + m * m)),
			pointCoordinates1 = {
				x: Math.round(x1),
				y: Math.round(m * x1 + b)
			},
			pointCoordinates2 = {
				x: Math.round(x2),
				y: Math.round(m * x2 + b)
			},
			point1 = new Checkpoint(pointCoordinates1.x, pointCoordinates1.y),
			point2 = new Checkpoint(pointCoordinates2.x, pointCoordinates2.y),
			distSquare1 = myPod.distSquare(point1),
			distSquare2 = myPod.distSquare(point2);

		if (distSquare1 < distSquare2) {
			point1.distance = Math.round(Math.sqrt(distSquare1));
			point1.angle = myPod.heading(point1, false);
			return point1;
		}

		point2.distance = Math.round(Math.sqrt(distSquare2));
		point2.angle = myPod.heading(point2, false);

		return point2;
	},
	checkCollision = (collisionThreshold, myPod, opponentPod, mySpeed, opponentSpeed) => {
		let distance = myPod.dist(opponentPod),
			speedDiff = opponentSpeed - mySpeed > collisionThreshold,
			position = myPod.heading(opponentPod);

		console.error(`collision -> dist: ${Math.round(distance)} mySpeed: ${mySpeed} oppSpeed: ${opponentSpeed} speedDiff: ${speedDiff} position: ${position}`);

		return distance <= collisionDistToOpp && speedDiff;
	};
/*
    checkCollision = (threshold, myPod, opponentPod) => {

        let drag = 0.85,
            myPredictedPosition = myPod.pos().add(myPod.velocity()),
            //myPredictedPosition = myPod.nextSeekPos();
            opponentPredictedForce = opponentPod.velocity().multiply(1 / drag).subtract(opponentLastVelocity),
            opponentPredictedVelocity = opponentPod.velocity().add(opponentPredictedForce),
            opponentPredictedPosition = opponentPod.pos().add(opponentPredictedVelocity),
            //opponentPredictedPosition = opponentPod.nextSeekPos(),
            myPoint = new Point(myPredictedPosition.x, myPredictedPosition.y),
            opponentPoint = new Point(opponentPredictedPosition.x, opponentPredictedPosition.y),
            realMyPoint = new Point(myPod.pos().x, myPod.pos().y),
            realOpponentPoint = new Point(opponentPod.pos().x, opponentPod.pos().y);

        let velocityDiff = Math.round(opponentPredictedVelocity.subtract(myPod.velocity()).magnitude());
        console.error(`OpponentDist -> next: ${Math.round(myPoint.dist(opponentPoint))} current: ${Math.round(realMyPoint.dist(realOpponentPoint))} velocityDiff: ${velocityDiff}`);
        return myPoint.dist(opponentPoint) < collisionDistToOpp && velocityDiff < threshold;



    };
*/

while (true) {

	let myData = readline().split(' '),
		nextCheckpoint = {
			pos: {
				x: parseInt(myData[2]), // x position of the next check point
				y: parseInt(myData[3]) // y position of the next check point
			},
			dist: parseInt(myData[4]), // distance to the next checkpoint
			angle: parseInt(myData[5]) // angle between your pod orientation and the direction of the next checkpoint
		},
		myPos = {
			x: parseInt(myData[0]), // my x pos
			y: parseInt(myData[1]) // my y pos
		},
		opponentData = readline().split(' '),
		opponentPos = {
			x: parseInt(opponentData[0]),
			y: parseInt(opponentData[1])
		},
		index,
		lastInd,
		nextInd,
		checkpoint;


	// managing checkpoints
	if (!map.mapReady) {
		checkpoint = new Checkpoint(nextCheckpoint.pos.x, nextCheckpoint.pos.y, nextCheckpoint.angle, nextCheckpoint.dist);
		map.addCheckpoint(checkpoint);
	}
	if (map.mapReady) {
		index = map.findIndex(nextCheckpoint.pos);
		checkpoint = map.checkpoints[index];
		checkpoint.distance = nextCheckpoint.dist;
		checkpoint.angle = nextCheckpoint.angle;
	}

	// createStartPool last input in first round
	if (myLastPos === null) {
		myLastPos = myPos;
		myLastAngle = Math.abs(checkpoint.angle);
		opponentLastPos = opponentPos;
		lastNextCPDist = checkpoint.distance;
		myLastVelocity = new Vector(0,0);
		opponentLastVelocity = new Vector(0,0);
	}

	// calculate target, set pods
	if (map.mapReady) {
		lastInd = lastIndex(index, map.checkpoints);
		nextInd = nextIndex(index, map.checkpoints);
		targetPoint = calculateGoal(map.checkpoints[nextInd], checkpoint);
		myPod.setPod(myPos, myLastPos, targetPoint);
		opponentPod.setPod(opponentPos, opponentLastPos, checkpoint.pos);
	} else {
		targetPoint = calculateGoal(myPod, checkpoint);
		//console.error(`targetPoint: ${targetPoint.x} ${targetPoint.y}`);
		myPod.setPod(myPos, myLastPos, targetPoint);
		opponentPod.setPod(opponentPos, opponentLastPos, checkpoint.pos);
	}

	let xOffset,
		yOffset,
		mySpeed = Math.round(myPod.velocity().magnitude()),
		myLastSpeed = Math.round(myLastVelocity.magnitude()),
		opponentSpeed = Math.round(opponentPod.velocity().magnitude()),
		opponentLastSpeed = Math.round(opponentLastVelocity.magnitude()),
		thrust;

	// set flee
	flee = (myLastAngle <= Math.abs(checkpoint.angle) && Math.abs(checkpoint.angle) >= 5 && checkpoint.distance < fleeDist)
        || (checkpoint.distance > lastNextCPDist && checkpoint.distance < breakDist);

	// calculate max maxSpeed
	if (mySpeed > maxSpeed)
		maxSpeed = mySpeed;

	// managing shield
	if (myPod.shield) {
		myPod.decrementShieldTimer();
		console.error(`shieldTimer: ${myPod.shieldTimer}`);
	} else {
		//myPod.activateShield(checkCollision(collisionThreshold, myPod, opponentPod));
		myPod.activateShield(checkCollision(collisionThreshold, myPod, opponentPod, mySpeed, opponentSpeed));
	}

	// next target is the farest?
	let boostTarget = map.mapReady ? map.checkpoints[index].farest : false;

	// set thrust
	thrust = myPod.shield ? 'SHIELD' : adjustThrust(checkpoint, boostTarget, flee, mySpeed);

	// record max maxSpeed
	if (mySpeed > maxSpeed && thrust !== 'BOOST')
		maxSpeed = mySpeed;

	// set direction
	let steeringForce = myPod.seekSteeringForce().truncate(10);
	xOffset = Math.round(steeringForce.x);
	yOffset = Math.round(steeringForce.y);


	// logs
	log.compare = `nextTarget_dist: ${targetPoint.distance} nextTarget_angle: ${targetPoint.angle} nextCP_dist: ${checkpoint.distance} nextCP_angle: ${checkpoint.angle}`;
	log.lastAngle = `angle: ${targetPoint.angle} lastAngle: ${myLastAngle}`;
	log.basic = `nextCP_dist: ${targetPoint.distance} nextCP_angle: ${targetPoint.angle} thrust: ${thrust} speed: ${mySpeed} acceleration: ${Math.round(myPod.acceleration().magnitude())} collusion: ${myPod.shield} farest: ${boostTarget}`;
	log.incompleteMap = `mapReady: ${map.mapReady} mapLength: ${map.checkpoints.length} CPIndexLast ${lastInd} CPIndex: ${index} CPIndexNext: ${nextInd} lap: ${map.getLap(map.checkpoints[index])}`;
	log.offset = `x: ${xOffset} y: ${yOffset}`;
	log.speed = `speed: ${mySpeed} lastSpeed: ${myLastSpeed}`;
	log.pos = `myPos -> x: ${myPos.x} y: ${myPos.y} nextPos -> x: ${Math.round(myPod.nextSeekPos().x)} y: ${Math.round(myPod.nextSeekPos().y)} `;
	log.velocity = `velocity: x: ${myPod.velocity().x} y: ${myPod.velocity().y} magnitude: ${Math.round(myPod.velocity().magnitude())}`;
	log.seekDesiredVelocity = `seekDesiredVelocity: x: ${myPod.seekDesiredVelocity().x} y: ${myPod.seekDesiredVelocity().y} magnitude: ${Math.round(myPod.seekDesiredVelocity().magnitude())}`;
	log.seekSteeringForce = `seekSteeringForce: x: ${myPod.seekSteeringForce().x} y: ${myPod.seekSteeringForce().y} magnitude: ${Math.round(myPod.seekSteeringForce().magnitude())}`;
	log.calculatedSeekVelocity = `calculatedSeekVelocity: x: ${myPod.calculatedSeekVelocity().x} y: ${myPod.calculatedSeekVelocity().y} magnitude: ${Math.round(myPod.calculatedSeekVelocity().magnitude())}`;
	log.acceleration = `acceleration: ${Math.round(myPod.acceleration().magnitude())}`;

	console.error(log.seekSteeringForce);
	console.error(log.offset);
	console.error(log.basic);
	console.error(log.incompleteMap);
	//console.error(log.lastAngle);
	//console.error(log.compare);
	//console.error(log.pos);
	//console.error(maxSpeed);

	// command
	console.log(`${Math.round(myPos.x + xOffset)} ${Math.round(myPos.y + yOffset)} ${thrust} ${thrust}`);

	// set last values
	myLastPos = myPos;
	myLastAngle = Math.abs(checkpoint.angle);
	opponentLastPos = opponentPos;
	lastNextCPDist = checkpoint.distance;
	myLastVelocity = myPod.velocity();
	opponentLastVelocity = opponentPod.velocity();

}



