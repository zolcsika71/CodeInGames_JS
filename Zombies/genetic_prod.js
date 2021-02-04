'use strict';

const
	FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377,
		610, 987, 1597, 2584, 4181, 6765, 10946, 17711,
		28657, 46368, 75025, 121393, 196418, 317811, 514229],
	MY_KILL_RANGE = 2000,
	MY_KILL_RANGE_SQUARE = MY_KILL_RANGE * MY_KILL_RANGE,
	MY_MOVE_RANGE = 1000,
	ZOMBIE_KILL_RANGE = 400,
	ZOMBIE_KILL_RANGE_SQUARE = ZOMBIE_KILL_RANGE * ZOMBIE_KILL_RANGE,
	DEPTH = 3,
	RAND = new Alea(),
	EMERGENCY_DEPTH = 5,
	OPTIMAL_CANDIDATE_WEIGHT = 3,
	EMERGENCY_DEPTH_SQUARE = Math.ceil(Math.pow(EMERGENCY_DEPTH, 2) / 2),
	GENERATOR_RANGE = 3000,
	TEST = {
		endTurn: true,
		initialCandidates: false,
		emergencyFound: true
	};

let geneticParameters = {
		initialPoolSize: 100,
		randomNumber: 1,
		mergedNumber: 1,
		mutatedNumber: 1,
		recycledNumber: 1
	},
	iterationTime = {
		first: 250,
		others: 100
	},
	time,
	round = 0,
	now,
	iterationCount = -1,
	humans = [],
	zombies = [],
	humanCount,
	zombieCount,
	poolSizeStart,
	myX = 0,
	myY = 0;

