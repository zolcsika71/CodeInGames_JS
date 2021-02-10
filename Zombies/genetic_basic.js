'use strict';

// SOLVED:
//


// STATUS:
//
// GENERATOR_RANGE = 3500
//
// this.candidates.unshift(this.makeCreatedCandidates(coord, id));
//
// runOneIteration: only random



// TODO
//
// TODO GA off => new file
//
// TODO finish computeScores
//
// TODO make inputs from file (maybe a simulator...)


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
		others: 150
	},
	GENETIC_PARAMETERS = {
		initialPoolSize: 100,
		randomNumber: 15,
	},
	DEBUG_MODE = false,
	DEBUG = {
		endTurn: true,
		noCandidates: false,
		catch: false,
		evolved: true,
		initialCandidates: {
			candidates: false,
			tooLongCandidateCoords: false,
		},
		runOneIteration: {
			candidates: false,
			bestCandidate: false,
			tooLongCandidateCoords: false,
		},
		input: {
			display: false,
			full: false
		},
		generator: {
			run: false,
			newCandidateId: false
		},
		createCandidate: {
			candidate: false,
		},
		merger: {
			run: false,
			printResult: false,
			newCandidateId: false
		},
		mutator: {
			run: false,
			printResult: false,
			newCandidateId: false
		},
		reCycler: {
			run: false,
			id: false,
			coordsLength: false,
			printResult: false,
			newCandidateId: false
		},
		dropUnselected: {
			candidates: false,
			candidatesLength: false,
		},
		computeScores: {
			run: true,
			print: false,
			evaluations: 5, // how many candidates will be printed
			round: 9,
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
function printCandidates(title, candidates, length = candidates.length, coords = true) {


	console.error(`${title}`);

	if (candidates.length === undefined) {
		// print candidate attributes
		console.error(`     no: SINGLE id:${candidates.id} score: ${candidates.score.toFixed(3)} coordsLength: ${candidates.coords.length} madeBy: ${candidates.madeBy}`);
		// print candidate data
		if (coords) {
			for (let coord of candidates.coords)
				console.error(`      x: ${coord.x}, y: ${coord.y}`);
		}
	} else if (candidates.length === 0)
		// no candidate
		console.error('empty array');
	else {
		// print candidates attributes
		console.error(`candidatesLength: ${candidates.length}`);
		length = Math.min(candidates.length, length);
		// print candidates data
		for (let i = 0; i < length; i++) {
			// print candidate attributes
			console.error(`    no: ${i} id:${candidates[i].id} score: ${candidates[i].score.toFixed(3)} coordsLength: ${candidates[i].coords.length} madeBy: ${candidates[i].madeBy}`);
			// print candidate data
			if (coords) {
				for (let coord of candidates[i].coords)
					console.error(`      x: ${coord.x}, y: ${coord.y}`);
			}
		}
	}
}

class Candidate {
	constructor(id) {
		this.id = id;
		this.coords = [];
		this.score = -Infinity;
		this.madeBy = '';
		this.test = {};
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
					myPos: `${this.x}, ${this.y}`,
					firstCoords: `${candidate.coords[0].x}, ${candidate.coords[0].y}`,
					coordsLength: candidate.coords.length,
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
									// TODO human can be saved?
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
			/*score = humansAlive * humansAlive * 10
				+ humansAliveNextRound * humansAliveNextRound * HUMAN_NEXT_ROUND_VALUE * 10;*/
			score = humansAlive * humansAlive * 10 + humansAliveNextRound * humansAliveNextRound * 10;
		}
		else if (zombiesKilled > 1) {
			/*score = humansAlive * humansAlive * 10 * fib(zombiesKilled)
				+ humansAliveNextRound * humansAliveNextRound * HUMAN_NEXT_ROUND_VALUE * 10 * fib(zombiesKilled);*/
			score = humansAlive * humansAlive * 10 * fib(zombiesKilled)
				+ humansAliveNextRound * humansAliveNextRound * 10 * fib(humansAliveNextRound);
			//score = humansAlive * humansAlive * 10 * fib(zombiesKilled) + (humansAliveNextRound * humansAliveNextRound * HUMAN_NEXT_ROUND_VALUE) * 10 * fib(zombiesKilled) * fib(humansAliveNextRound);
			//scores = humansAlive * humansAlive * 10 * fib(zombiesKilledData) * humansAliveNextRound * humansAliveNextRound;
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

		if (DEBUG_MODE && DEBUG.generator.run) {
			console.error(`generator run: ${iterationCount}`);
		}

		let candidate = new Candidate(id),
			candidateLength = rnd(1, DEPTH);

		for (let i = 0; i < candidateLength; i++)
			candidate.coords.push(this.createRandomCoord());

		if(DEBUG_MODE && DEBUG.generator.newCandidateId && iterationCount >= 1) {
			console.error(`${round} ${iterationCount} randomId: ${id}`);
		}

		candidate.madeBy = 'generator';

		return candidate;
	}
	createCandidate (coord, id) {

		let candidate = new Candidate(id);

		candidate.coords.push(coord);

		if (DEBUG_MODE && DEBUG.createCandidate.candidate) {
			printCandidates('makeCreatedCandidates.candidate', candidate);
		}

		candidate.madeBy = 'createCandidate';

		return candidate;
	}
	merger (candidate1, candidate2, id) {

		if (DEBUG_MODE && DEBUG.merger.run)
			console.error(`merger run: ${iterationCount}`);

		let candidateCoords = cloneArray(candidate1.coords.concat(candidate2.coords));

		if (candidateCoords.length === 2) {
			let candidate = new Candidate(id);

			candidate.coords = candidateCoords;

			return this.mutator(candidate, id, true);
		}

		let	candidateLength = rnd(1, Math.min(DEPTH, candidateCoords.length)),
			candidate = new Candidate(id);

		shuffle(candidateCoords);

		candidateCoords = candidateCoords.slice(0, candidateLength);

		candidate.coords = candidateCoords;
		
		if (DEBUG_MODE && DEBUG.merger.printResult && round === 1) {
			console.error('merger.printResult: ');
			printCandidates('original', candidate1);
			printCandidates('additional', candidate2);
			printCandidates('merged', candidate);
		}

		if(DEBUG_MODE && DEBUG.merger.newCandidateId && iterationCount >= 1)
			console.error(`${round} ${iterationCount} mergerId: ${id}`);

		candidate.madeBy = 'merger';

		return candidate;
	}
	mutator (mutateCandidate, id, sentFromMerger = false) {

		function mutate(candidateCoord, randomPosition) {
			if (RAND() <= 0.5)
				candidateCoord.x = randomPosition.x;
			else
				candidateCoord.y = randomPosition.y;

			return candidateCoord;
		}

		if (DEBUG_MODE && DEBUG.mutator.run)
			console.error(`mutator run: ${iterationCount}`);

		let randomPosition = this.createRandomCoord(),
			candidateCoords = cloneArray(mutateCandidate.coords),
			coordsLength = candidateCoords.length,
			candidate = new Candidate(id);

		if (coordsLength > 1) {
			let candidateStep = (rnd(0, coordsLength - 1));
			candidateCoords[candidateStep] = mutate(candidateCoords[candidateStep], randomPosition);
		} else
			candidateCoords[0] = mutate(candidateCoords[0], randomPosition);

		candidate.coords = candidateCoords;

		if (DEBUG_MODE && DEBUG.mutator.printResult) {
			console.error('mutator.printResult: ');
			printCandidates('original', mutateCandidate);
			printCandidates('mutated',  candidate);
		}

		if(DEBUG_MODE && DEBUG.mutator.newCandidateId && iterationCount >= 1)
			console.error(`${round} ${iterationCount} mutatorId: ${id}`);

		if (sentFromMerger)
			candidate.madeBy = 'merger-mutator';
		else
			candidate.madeBy = 'mutator';

		return candidate;
	}
	reCycler (coords, id) {

		let candidate = new Candidate(id);

		candidate.coords = coords;
		candidate.madeBy = 'reCycler';

		return candidate;

	}
	evaluator (candidate) {
		return this.getCandidateScore(candidate);
	}
}
class GeneticAlgorithm extends CandidateOperator {
	constructor(x, y, humans, zombies) {
		super(x, y, humans, zombies);
		this.candidates = [];
		this.bestCandidate = new Candidate(-1);
		this.evaluations = 0;
		this.firstEvaluationScore = 0;
		this.bestEvaluationScore = 0;
		this.candidateId = 0;
	}
	createStartPool (initialPoolSize, firstRound = true) {
		if (firstRound) {
			this.addCreatedCandidates();
			this.addRandomCandidates(initialPoolSize);
		}
		else {
			this.resetClassProperties();
			this.recycle();
			console.error(`recycledCandidates: ${this.candidates.length}`);
			this.addCreatedCandidates();
			this.addRandomCandidates(initialPoolSize - this.candidates.length);
		}
	}
	addRandomCandidates(numberOfCandidates) {
		for (let i = 0; i < numberOfCandidates; i++) {
			this.candidates.push(this.generator(this.candidateId));
			this.candidateId++;
		}
	}
	addCreatedCandidates() {
		
		// create candidates for zombies
		for (let zombie of this.zombies) {

			let zombiePos = new Point(zombie.nextX, zombie.nextY),
				coord = this.directionToTarget(zombiePos);
			
			if (DEBUG_MODE && DEBUG.createCandidate.candidate) {
				console.error(`toZombies (${zombie.id}) - round: ${round} iterationCount: ${iterationCount}`);
			}

			this.candidates.unshift(this.createCandidate(coord, this.candidateId));

			this.candidateId++;
		}

		// create candidates for humans
		for (let human of this.humans) {

			let coord = this.directionToTarget(human);

			if (DEBUG_MODE && DEBUG.createCandidate.candidate) {
				console.error(`toHumans (${human.id}) - round: ${round} iterationCount: ${iterationCount} id: `);
			}

			this.candidates.push(this.createCandidate(coord, this.candidateId));

			this.candidateId++;
		}

		// create candidate for no move
		let coord = new Vector(0, 0);

		if (DEBUG_MODE && DEBUG.createCandidate.candidate) {
			console.error(`no move - round: ${round} iterationCount: ${iterationCount}`);
		}

		this.candidates.push(this.createCandidate(coord, this.candidateId));

		this.candidateId++;
	}
	/*merge (mergedNumber = this.candidates.length) {

		let candidatesLength = this.candidates.length,
			id = candidatesLength;

		if (candidatesLength === 1)
			return;

		mergedNumber = Math.min(mergedNumber, candidatesLength - 1);

		for (let i = 0; i < mergedNumber; i++) {

			let candidate1 = this.candidates[i],
				candidate2 = this.candidates[i + 1];

			this.candidates.push(this.merger(candidate1, candidate2, id));
			id++;

		}
	}
	mutate (mutatedNumber= this.candidates.length) {

		let candidatesLength = this.candidates.length,
			id = candidatesLength;

		mutatedNumber = Math.min(mutatedNumber, candidatesLength);

		for (let i = 0; i < mutatedNumber; i++) {

			let candidate = this.candidates[i];

			this.candidates.push(this.mutator(candidate, id));

			id++;
		}
	}*/
	recycle () {
		// recycle candidates
		this.candidates = this.candidates.filter(candidate => candidate.coords.length > 1);

		for (let i = 0; i < this.candidates.length; i++) {
			this.candidates[i] = this.reCycler(this.candidates[i].coords.slice(1), this.candidateId);
			this.candidateId++;
		}
	}
	computeScores () {
		for (let candidate of this.candidates) {

			if (candidate.score === -Infinity) {

				let evaluator = this.evaluator(candidate);

				candidate.score = evaluator[0];
				candidate.testData = evaluator[1];

				this.evaluations++;

				if (DEBUG_MODE && DEBUG.computeScores.run
					&& DEBUG.computeScores.print
					&& DEBUG.computeScores.round === round
					&& this.evaluations <= DEBUG.computeScores.evaluations) {
					// print testData
					console.error(`no: ${this.evaluations}`);
					console.error(`${getObjectAttr(candidate.testData)}`);

				}
			}
		}
	}
	dropUnselected () {

		if (DEBUG_MODE && DEBUG.dropUnselected.candidates && iterationCount === 1) {
			printCandidates('created candidates', this.candidates, 10, false);
		}

		// get topScore from this.candidates
		let topScore = Math.max.apply(null, this.candidates.map(candidate => candidate.score));

		// filter candidates.scores === topScore
		this.candidates = this.candidates.filter(candidate => candidate.score === topScore);

		if (DEBUG_MODE && DEBUG.dropUnselected.candidatesLength) {
			console.error(`dropUnselected.candidatesLength - validCandidates: ${this.candidates.length}`);
		}

		if (DEBUG_MODE && DEBUG.dropUnselected.candidates && iterationCount === 1) {
			printCandidates('dropUnselected.candidates', this.candidates, 10);
		}

	}
	resetClassProperties () {
		this.bestCandidate = new Candidate(-1);
		this.evaluations = 0;
	}
	best () {
		if (this.candidates.length > 0) {

			//shuffle(this.candidates);

			this.bestCandidate = this.candidates[0];

			//console.error(`lastCandidateId: ${this.lastCandidateId} bestCandidateId: ${this.bestCandidate.id}`);

			if (DEBUG_MODE && DEBUG.best.sameCandidates.run
				&& round === DEBUG.best.sameCandidates.round
				&& iterationCount === DEBUG.best.sameCandidates.iterationCount) {
				let counter = 0;
				if (this.candidates.length > 1) {
					for (let i = 0; i < this.candidates.length - 1; i++) {
						for (let j = i + 1; j < this.candidates.length; j++) {
							if (JSON.stringify(this.candidates[i].coords) === JSON.stringify(this.candidates[j].coords)) {
								//console.error(`i: ${i} j: ${j}`);
								//console.error(`${this.candidates[i].id} === ${this.candidates[j].id}`);
								//printCandidates('same', this.candidates[i]);
								//printCandidates('same', this.candidates[j]);
								counter++;
								//console.error(`id: ${this.candidates[i].id} ${this.candidates[j].id} length: ${this.candidates[i].coords.length} ${this.candidates[j].coords.length} madeBy ${this.candidates[i].madeBy} ${this.candidates[j].madeBy}`);

							}
						}
					}
					console.error(`samCandidates: ${counter}`);
				}
			}

			if (DEBUG_MODE && DEBUG.best.computeScore.run
				&& DEBUG.computeScores.round === round
				&& Date.now() - now > DEBUG.best.computeScore.lastTime * time
			) {
				console.error(`no: ${this.evaluations}`);
				console.error(`id: ${this.bestCandidate.id} score: ${this.bestCandidate.score}`);
				console.error(`${getObjectAttr(this.bestCandidate.testData)}`);
			}

		} else if (DEBUG.noCandidates) {
			console.error(`No candidates - round: ${round}`);
		}
	}
	iterate (initialPoolSize, randomNumber, firstIteration) {
		this.runOneIteration(initialPoolSize, randomNumber, firstIteration);
	}
	runOneIteration (initialPoolSize, randomNumber, firstIteration) {

		let wrongCandidatesBefore;

		if (DEBUG_MODE && DEBUG.runOneIteration.tooLongCandidateCoords) {
			wrongCandidatesBefore = this.candidates.filter(candidate => candidate.coords.length > 3).length > 0;
			//if (!wrongCandidatesBefore)
			//	console.error('runOneIteration.tooLongCandidateCoords - ALL candidates good');
		}

		// merge & mutate ONLY when scores evaluated already (if this.bestCandidate.score > -Infinity
		//this.merge();
		//this.mutate(mutatedNumber);

		this.addRandomCandidates(randomNumber);

		if (DEBUG_MODE && DEBUG.runOneIteration.tooLongCandidateCoords && round === 1) {
			let wrongCandidatesAfter = this.candidates.filter(candidate => candidate.coords.length > 3);
			if (wrongCandidatesAfter.length > 0 && wrongCandidatesBefore)
				printCandidates(`round: ${round} IT: ${iterationCount} candidates.length: ${this.candidates.length}`, wrongCandidatesAfter);
		}

		this.computeScores();

		this.dropUnselected();

		if (DEBUG_MODE && DEBUG.runOneIteration.candidates && round === 1 && iterationCount === 1000) {
			printCandidates('after dropUnselected', this.candidates, 100, false);
		}

		this.best();

		if (DEBUG_MODE && DEBUG.evolved){
			if (firstIteration)
				this.firstEvaluationScore = this.bestCandidate.score;
			else if (this.bestCandidate.score >= this.firstEvaluationScore)
				this.bestEvaluationScore = this.bestCandidate.score;
		}

		if(DEBUG_MODE && DEBUG.runOneIteration.bestCandidate) {
			console.error(`round: ${round} IT_count: ${iterationCount}`);
			console.error(`candidates.length: ${this.candidates.length}`);
			printCandidates('bestCandidate', this.bestCandidate);
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

		if (DEBUG_MODE && DEBUG.input.display){
			if (DEBUG.input.display.full) {
				console.error(`${getObjectAttr(data)}`);
			} else {
				console.error(`myX: ${data.x}`);
				console.error(`myY: ${data.y}`);

			}
		}

		// createStartPool GA
		solution = new GeneticAlgorithm(data.x, data.y, data.humans, data.zombies);

		// create start pool with random values
		solution.createStartPool(GENETIC_PARAMETERS.initialPoolSize);

		if (DEBUG_MODE &&
			DEBUG.initialCandidates.candidates) {
			printCandidates('initialCandidates', solution.candidates, 5);
		}

		if (DEBUG_MODE &&
			DEBUG.initialCandidates.tooLongCandidateCoords) {
			let wrongCandidates = solution.candidates.filter(candidate => candidate.coords.length > 3);
			if (wrongCandidates.length > 0)
				printCandidates('initialCandidates.tooLongCandidateCoords', wrongCandidates);
		}

	} else {

		data = getData();

		if (DEBUG_MODE && DEBUG.input.display){
			if (DEBUG.input.display.full) {
				console.error(`${getObjectAttr(data)}`);
			} else {
				console.error(`myX: ${data.x}`);
				console.error(`myY: ${data.y}`);

			}
		}

		// update GA
		solution.update(data.x, data.y, data.humans, data.zombies);

		// create start pool with recycled values from last round
		solution.createStartPool(GENETIC_PARAMETERS.initialPoolSize, false);

		if (DEBUG_MODE &&
			DEBUG.initialCandidates.candidates) {
			printCandidates('initialCandidates', solution.candidates.filter(candidates => candidates.score > - Infinity), 5);
		}

		if (DEBUG_MODE &&
			DEBUG.initialCandidates.tooLongCandidateCoords) {
			let wrongCandidates = solution.candidates.filter(candidate => candidate.coords.length > 3);
			if (wrongCandidates.length > 0)
				printCandidates('initialCandidates.tooLongCandidateCoords', wrongCandidates);
		}
	}

	let poolSizeStart = solution.candidates.length;

	if (round === 1)
		time = ITERATION_TIME.first;
	else
		time = ITERATION_TIME.others;

	while (Date.now() - now < time) {
		iterationCount++;
		solution.iterate(
			GENETIC_PARAMETERS.initialPoolSize,
			GENETIC_PARAMETERS.randomNumber,
			iterationCount === 1);
	}

	allIterations += iterationCount;
	allEvaluations += solution.evaluations;

	let candidatesLength = solution.candidates.length;

	if (DEBUG.endTurn) {
		console.error(`poolSize: ${poolSizeStart} -> ${candidatesLength}`);
		console.error(`EV_all: ${allEvaluations} EV_round: ${solution.evaluations}`);
		console.error(`IT_all: ${allIterations} IT_round: ${iterationCount}`);
		if (DEBUG_MODE && DEBUG.evolved)
			console.error(`evolved: ${solution.bestEvaluationScore - solution.firstEvaluationScore}`);
		console.error(`IT_time: ${Date.now() - now}`);
	}

	let moveX,
		moveY;

	try {
		moveX = solution.bestCandidate.coords[0].x;
		moveY = solution.bestCandidate.coords[0].y;
	} catch (err) {
		if (DEBUG_MODE && DEBUG.catch) {
			if (candidatesLength > 0) {
				console.error(`catch: bestCandidate.coords are empty ${getObjectAttr(solution.bestCandidate)}`);
			}
		}
		moveX = 0;
		moveY = 0;
	}

	if (DEBUG.endTurn) {
		console.error(`id: ${solution.bestCandidate.id} score: ${(solution.bestCandidate.score).toFixed(3)}`);
		console.error(`coord: ${moveX}, ${moveY} coordsLength: ${solution.bestCandidate.coords.length}, madeBy: ${solution.bestCandidate.madeBy}`);
	}

	let x = truncateValue(data.x + moveX,  0, 15999),
		y = truncateValue(data.y + moveY,  0, 8999);

	console.log(`${x} ${y}`);

	iterationCount = 0;
	//solution.resetProperties();

}
