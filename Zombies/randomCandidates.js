'use strict';

const
	FIB = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89,
		144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946,
		17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269],
	MY_KILL_RANGE = 2000,
	MY_KILL_RANGE_SQUARE = MY_KILL_RANGE * MY_KILL_RANGE,
	ZOMBIE_KILL_RANGE = 400,
	ZOMBIE_KILL_RANGE_SQUARE = ZOMBIE_KILL_RANGE * ZOMBIE_KILL_RANGE,
	MY_MOVE_RANGE = 1000,
	HUMAN_NEXT_ROUND_VALUE = 1,
	DEPTH = 3,
	RAND = new Alea(),
	GENERATOR_RANGE = 3500,
	ITERATION_TIME = {
		first: 1000,
		others: 140
	},
	DEBUG_MODE = false,
	DEBUG = {
		endTurn: true,
		noCandidates: false,
		evolved: true,
		computeScores: {
			run: true,
			print: false,
			evaluations: 5, // how many candidate will be printed
			round: 8,
		},
		best: {
			computeScore: {
				run: true,
				lastTime: 0.999,
			},
			sameCandidates: {
				run: false,
				round: 1,
				iterationCount: 1000,
			},
		}
	};

function getObjectAttr(x) {
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
	return array.sort(() => RAND() - 0.5);
}
function cloneArray(array) {
	return array.map(a => ({...a}));
}
function cloneObject (object) {
	return JSON.parse(JSON.stringify(object));
}
function truncateValue(x, min, max) {
	return Math.max(min, Math.min(max, x));
}
function fib(n) {
	return FIB[n];
}
function getData() {

	let myX,
		myY,
		humans = [],
		zombies = [];

	// eslint-disable-next-line no-undef
	let inputs = readline().split(' ');

	myX = parseInt(inputs[0]);
	myY = parseInt(inputs[1]);

	// eslint-disable-next-line no-undef
	let humanCount = parseInt(readline());

	for (let i = 0; i < humanCount; i++) {
		// eslint-disable-next-line no-undef
		let inputs = readline().split(' '),
			id = parseInt(inputs[0]),
			x = parseInt(inputs[1]),
			y = parseInt(inputs[2]);
		humans.push(new Human(id, x, y));
	}

	// eslint-disable-next-line no-undef
	let zombieCount = parseInt(readline());

	for (let i = 0; i < zombieCount; i++) {
		// eslint-disable-next-line no-undef
		let inputs = readline().split(' '),
			id = parseInt(inputs[0]),
			x = parseInt(inputs[1]),
			y = parseInt(inputs[2]),
			nextX = parseInt(inputs[3]),
			nextY = parseInt(inputs[4]);
		zombies.push(new Zombie(id, x, y, nextX, nextY));
	}

	now = Date.now();

	return {
		x: myX,
		y: myY,
		humans: humans,
		zombies: zombies
	};
}