function BB(x) {
	return JSON.stringify(x, null, 2);
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
function shuffle(array) {
	return array.sort(function () {
		return 0.5 - RAND();
	});
}
function baseVector(point1, point2) {
	return new Vector(point2.x - point1.x, point2.y - point1.y);
}
function cloneArray(array) {
	return array.map(a => Object.assign({}, a));
}
function truncateValue(x, min, max) {
	return Math.max(min, Math.min(max, x));
}
function fib(n) {
	return FIB[n];
}
function inputData() {

	//console.error(`Input start: ${round}`);

	let inputs = readline().split(' ');

	humans = [];
	zombies = [];

	myX = parseInt(inputs[0]);
	myY = parseInt(inputs[1]);

	humanCount = parseInt(readline());

	for (let i = 0; i < humanCount; i++) {
		let inputs = readline().split(' '),
			id = parseInt(inputs[0]),
			x = parseInt(inputs[1]),
			y = parseInt(inputs[2]);
		humans.push(new Human(id, x, y));
	}

	zombieCount = parseInt(readline());

	for (let i = 0; i < zombieCount; i++) {
		let inputs = readline().split(' '),
			id = parseInt(inputs[0]),
			x = parseInt(inputs[1]),
			y = parseInt(inputs[2]),
			nextX = parseInt(inputs[3]),
			nextY = parseInt(inputs[4]);
		zombies.push(new Zombie(id, x, y, nextX, nextY));
	}

	//console.error(`Input end: ${round}`);
}
function printCandidates(candidates, length=candidates.length) {
	for (let i = 0; i <= length; i++) {
		console.error(`candidatesLength: ${candidates.length}`);
		console.error(`no: ${i} id:${candidates[i].id}`);
		for (let coord of candidates[i].coords)
			console.error(`     x: ${coord.x}, y: ${coord.y} score: ${candidates[i].score}`);
	}
}

class Vector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	multiply (scalar) {
		return new Vector(this.x * scalar, this.y * scalar);
	}
	magnitude () {
		return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
	}
	truncate(max) {
		let i = max / this.magnitude(),
			velocity;
		i = i < 1 ? i : 1;
		velocity = this.multiply(i);

		return velocity;
	}
}
class Candidate {
	constructor(id) {
		this.id = id;
		this.coords = [];
		this.score = -Infinity;
	}
}
class GeneticAlgorithm {
	constructor() {
		this.candidates = [];
		this.randomCandidates = [];
		this.optimalCandidates = [];
		this.topCandidates = [];
		this.randomCandidate = new Candidate(-3);
		this.optimalCandidate = new Candidate(-2);
		this.bestCandidate = new Candidate(-1);
		this.evaluations = 0;
	}
	createCandidates () {
		this.candidates = this.randomCandidates.concat(this.optimalCandidates);
	}
	best () {

		if (this.optimalCandidates.length > 0)
			this.optimalCandidate = this.optimalCandidates.reduce((a, b) => a.score > b.score ? a : b, this.optimalCandidates[0]);

		if (this.randomCandidates.length > 0)
			this.randomCandidate = this.randomCandidates.reduce((a, b) => a.score > b.score ? a : b, this.randomCandidates[0]);

		if (this.randomCandidates.length === 0 && this.optimalCandidates.length === 0)
			console.error('NO CANDIDATES');

		if (this.optimalCandidate.score * OPTIMAL_CANDIDATE_WEIGHT >= this.randomCandidate.score)
			this.bestCandidate = this.optimalCandidate;
		else
			this.bestCandidate = this.randomCandidate;
	}
	initialize (initialPoolSize) {
		this.randomCandidates = [];
		this.addRandomCandidates(initialPoolSize);
	}
	resetScores () {
		for (let candidate of this.randomCandidates)
			candidate.score = -Infinity;

		for (let candidate of this.optimalCandidates)
			candidate.score = -Infinity;

		this.bestCandidate.score = - Infinity;
		this.optimalCandidates = [];

	}
	addRandomCandidates(numberOfCandidates) {
		for (let i = 0; i < numberOfCandidates; i++)
			this.randomCandidates.push(this.generator.run(i));
	}
	iterate (randomNumber, mergedNumber, mutatedNumber, recycledNumber) {
		return this.runOneIteration(randomNumber, mergedNumber, mutatedNumber, recycledNumber);
	}
	runOneIteration (randomNumber, mergedNumber, mutatedNumber, recycledNumber) {

		if (this.bestCandidate.score > - Infinity) {
			this.topCandidates = this.candidates.filter(candidate => candidate.score >= this.bestCandidate.score);
			this.merge(mergedNumber);
			this.mutate(mutatedNumber);
			this.recycle(recycledNumber);
		} else {
			this.addOptimalCandidate();
			this.addRandomCandidates(randomNumber);
			this.createCandidates();

		}

		this.computeScores();
		this.dropUnselected();

		return this.best();
	}
	merge (mergedNumber) {

		mergedNumber = Math.min(mergedNumber, this.topCandidates.length);

		for (let i = 0; i < mergedNumber; i++)
			this.randomCandidates.push(this.merger(0, i));

	}
	mutate (mutatedNumber) {

		mutatedNumber = Math.min(mutatedNumber, this.topCandidates.length);

		for (let i = 0; i < mutatedNumber; i++)
			this.randomCandidates.push(this.mutator(i));
	}
	recycle (recycledNumber) {

		recycledNumber = Math.min(recycledNumber, this.topCandidates.length);

		for (let i = 0; i < recycledNumber; i++)
			this.randomCandidates.push(this.reCycler(i));
	}
	addOptimalCandidate () {
		this.optimalCandidates = [];
		this.addEmergencyCandidates(this.randomCandidates.length, this.optimalCandidates);
	}
	computeScores () {
		for (let candidate of this.candidates) {
			if (candidate.score === -Infinity) {
				candidate.score = this.evaluator(candidate);
				this.evaluations++;
			}
		}
	}
	dropUnselected () {
		this.randomCandidates = this.randomCandidates.filter(candidate => candidate.score > -1);
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

		return x * x + y * y;
	}
	dist (point) {
		return Math.sqrt(this.distSquare(point));
	}
}
class Sim extends Point {
	constructor(x, y, humans, zombies) {
		super(x, y);
		this.cache = {};
		this.humans = cloneArray(humans);
		this.zombies = cloneArray(zombies);
		this.zombieKilled = 0;
		this.humanKilled = 0;
	}
	save () {
		this.cache.x = this.x;
		this.cache.y = this.y;
		this.cache.humans = cloneArray(this.humans);
		this.cache.zombies = cloneArray(this.zombies);
		this.cache.zombieKilled = this.zombieKilled;
		this.cache.humanKilled = this.humanKilled;
	}
	load () {
		this.x = this.cache.x;
		this.y = this.cache.y;
		this.humans = cloneArray(this.cache.humans);
		this.zombies = cloneArray(this.cache.zombies);
		this.zombieKilled = this.cache.zombieKilled;
		this.humanKilled = this.cache.humanKilled;
	}
	update (x, y, humans, zombies) {
		this.x = x;
		this.y = y;
		this.humans = cloneArray(humans);
		this.zombies = cloneArray(zombies);
	}
	move (target) {
		this.x = truncateValue(this.x + target.x, 0, 15999);
		this.y = truncateValue(this.y + target.y, 0, 8999);
	}
	moveToZombie (id, addCandidates = false) {
		let direction = baseVector(this, this.zombies[id]);

		direction = direction.truncate(MY_MOVE_RANGE);
		direction = new Vector(Math.floor(direction.x), Math.floor(direction.y));
		if (addCandidates)
			return direction;
		else
			this.move(direction);
	}
	getCandidateScore (candidate) {

		this.save();

		let score = 0,
			counter = 0,
			zombiesLength = this.zombies.length;

		// move on solution, count scores on the move
		for (let i = 0; i < candidate.coords.length; i++) {
			this.move(candidate.coords[i]);
			score += this.score();
		}


		shuffle(this.zombies);

		for (let i = 0; i < zombiesLength; i++) {

			let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);

			while (this.distSquare(zombiePos) > MY_KILL_RANGE_SQUARE) {

				if (candidate.coords.length === 0) {
					candidate.coords.push(this.moveToZombie(i, true));
					this.move(candidate.coords[0]);
					score += this.score();
				} else {
					this.moveToZombie(i);
					score += this.score();
					counter++;
				}
			}
		}

