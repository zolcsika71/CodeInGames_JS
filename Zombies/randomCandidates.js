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
	ZOMBIE_MOVE_RANGE = 400,
	HUMAN_NEXT_ROUND_VALUE = 1,
	DEPTH = 3,
	RAND = new Alea(),
	GENERATOR_RANGE = 3500,
	ITERATION_TIME = {
		first: 1000,
		others: 130
	},
	DEBUG_MODE = false,
	DEBUG = {
		endTurn: true,
		noCandidates: false,
		evolved: true,
		humanCanBeSaved: false,
		best: {
			computeScore: {
				run: true,
				round: 3,
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
		this.moveByCoords = 0;
		this.getData = {
			score: 0,
			targetedZombie: -1,
			stepsToZombie: 0,
			moveByCoords: 0,
			scoreData: {
				zombiesKilledData: [],
				humansKilledData: [],
				humansKilledNextRoundData: [],
			},
			cache: {},
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
		if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round)
			this.cache[id].getData = cloneObject(this.getData);
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
		if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round)
			this.getData = cloneObject(this.cache[id].getData);
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

		if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
			testData = {
				getCandidateScore: {
					id: candidate.id,
					allScores: 0,
					moveByCoords: 0,
					countedMoves: 0,
				},
				moves: [],
			};
		}

		this.save(0);

		// move on solution, count scores on the move
		for (let i = 0; i < coordsLength; i++) {

			this.move(candidate.coords[i]);

			this.moveByCoords++;

			if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round){
				this.getData.moveByCoords++;
				testData.getCandidateScore.moveByCoords++;
			}

			let evaluator = this.score(this.moveByCoords === 1);

			score += evaluator;

			if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round){
				this.getData.score += evaluator;
			}

			// return scores if all humans die at first move
			if (i === 0 && score === -Infinity) {

				this.load(0);

				if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
					this.getData.targetedZombie = 'None';
					testData.moves.push(JSON.parse(JSON.stringify(this.getData)));
				}

				return [score, testData];
			}
		}

		if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
			this.getData.targetedZombie = 'None';
			testData.moves.push(JSON.parse(JSON.stringify(this.getData)));
		}

		shuffle(this.zombies);


		/*this.zombiesKilled = 0;
		if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
			this.getData.scoreData.zombiesKilledData = [];
		}*/


		// move to each zombie
		for (let zombie of this.zombies) {

			if (zombie.alive) {

				this.save(1);

				if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
					//this.getData.cache.zombies = cloneArray(this.zombies);
					//this.getData.cache.zombiesKilledData = cloneArray(this.getData.scoreData.zombiesKilledData);
					//this.getData.cache.zombiesKilled = this.zombiesKilled;
					//this.getData.cache.humansKilled = this.humansKilled;
				}
				this.stepsToZombie = this.moveByCoords;
				this.moveByCoords = 0;

				if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
					this.getData.stepsToZombie = this.getData.moveByCoords;
					this.getData.moveByCoords = 0;
				}

				let zombiePos = new Point(zombie.nextX, zombie.nextY);

				while (this.distSquare(zombiePos) > MY_KILL_RANGE_SQUARE) {

					this.moveToTarget(zombiePos);

					this.stepsToZombie++;

					if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
						this.getData.stepsToZombie++;
					}

					let evaluator = this.score(false);

					score += evaluator;

					countedMoves++;

					if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
						this.getData.score += evaluator;
					}
				}

				if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {

					this.getData.targetedZombie = zombie.id;
					testData.getCandidateScore.countedMoves = countedMoves;

					testData.moves.push(JSON.parse(JSON.stringify(this.getData)));

				}

				this.load(1);
			}
		}

		if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round)
			testData.getCandidateScore.allScores = score;

		this.load(0);

		return [score, testData];
	}
	score(humansCheck = true) {

		// build cemetery
		for (let i = 0; i < this.zombies.length; i++) {

			if (this.zombies[i].alive) {

				let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);

				// Ash kills the zombie
				if (zombiePos.distSquare(this) <= MY_KILL_RANGE_SQUARE) {
					this.zombies[i].alive = false;
					this.zombiesKilled++;
					if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
						this.getData.scoreData.zombiesKilledData.push({
							id: this.zombies[i].id,
							//myPos: `${this.x}, ${this.y}`,
							//zombiePos: `${zombiePos.x}, ${zombiePos.y}`,
							//distSquare: zombiePos.distSquare(this),
						});
					}
					continue;
				}

				// Human killed or will be killed
				if (humansCheck) {
					for (let j = 0; j < this.humans.length; j++) {
						if (this.humans[j].alive) {
							// Human killed?
							if (zombiePos.x === this.humans[j].x && zombiePos.y === this.humans[j].y) {
								this.humans[j].alive = false;
								this.humans[j].aliveNextRound = false;
								this.humansKilled++;
								if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
									this.getData.scoreData.humansKilledData.push({
										id: this.humans[j].id,
									});
								}

							}
							// Human will be killed?
							else if (zombiePos.distSquare(this.humans[j]) <= ZOMBIE_KILL_RANGE_SQUARE && this.humans[j].aliveNextRound) {
								this.humans[j].aliveNextRound = false;
								this.humansKilledNextRound++;
								if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {
									this.getData.scoreData.humansKilledNextRoundData.push({
										id: this.humans[j].id,
									});
								}

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
			score = -Infinity;
		}
		// TODO check this (results not changed) -  maybe we must simulate zombie moves / check if this human can be saved
		else if (humansAliveNextRound < humansAlive) {
			score = -1;
		}
		else if (zombiesKilled === 1) {
			score = humansAlive * humansAlive * 10;
		}
		else if (zombiesKilled > 1) {
			score = humansAlive * humansAlive * 10 * fib(zombiesKilled);
		}

		//score += humansAlive * humansAlive + humansAliveNextRound * humansAliveNextRound;

		if (DEBUG_MODE && DEBUG.best.computeScore.run && DEBUG.best.computeScore.round === round) {

			this.getData.evaluateData = {
				humansAlive: humansAlive,
				zombiesKilled: zombiesKilled,
				humansAliveNextRound: humansAliveNextRound,
				score: score < 0 ? score : this.getData.moveByCoords > 0 ?
					score * fib(this.zombiesKilled + 2) / this.getData.moveByCoords
					: score / (this.getData.stepsToZombie + this.getData.moveByCoords),
			};
		}
		//return score;
		return score < 0 ? score : this.moveByCoords > 0 ?
			score * fib(this.zombiesKilled + 2) / this.moveByCoords
			: score / (this.stepsToZombie + this.moveByCoords);
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
			candidateCoordsLength = rnd(1, DEPTH);

		for (let i = 0; i < candidateCoordsLength; i++)
			candidate.coords.push(this.createRandomCoord());

		candidate.madeBy = 'generator';

		return candidate;
	}
	createCandidate (target, id, label) {

		let candidate = new Candidate(id),
			coord = this.directionToTarget(target);

		candidate.coords.push(coord);

		candidate.madeBy = `createCandidate - ${label[0]} ${label[1]}`;

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
		this.candidateId = 0;
		this.createdCandidates = [];
	}
	reset() {
		this.candidate = new Candidate(-1);
		this.bestCandidate = new Candidate(-2);
		this.evaluations = 0;
		this.firstEvaluationScore = 0;
		this.bestEvaluationScore = 0;
		this.candidateId = 0;
		this.createdCandidates = [];
	}
	randomCandidate() {
		this.candidate = this.generator(this.candidateId);
		this.candidateId++;
	}
	makeCreatedCandidates() {

		function humanCanBeSaved (human) {

			let distance = Infinity,
				closestZombieDistSquare;

			for (let zombie of that.zombies) {

				let zombiePos = new Point(zombie.nextX, zombie.nextY);
				let distSquare = zombiePos.distSquare(human);
				if (distSquare < distance) {
					distance = distSquare;
					closestZombieDistSquare = [distSquare, zombie];
				}
			}

			let meToHuman = that.dist(human) - MY_MOVE_RANGE, // MY_KILL_RANGE / 2
				zombieToHuman = Math.sqrt(closestZombieDistSquare[0]),
				meStepsToHuman = Math.floor(meToHuman / MY_MOVE_RANGE),
				// zombie already moved in the start of the turn, Ash do not, so zombieSteps + 1
				zombieStepsToHuman = Math.ceil(zombieToHuman / ZOMBIE_MOVE_RANGE) + 1;

			if (DEBUG_MODE && DEBUG.humanCanBeSaved) {
				console.error(`humanId: ${human.id} zombieId: ${closestZombieDistSquare[1].id}`);
				console.error(`meStepsToHuman: ${meStepsToHuman}, zombieStepsToHuman: ${zombieStepsToHuman}`);
			}

			return meStepsToHuman <= zombieStepsToHuman;
		}

		let that = this;

		// create humans target
		for (const human of this.humans) {

			// human can be saved
			if (humanCanBeSaved(human)) {
				this.createdCandidates.push(this.createCandidate(human, this.candidateId, ['human', human.id]));
				this.candidateId++;
			} else { // human can not be saved
				console.error(`dead human: ${human.id}`);
			}
		}

		// create zombies target
		for (const zombie of this.zombies) {
			this.createdCandidates.push(this.createCandidate(zombie, this.candidateId, ['zombie', zombie.id]));
			this.candidateId++;
		}

		// create noMoves target
		let noMove = new Vector(0, 0);
		this.createdCandidates.push(this.createCandidate(noMove, this.candidateId, ['noMove', '']));
		this.candidateId++;
	}
	computeScores () {
		
		let evaluator = this.evaluator(this.candidate);

		this.candidate.score = evaluator[0];
		this.candidate.testData = evaluator[1];
		this.evaluations++;
	}
	solve (firstIteration) {

		if (firstIteration) {

			this.makeCreatedCandidates();

			for (let createdCandidate of this.createdCandidates) {
				this.candidate = createdCandidate;
				this.computeScores();
				this.best();
			}

		} else {
			this.randomCandidate();
			this.computeScores();
			this.best();
		}

		if (DEBUG_MODE && DEBUG.evolved){
			if (firstIteration)
				this.firstEvaluationScore = this.bestCandidate.score;
			else if (this.bestCandidate.score >= this.firstEvaluationScore)
				this.bestEvaluationScore = this.bestCandidate.score;
		}

	}
	best () {

		if (this.candidate.score > this.bestCandidate.score) {
			this.bestCandidate = this.candidate;
		}

		if (DEBUG_MODE && DEBUG.best.computeScore.run
			&& DEBUG.best.computeScore.round === round
			&& Date.now() - now > DEBUG.best.computeScore.lastTime * time
		) {
			console.error(`no: ${this.evaluations}`);
			console.error(`id: ${this.bestCandidate.id} score: ${this.bestCandidate.score}`);
			console.error(`bestCandidate: ${getObjectAttr(this.bestCandidate.testData)}`);
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