class Candidate {
	constructor(id) {
		this.id = id;
		this.coords = [];
		this.score = -Infinity;
		this.madeBy = '';
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
	baseVectorTo(point) {
		return new Vector(point.x - this.x, point.y - this.y);
	}
	directionToTarget(point, moveRange = MY_MOVE_RANGE) {

		let direction = this.baseVectorTo(point);

		if (!(direction.x === 0 && direction.y === 0)) {
			direction = direction.truncate(moveRange);
			direction = new Vector(Math.floor(direction.x), Math.floor(direction.y));
		}

		return direction;
	}
}
class Point extends Vector {
	constructor(x, y) {
		super(x, y);
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
class Human extends Point {
	constructor(id, x, y) {
		super(x, y);
		this.id = id;
		this.alive = true;
		this.aliveNextRound = true;
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
}
class Sim extends Point {
	constructor(x, y, humans, zombies) {
		super(x, y);
		this.cache = [{}, {}];
		this.humans = cloneArray(humans);
		this.zombies = cloneArray(zombies);
		this.zombiesKilled = 0;
		this.humansKilled = 0;
		this.humansKilledNextRound = 0;
		this.stepsToZombie = 0;
		this.getData = {
			score: 0,
			targetedZombie: -1,
			stepsToZombie: 0,
			scoreData: {
				zombiesKilledData: [],
				humansKilledData: [],
				humansKilledNextRoundData: [],
			},
			evaluateData: {},
		};
	}
	save (id) {
		this.cache[id].x = this.x;
		this.cache[id].y = this.y;
		this.cache[id].humans = cloneArray(this.humans);
		this.cache[id].zombies = cloneArray(this.zombies);
		this.cache[id].zombiesKilled = this.zombiesKilled;
		this.cache[id].humansKilled = this.humansKilled;
		this.cache[id].humansKilledNextRound = this.humansKilledNextRound;
		this.cache[id].stepsToZombie = this.stepsToZombie;
		if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round)
			this.cache[id].getData = JSON.parse(JSON.stringify(this.getData));
	}
	load (id) {
		this.x = this.cache[id].x;
		this.y = this.cache[id].y;
		this.humans = cloneArray(this.cache[id].humans);
		this.zombies = cloneArray(this.cache[id].zombies);
		this.zombiesKilled = this.cache[id].zombiesKilled;
		this.humansKilled = this.cache[id].humansKilled;
		this.humansKilledNextRound = this.cache[id].humansKilledNextRound;
		this.stepsToZombie = this.cache[id].stepsToZombie;
		if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round)
			this.getData = JSON.parse(JSON.stringify(this.cache[id].getData));
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
	moveToTarget (target, move = true) {

		let direction = this.directionToTarget(target);

		if (move)
			this.move(direction);

		return direction;
	}
	getCandidateScore (candidate) {

		let coordsLength = candidate.coords.length,
			countedMoves = 0,
			score = 0,
			testData = {};

		if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {
			testData = {
				getCandidateScore: {
					id: candidate.id,
					allScores: 0,
					moves: 0,
					countedMoves: 0,
				},
				moves: [],
			};
		}

		this.save(0);

		// move on solution, count scores on the move
		for (let i = 0; i < coordsLength; i++) {

			this.move(candidate.coords[i]);

			let evaluator = this.score();

			score += evaluator;

			if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round){
				this.getData.score += evaluator;
				testData.getCandidateScore.moves++;
			}

			// return scores if all humans die at first move
			if (i === 0 && score === -1) {
				this.load(0);
				if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {
					this.getData.targetedZombie = 'None';
					testData.moves.push(JSON.parse(JSON.stringify(this.getData)));
				}
				return [score, testData];
			}
		}

		if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {
			this.getData.targetedZombie = 'None';
			testData.moves.push(JSON.parse(JSON.stringify(this.getData)));
		}

		shuffle(this.zombies);

		// move to each zombie
		for (let zombie of this.zombies) {

			if (zombie.alive) {

				this.save(1);

				if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {
					this.getData.score = 0;
				}

				let zombiePos = new Point(zombie.nextX, zombie.nextY);

				while (this.distSquare(zombiePos) > MY_KILL_RANGE_SQUARE) {

					this.moveToTarget(zombiePos);

					this.stepsToZombie++;

					if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {
						this.getData.stepsToZombie++;
					}

					let evaluator = this.score();

					score += evaluator;

					countedMoves++;

					if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {
						this.getData.score += evaluator;
					}
				}

				if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {

					this.getData.targetedZombie = zombie.id;
					testData.getCandidateScore.countedMoves = countedMoves;

					testData.moves.push(JSON.parse(JSON.stringify(this.getData)));

				}

				this.load(1);
			}
		}

		if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round)
			testData.getCandidateScore.allScores = score;

		//score = score / (coordsLength + countedMoves);

		this.load(0);

		return [score, testData];
	}
	score() {

		// build cemetery
		for (let zombie of this.zombies) {

			if (zombie.alive) {

				let zombiePos = new Point(zombie.nextX, zombie.nextY);

				// Ash kills the zombie
				if (zombiePos.distSquare(this) <= MY_KILL_RANGE_SQUARE) {
					zombie.alive = false;
					this.zombiesKilled++;
					if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {
						this.getData.scoreData.zombiesKilledData.push({
							id: zombie.id,
							//myPos: `${this.x}, ${this.y}`,
							//zombiePos: `${zombiePos.x}, ${zombiePos.y}`,
							//distSquare: zombiePos.distSquare(this),
						});
					}
					continue;
				}

				// Human killed or will be killed
				for (let human of this.humans) {
					if (human.alive) {
						// Human killed?
						if (zombiePos.x === human.x && zombiePos.y === human.y) {
							human.alive = false;
							human.aliveNextRound = false;
							this.humansKilled++;
							if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {
								this.getData.scoreData.humansKilledData.push({
									id: human.id
								});
							}

						}
						// Human will be killed?
						else if (zombiePos.distSquare(human) <= ZOMBIE_KILL_RANGE_SQUARE && human.aliveNextRound) {
							human.aliveNextRound = false;
							this.humansKilledNextRound++;
							if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {
								this.getData.scoreData.humansKilledNextRoundData.push({
									id: human.id,
								});
							}

						}
					}
				}
			}
		}

		return this.evaluate();
	}
	evaluate () {

		let humansAlive = this.humans.length - this.humansKilled,
			zombiesKilled = this.zombiesKilled,
			humansAliveNextRound = humansAlive - this.humansKilledNextRound,
			score = 0;

		if (humansAlive < 1) {
			score = -1;
		}
		else if (zombiesKilled === 1) {
			score = humansAlive * humansAlive * 10
				+ humansAliveNextRound * humansAliveNextRound * HUMAN_NEXT_ROUND_VALUE * 10;
			/*score = humansAlive * humansAlive * 10
				+ humansAliveNextRound * humansAliveNextRound * HUMAN_NEXT_ROUND_VALUE * 10;*/
			/*score = humansAlive * humansAlive * 10 * humansAliveNextRound * humansAliveNextRound;*/
		}
		else if (zombiesKilled > 1) {
			score = humansAlive * humansAlive * 10 * fib(zombiesKilled)
				+ humansAliveNextRound * humansAliveNextRound * HUMAN_NEXT_ROUND_VALUE * 10 * fib(zombiesKilled);
			/*score = humansAlive * humansAlive * 10 * fib(zombiesKilled)
				+ humansAliveNextRound * humansAliveNextRound * 10 * fib(humansAliveNextRound);*/
			/*score = humansAlive * humansAlive * 10 * fib(zombiesKilled)
			 + humansAliveNextRound * humansAliveNextRound * HUMAN_NEXT_ROUND_VALUE * 10 * fib(zombiesKilled) * fib(humansAliveNextRound);*/
			/*scores = humansAlive * humansAlive * 10 * fib(zombiesKilledData)
			* * humansAliveNextRound * humansAliveNextRound;*/
		}
		//score += humansAlive + humansAliveNextRound;

		if (DEBUG_MODE && DEBUG.computeScores.run && DEBUG.computeScores.round === round) {

			this.getData.evaluateData = {
				humansAlive: humansAlive,
				zombiesKilled: zombiesKilled,
				humansAliveNextRound: humansAliveNextRound,
				score: this.getData.stepsToZombie > 0 ? score / this.getData.stepsToZombie : score,
			};
		}
		//return score;
		return this.stepsToZombie > 0 ? score / this.stepsToZombie : score;
	}
}
class CandidateOperator extends Sim {
	constructor(x, y, humans, zombies) {
		super(x, y, humans, zombies);
	}
	createRandomCoord () {

		let x = rnd(-GENERATOR_RANGE, GENERATOR_RANGE),
			y = rnd(-GENERATOR_RANGE, GENERATOR_RANGE),
			direction = new Vector(x, y);

		return this.directionToTarget(direction);
	}
	generator (id) {

		let candidate = new Candidate(id),
			candidateLength = rnd(1, DEPTH);

		for (let i = 0; i < candidateLength; i++)
			candidate.coords.push(this.createRandomCoord());

		candidate.madeBy = 'generator';

		return candidate;
	}
	createCandidate (target, id) {

		let candidate = new Candidate(id),
			coord = this.directionToTarget(target);

		candidate.coords.push(coord);

		candidate.madeBy = 'createCandidate';

		return candidate;
	}
	evaluator (candidate) {
		return this.getCandidateScore(candidate);
	}
}
class GeneticAlgorithm extends CandidateOperator {
	constructor(x, y, humans, zombies) {
		super(x, y, humans, zombies);
		this.candidate = new Candidate(-1);
		this.bestCandidate = new Candidate(-2);
		this.evaluations = 0;
		this.firstEvaluationScore = 0;
		this.bestEvaluationScore = 0;
		this.candidatesMade = 0;
		this.createdCandidates = [];
	}
	reset() {
		this.resetClassProperties();
	}
	randomCandidate() {
		this.candidate = this.generator(this.candidatesMade);
		this.candidatesMade++;
	}
	makeCreatedCandidates() {

		// create zombies target
		for (const zombie of this.zombies) {
			this.createdCandidates.push(this.createCandidate(zombie, this.candidatesMade));
			this.candidatesMade++;
		}
		// create humans target
		for (const human of this.humans) {
			this.createdCandidates.push(this.createCandidate(human, this.candidatesMade));
			this.candidatesMade++;
		}
		// create noMoves target
		let noMove = new Vector(0, 0);
		this.createdCandidates.push(this.createCandidate(noMove, this.candidatesMade));
	}
	computeScores () {
		
		let evaluator = this.evaluator(this.candidate);

		this.candidate.score = evaluator[0];
		this.candidate.testData = evaluator[1];
		this.evaluations++;

		if (DEBUG_MODE && DEBUG.computeScores.run
					&& DEBUG.computeScores.print
					&& DEBUG.computeScores.round === round
					&& this.evaluations <= DEBUG.computeScores.evaluations) {
			// print testData
			console.error(`no: ${this.evaluations}`);
			console.error(`${getObjectAttr(this.candidate.testData)}`);
		}
	}
	solve (firstIteration) {

		if (firstIteration) {
			this.makeCreatedCandidates();
			for (const createdCandidate of this.createdCandidates) {
				this.computeScores(createdCandidate);
				this.best();
			}
		} else {
			this.randomCandidate();
			this.computeScores();
			this.best();
		}
	}
	resetClassProperties () {
		this.bestCandidate = new Candidate(-2);
		this.evaluations = 0;
	}
	best () {

		if (this.candidate.score > this.bestCandidate.score) {
			this.bestCandidate = cloneObject(this.candidate);
		}

		if (DEBUG_MODE && DEBUG.best.computeScore.run
			&& DEBUG.computeScores.round === round
			&& Date.now() - now > DEBUG.best.computeScore.lastTime * time
		) {
			console.error(`no: ${this.evaluations}`);
			console.error(`id: ${this.bestCandidate.id} score: ${this.bestCandidate.score}`);
			console.error(`candidate: ${getObjectAttr(this.bestCandidate.testData)}`);
			//console.error(`lastCandidate: ${getObjectAttr(this.lastCandidate)}`);
			//console.error(`bestCandidate: ${getObjectAttr(this.bestCandidate)}`);
		}
	}
}

let round = 0,
	now = 0,
	time,
	solution = '',
	iterationCount = 0,
	allIterations = 0,
	allEvaluations = 0;

// eslint-disable-next-line no-constant-condition
while (true) {

	let data;

	round++;

	// get input data, parameter / update GA, create start pools
	if (round === 1) {

		// read input
		data = getData();

		// createStartPool GA
		solution = new GeneticAlgorithm(data.x, data.y, data.humans, data.zombies);

	} else {

		// read input
		data = getData();

		// update GA
		solution.update(data.x, data.y, data.humans, data.zombies);
		solution.reset();
		
	}

	if (round === 1)
		time = ITERATION_TIME.first;
	else
		time = ITERATION_TIME.others;

	while (Date.now() - now < time) {
		iterationCount++;
		solution.solve(iterationCount === 1);
	}

	allIterations += iterationCount;
	allEvaluations += solution.evaluations;

	if (DEBUG.endTurn) {
		console.error(`EV_all: ${allEvaluations} EV_round: ${solution.evaluations}`);
		console.error(`IT_all: ${allIterations} IT_round: ${iterationCount}`);
		if (DEBUG_MODE && DEBUG.evolved)
			console.error(`evolved: ${solution.bestEvaluationScore - solution.firstEvaluationScore}`);
		console.error(`IT_time: ${Date.now() - now}`);
	}

	let moveX = solution.bestCandidate.coords[0].x,
		moveY = solution.bestCandidate.coords[0].y;
	
	if (DEBUG.endTurn) {
		console.error(`id: ${solution.bestCandidate.id} score: ${(solution.bestCandidate.score).toFixed(3)}`);
		console.error(`coord: ${moveX}, ${moveY} coordsLength: ${solution.bestCandidate.coords.length}, madeBy: ${solution.bestCandidate.madeBy}`);
	}

	let x = truncateValue(data.x + moveX,  0, 15999),
		y = truncateValue(data.y + moveY,  0, 8999);

	console.log(`${x} ${y}`);

	iterationCount = 0;
}