		score = score / (counter + candidate.coords.length);

		this.load();

		return score;
	}
	score() {

		let zombieLength = this.zombies.length,
			humanLength = this.humans.length;

		//console.error(`zombie: ${zombieLength}, human: ${humanLength}`);

		// build cemetery
		for (let i = 0; i < zombieLength; i++) {

			let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);

			// zombie killed?
			if (this.zombies[i].alive && zombiePos.distSquare(this) <= MY_KILL_RANGE_SQUARE) {
				//console.error(`Zombie killed`);
				this.zombieKilled++;
				this.zombies[i].alive = false;
			}

			// human killed?
			for (let j = 0; j < humanLength; j++) {
				if (this.humans[j].alive && this.zombies[i].alive
                    && zombiePos.distSquare(this.humans[j]) <= ZOMBIE_KILL_RANGE_SQUARE) {
					//console.error(`Human killed`);
					this.humanKilled++;
					this.humans[j].alive = false;
					break;
				}
			}
		}
		return this.evaluate();
	}
	evaluate () {


		let humansAlive = this.humans.length - this.humanKilled,
			score = 0;
		// TODO check most compromised human?
		if (humansAlive < 1)
			score = -1;
		else if (this.zombieKilled > 1)
			score = humansAlive * humansAlive * 10 * fib(this.zombieKilled);
		else if (this.zombieKilled === 1)
			score = humansAlive * humansAlive * 10;

		return score;
	}
	addEmergencyCandidates(id, optimalCandidates) {

		let zombieLength = this.zombies.length,
			humanLength = this.humans.length;

		for (let i = 0; i < zombieLength; i++) {

			let zombiePos = new Point(this.zombies[i].x, this.zombies[i].y),
				meToZombie = zombiePos.dist(this);

			// human can be killed?
			for (let j = 0; j < humanLength; j++) {


				let zombieToHuman = zombiePos.dist(this.humans[j]),
					zombieTurn = Math.ceil(zombieToHuman / ZOMBIE_KILL_RANGE),
					myTurn = Math.ceil(meToZombie / MY_KILL_RANGE);

				// TODO check this at stage 9
				/*

               if (j === 2) {
                    console.error(`HUMAN_2 - zombie_id: ${this.zombies[i].id} zombieTurn: ${zombieTurn} myTurn: ${myTurn}`);
                }
                 */

				if (myTurn + 1 === zombieTurn && zombieTurn <= EMERGENCY_DEPTH) {

					let candidate = new Candidate(id);

					candidate.coords.push(this.moveToZombie(i, true));

					// TODO check turn comparison and value
					if (TEST.emergencyFound)
						console.error(`EMERGENCY FOUND! - H_id: ${this.humans[j].id} Z_id: ${this.zombies[i].id} Z_turn: ${zombieTurn} My_turn: ${myTurn} C: ${id}`);

					optimalCandidates.push(candidate);
					id++;

				}
			}
		}
	}
}
class Human extends Point {
	constructor(id, x, y) {
		super(x, y);
		this.id = id;
		this.alive = true;
	}
	update(x, y) {
		this.x = x;
		this.y = y;
	}
}
class Zombie extends Point {
	constructor(id, x, y, nextX, nextY) {
		super(x, y);
		this.id = id;
		this.nextX = nextX;
		this.nextY = nextY;
		this.alive = true;
	}
	update(x, y, nextX, nextY) {
		this.x = x;
		this.y = y;
		this.nextX = nextX;
		this.nextY = nextY;
	}
}

inputData();

//console.error(`${round} - me.input: ${myX}, ${myY}`);

// createStartPool main classes and lastMove
let me = new Sim(myX, myY, humans, zombies),
	solution = new GeneticAlgorithm(),
	lastPos = new Point(0, 0);


solution.generator = {

	// TODO it costs 3-7 rnd

	run: function (id) {
		let candidate = new Candidate(id),
			r = rnd(0, DEPTH);

		for (let i = 0; i < r; i++)
			candidate.coords.push(this.createRandomPosition());

		return candidate;
	},
	createRandomPosition: function () {
		let x = rnd(-GENERATOR_RANGE, GENERATOR_RANGE),
			y = rnd(-GENERATOR_RANGE, GENERATOR_RANGE),
			direction = new Vector(x, y);
		if (x !== 0 || y !== 0 ) {
			direction = direction.truncate(MY_MOVE_RANGE);
			direction = new Vector(Math.floor(direction.x), Math.floor(direction.y));
		}

		return direction;
	}
};
solution.merger = (candidates, mergedIndex) => {

	let candidatesLength = candidates.length,
		candidateCoords = candidates[0].coords.concat(candidates[mergedIndex].coords),
		candidateLength = rnd(1, Math.min(DEPTH, candidateCoords.length)),
		candidate = new Candidate(candidatesLength);

	shuffle(candidateCoords);

	candidateCoords = candidateCoords.slice(0, candidateLength);

	candidate.coords = candidateCoords;

	return candidate;

};
solution.mutator = (candidates, mutatedIndex) => {

	let solutionLength = candidates.length,
		randomPosition = solution.generator.createRandomPosition(),
		candidateStep = 0,
		candidateCoords = cloneArray(solution.topCandidates[candidateIndex].coords),
		coordsLength = candidateCoords.length,
		candidate = new Candidate(solutionLength);

	if (coordsLength > 1) {
		candidateStep = (rnd(0, coordsLength - 1));
		candidateCoords[candidateStep] = randomPosition;
	} else {
		if (rnd(1) > 0)
			candidateCoords[0].x = randomPosition.x;
		else
			candidateCoords[0].y = randomPosition.y;
	}

	candidate.coords = candidateCoords;
	return candidate;
};
solution.reCycler = (recycledNumber) => {

	if (solution.topCandidates[recycledNumber].coords.length > 1) {

		let solutionLength = solution.randomCandidates.length,
			candidateCoords = cloneArray(solution.topCandidates[recycledNumber].coords),
			candidate = new Candidate(solutionLength);

		candidateCoords = candidateCoords.slice(1);
		candidate.coords = candidateCoords;

		return candidate;
	}
};
solution.evaluator = (candidate) => me.getCandidateScore(candidate);
solution.addEmergencyCandidates = (id, optimalCandidates) => me.addEmergencyCandidates(id, optimalCandidates);

solution.initialize(geneticParameters.initialPoolSize);

console.error('Init done');

if (TEST.initialCandidates)
	printCandidates(solution.randomCandidates, 5);


while (true) {

	round++;

	if (round > 1) {
		inputData();
		//console.error(`${round} - me.input: ${myX}, ${myY}`);
		me.update(myX, myY, humans, zombies);
	}

	//console.error(`ME: ${myX}, ${myY}`);
	//console.error(`ZOMBIE: ${me.zombies[0].nextX}, ${me.zombies[0].nextY}`);

	poolSizeStart = solution.randomCandidates.length;

	if (round === 1)
		time = iterationTime.first;
	else
		time = iterationTime.others;

	now = Date.now();

	while (Date.now() - now < time) {

		if (poolSizeStart < geneticParameters.initialPoolSize)
			geneticParameters.randomNumber = geneticParameters.initialPoolSize - poolSizeStart;

		iterationCount++;

		solution.iterate(geneticParameters.randomNumber, geneticParameters.mergedNumber, geneticParameters.mutatedNumber);
	}

	let moveX = solution.bestCandidate.coords[0].x,
		moveY = solution.bestCandidate.coords[0].y;

	if (TEST.endTurn) {
		console.error(`poolSize: ${poolSizeStart} -> ${solution.randomCandidates.length}`);
		console.error(`round: ${round} IT_count: ${iterationCount} EV_count: ${solution.evaluations}`);
		if (solution.optimalCandidate.id !== -2) {
			console.error(`optimalID: ${solution.optimalCandidate.id} optimalScore: ${Math.round(solution.optimalCandidate.score)}`);
		}
		console.error(`id: ${solution.bestCandidate.id} bestScore: ${Math.round(solution.bestCandidate.score)} coord: ${moveX}, ${moveY} `);
		console.error(`ET_solution: ${Date.now() - now}`);
	}

	lastPos.x = truncateValue(myX + moveX,  0, 15999);
	lastPos.y = truncateValue(myY + moveY,  0, 8999);

	console.log(`${lastPos.x} ${lastPos.y}`);

	solution.resetScores();

}

