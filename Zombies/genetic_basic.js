'use strict';

// SOLVED:
//


// STATUS:
//
// GENERATOR_RANGE = 3500
//
// geneticParameters = {
// 		initialPoolSize: 100,
// 		mergedNumber: 100,
// 		mutatedNumber: 100,
// 	}



// TODO
//
// check candidates generate
//
// TODO finish evaluation
//
//
//
// TODO DEBUG.best.sameCandidates: filter the same candidates try it in test (two object of array is the same, when?)
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
	DEBUG_MODE = true,
	DEBUG = {
		endTurn: true,
		noCandidates: false,
		catch: false,
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
			fromEngine: true,
			display: true,
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
			candidates: false,
			preCheck: false,
			evaluator: false,
			candidateScores: false,
		},
		getCandidateScore: {
			dropped: false,
			candidate: false,
			candidateScore: false,
		},
		evaluation: {
			round: 0, // 0 => false
			numberOfCandidate: 3, // first x candidate
		},
		best: {
			run: false,
			candidate: false,
			sameCandidates: false,
		}
	};

let
	geneticParameters = {
		initialPoolSize: 100,
		mergedNumber: 10,
		mutatedNumber: 10,
	},
	log = '';

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

	let inputs = readline().split(' ');

	myX = parseInt(inputs[0]);
	myY = parseInt(inputs[1]);

	let humanCount = parseInt(readline());

	for (let i = 0; i < humanCount; i++) {
		let inputs = readline().split(' '),
			id = parseInt(inputs[0]),
			x = parseInt(inputs[1]),
			y = parseInt(inputs[2]);
		humans.push(new Human(id, x, y));
	}

	let zombieCount = parseInt(readline());

	for (let i = 0; i < zombieCount; i++) {
		let inputs = readline().split(' '),
			id = parseInt(inputs[0]),
			x = parseInt(inputs[1]),
			y = parseInt(inputs[2]),
			nextX = parseInt(inputs[3]),
			nextY = parseInt(inputs[4]);
		zombies.push(new Zombie(id, x, y, nextX, nextY));
	}
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
		this.evaluatedCandidateId = -1;
	}
	save (id) {
		this.cache[id].x = this.x;
		this.cache[id].y = this.y;
		this.cache[id].humans = cloneArray(this.humans);
		this.cache[id].zombies = cloneArray(this.zombies);
	}
	load (id) {
		this.x = this.cache[id].x;
		this.y = this.cache[id].y;
		this.humans = cloneArray(this.cache[id].humans);
		this.zombies = cloneArray(this.cache[id].zombies);
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

		let direction = this.baseVectorTo(target);

		direction = direction.truncate(MY_MOVE_RANGE);
		direction = new Vector(Math.floor(direction.x), Math.floor(direction.y));

		if (move)
			this.move(direction);

		return direction;
	}
	getCandidateScore (candidate) {

		if (DEBUG_MODE && DEBUG.getCandidateScore.candidateScore) {
			console.error(`zombiesLength: ${this.zombies.length} humanLength: ${this.humans.length}`);
		}

		if (DEBUG_MODE && DEBUG.getCandidateScore.candidate) {
			printCandidates('getCandidateScore.candidate', candidate, 5);
		}

		let coordsLength = candidate.coords.length,
			zombiesLength = this.zombies.length,
			countedMoves = 0,
			score = 0;

		this.save(0);
		//this.save();

		// move on solution, count score on the move
		for (let i = 0; i < coordsLength; i++) {

			this.move(candidate.coords[i]);
			score += this.score(candidate, true);

			// return score if all humans die at first move
			if (i === 0 && score === -1) {

				if (DEBUG_MODE && DEBUG.getCandidateScore.dropped) {
					printCandidates('getCandidateScore.dropped', candidate, 5);
				}

				this.load(0);
				return score;
			}
		}

		if (DEBUG_MODE && DEBUG.getCandidateScore.candidateScore) {
			console.error(`scoreCoords: ${score}`);
		}

		shuffle(this.zombies);

		// move to each zombie
		for (let i = 0; i < zombiesLength; i++) {

			if (this.zombies[i].alive) {

				this.save(1);

				let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);

				while (this.distSquare(zombiePos) > MY_KILL_RANGE_SQUARE) {

					this.moveToTarget(zombiePos);
					score += this.score(candidate, false, i);
					countedMoves++;
				}

				this.load(1);
			}
		}

		if (DEBUG_MODE && DEBUG.getCandidateScore.candidateScore) {
			console.error(`scoreAll: ${score}`);
		}

		score = score / (coordsLength + countedMoves);

		//this.load();
		this.load(0);

		if (DEBUG_MODE && DEBUG.getCandidateScore.candidateScore) {
			console.error(`getCandidateScore.candidateScore: coordsLength: ${coordsLength} countedMoves: ${countedMoves} score: ${score}`);
		}

		if (DEBUG_MODE && round === DEBUG.evaluation.round && candidate.id < DEBUG.evaluation.numberOfCandidate) {
			console.error(`returnedSCore => id: ${candidate.id} score: ${score.toFixed(3)} length: ${candidate.coords.length} steps: ${coordsLength + countedMoves} madeBy: ${candidate.madeBy}`);
		}

		return score;
	}
	score(candidate, byCoord, zombieIndex = 0) {

		// build cemetery
		for (let zombie of this.zombies) {

			if (zombie.alive) {

				let zombiePos = new Point(zombie.nextX, zombie.nextY);

				// Ash kills the zombie
				if (zombiePos.distSquare(this) <= MY_KILL_RANGE_SQUARE) {
					zombie.alive = false;
					continue;
				}

				// Human killed or will be killed
				if (zombie.alive){
					for (let human of this.humans) {
						if (human.alive) {
							// Human killed?
							if (zombiePos.x === human.x && zombiePos.y === human.y) {
								human.alive = false;
								human.aliveNextRound = false;
							}
							// Human will be killed?
							// TODO (...and if this human is the closest, and with the lowest id...corner case)
							else if (zombiePos.distSquare(human) <= ZOMBIE_KILL_RANGE_SQUARE && human.aliveNextRound) {
								human.aliveNextRound = false;
							}
						}
					}
				}
			}
		}
		return this.evaluate(candidate, byCoord, zombieIndex);
	}
	evaluate (candidate, byCoord, zombieIndex) {

		// TODO check humansWillBeDead options

		// TODO filter cost too much

		function consoleKilledZombiesId (zombiesKilledArray) {
			let returnValue = '';

			for (let killedZombie of zombiesKilledArray)
				returnValue += killedZombie.id + ' ';

			returnValue = returnValue.length !== 0 ? returnValue : 'None';

			return returnValue;

		}

		let humansAlive = this.humans.filter(human => human.alive).length,
			zombiesKilledArray  = this.zombies.filter(zombie => !zombie.alive),
			zombiesKilled = zombiesKilledArray.length,
			humansAliveNextRound = this.humans.filter(human => human.aliveNextRound).length,
			score = 0;


		if (humansAlive < 1)
			score = -1;
		else if (zombiesKilled === 1) {
			score = humansAlive * humansAlive * 10 + humansAliveNextRound * humansAliveNextRound * 10 * HUMAN_NEXT_ROUND_VALUE;
			//score = humansAlive * humansAlive * 10 * humansAliveNextRound * humansAliveNextRound;
		}
		else if (zombiesKilled > 1) {
			score = humansAlive * humansAlive * 10 * fib(zombiesKilled) + humansAliveNextRound * humansAliveNextRound * 10 * fib(zombiesKilled) * HUMAN_NEXT_ROUND_VALUE;
			//score = humansAlive * humansAlive * 10 * fib(zombiesKilled) * humansAliveNextRound * humansAliveNextRound;
		}

		score += humansAlive + humansAliveNextRound;


		//TODO test 1 :D
		if (DEBUG_MODE && DEBUG.evaluation.round > 0 && candidate.id < DEBUG.evaluation.numberOfCandidate) {

			if (round === DEBUG.evaluation.round && score > -1) {

				let killedZombiesId = consoleKilledZombiesId(zombiesKilledArray);
				if (byCoord) {

					if (this.evaluatedCandidateId !== candidate.id) {
						console.error(`id: ${candidate.id} score: ${score} length: ${candidate.coords.length} madeBy: ${candidate.madeBy}`);
					}

					log = `     ByCoords => ${humansAlive}, ${zombiesKilled}, ${humansAliveNextRound}`
								+ ` score: ${score} killed: ${killedZombiesId}`;

					console.error(log);

				} else {

					// TODO print ONLY final result and number of steps for zombieId / testCase: 1, 9
					// targetId: 3
					//              ByMove => 4, 4, 4 score: 1608  steps: {numberOfByMoveToThisZombie} killed: 3 5 11 10
					// targetId: 4
					//              ByMove => 4, 4, 4 score: 1608 steps: {numberOfByMoveToThisZombie} killed: 4 9 11 10

					let zombieId = this.zombies[zombieIndex].id;


					if (killedZombiesId !== 'None') {
						console.error(`         targetId: ${zombieId}`);

						log = `             ByMove => ${humansAlive}, ${zombiesKilled}, ${humansAliveNextRound} score: ${score}`
							+ ` killed: ${killedZombiesId}`;

						console.error(log);
					}


				}
				this.evaluatedCandidateId = candidate.id;
			}

		}
		return score;
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
		if (x !== 0 || y !== 0 ) {
			direction = direction.truncate(MY_MOVE_RANGE);
			direction = new Vector(Math.floor(direction.x), Math.floor(direction.y));
		}

		return direction;
	}
	generator (id) {

		if (DEBUG_MODE && DEBUG.generator.run) {
			console.error(`generator run: ${iterationCount}`);
		}

		let candidate = new Candidate(id),
			candidateLength = rnd(1, DEPTH);

		for (let i = 0; i < candidateLength; i++)
			candidate.coords.push(this.createRandomCoord());

		if(DEBUG_MODE && DEBUG.generator.newCandidateId && iterationCount >= 1)
			console.error(`${round} ${iterationCount} randomId: ${id}`);

		candidate.madeBy = 'generator';

		return candidate;
	}
	createCandidate (coord, id) {

		let candidate = new Candidate(id);

		candidate.coords.push(coord);

		if (DEBUG_MODE && DEBUG.createCandidate.candidate) {
			printCandidates('createCandidate.candidate', candidate);
		}

		candidate.madeBy = 'createCandidate';

		return candidate;
	}
	merger (candidate1, candidate2, id) {

		if (DEBUG_MODE && DEBUG.merger.run)
			console.error(`merger run: ${iterationCount}`);

		let candidateCoords = candidate1.coords.concat(candidate2.coords),
			candidateLength = rnd(1, Math.min(DEPTH, candidateCoords.length)),
			candidate = new Candidate(id);

		shuffle(candidateCoords);

		candidateCoords = candidateCoords.slice(0, candidateLength);

		candidate.coords = candidateCoords;
		
		if (DEBUG_MODE && DEBUG.merger.printResult) {
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
	mutator (mutateCandidate, id) {

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

		candidate.madeBy = 'mutator';

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
	}
	createStartPool (initialPoolSize, firstRound = true) {
		if (firstRound) {
			this.addCreatedCandidates();
			this.addRandomCandidates(initialPoolSize);
		}
		else {
			this.resetClassProperties();
			this.addCreatedCandidates();
			this.recycle();
			this.addRandomCandidates(initialPoolSize - this.candidates.length);
		}
	}
	addRandomCandidates(numberOfCandidates) {

		let candidatesLength = this.candidates.length;

		for (let i = candidatesLength; i < candidatesLength + numberOfCandidates; i++)
			this.candidates.push(this.generator(i));
	}
	addCreatedCandidates() {

		let zombiesLength = this.zombies.length,
			humansLength = this.humans.length,
			id = this.candidates.length;

		// create candidates for zombies
		for (let i = 0; i < zombiesLength; i++) {
			let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY),
				coord = this.moveToTarget(zombiePos,false);
			
			if (DEBUG_MODE && DEBUG.createCandidate.candidate) {
				console.error(`toZombies (${this.zombies[i].id}) - round: ${round} iterationCount: ${iterationCount}`);
			}

			this.candidates.push(this.createCandidate(coord, id));

			id++;
		}

		// create candidates for humans
		for (let i = 0; i < humansLength; i++) {
			let coord = this.moveToTarget(this.humans[i],false);

			if (DEBUG_MODE && DEBUG.createCandidate.candidate) {
				console.error(`toHumans (${this.humans[i].id}) - round: ${round} iterationCount: ${iterationCount} id: `);
			}

			this.candidates.push(this.createCandidate(coord, id));

			id++;
		}


		// create candidate for no move
		let coord = new Vector(0, 0);

		if (DEBUG_MODE && DEBUG.createCandidate.candidate) {
			console.error(`no move - round: ${round} iterationCount: ${iterationCount}`);
		}

		this.candidates.push(this.createCandidate(coord, id));

		
	}
	merge (mergedNumber = this.candidates.length) {

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

		let candidatesLength = this.candidates.length;

		mutatedNumber = Math.min(mutatedNumber, candidatesLength);

		for (let i = 0; i < mutatedNumber; i++) {

			let candidate = this.candidates[0],
				id = candidatesLength;

			this.candidates.push(this.mutator(candidate, id));

			id++;
		}
	}
	recycle () {
		// recycle candidates
		this.candidates = this.candidates.filter(candidate => candidate.coords.length > 1);
		let candidatesLength = this.candidates.length;
		for (let i = 0; i < candidatesLength; i++) {
			this.candidates[i].id = i;
			this.candidates[i].score = -Infinity;
			this.candidates[i].coords = this.candidates[i].coords.slice(1);
			this.candidates[i].madeBy = 'recycle';
		}
	}
	computeScores () {

		if (DEBUG_MODE && DEBUG.computeScores.preCheck) {
			console.error(`preCheck: ${iterationCount}, ${this.candidates.length}`);
		}

		for (let candidate of this.candidates) {

			if (candidate.score === -Infinity) {

				if (DEBUG_MODE && DEBUG.computeScores.candidates) {
					printCandidates(`computeScores.candidates ${iterationCount}`, candidate);
				}

				candidate.score = this.evaluator(candidate);

				this.evaluations++;

				if (DEBUG_MODE && DEBUG.computeScores.evaluator) {
					console.error(`computeScores.evaluator: ${candidate.score}, evaluations: ${this.evaluations}`);
				}

				if (DEBUG_MODE && DEBUG.computeScores.candidateScores) {
					printCandidates('computeScores.candidateScores', candidate);
				}

			}
		}
	}
	dropUnselected () {

		if (DEBUG_MODE && DEBUG.dropUnselected.candidates) {
			printCandidates('dropUnselected.candidates', this.candidates, 5);
		}

		let topScore = Math.max.apply(null, this.candidates.map(candidate => candidate.score));
		this.candidates = this.candidates.filter(candidate => candidate.score === topScore);

		if (DEBUG_MODE && DEBUG.dropUnselected.candidatesLength) {
			console.error(`dropUnselected.candidatesLength - validCandidates: ${this.candidates.length}`);
		}

		if (DEBUG_MODE && DEBUG.dropUnselected.candidates) {
			printCandidates('dropUnselected.candidates', this.candidates, 5);
		}

	}
	resetClassProperties () {
		this.bestCandidate.score = - Infinity;
		this.evaluations = 0;
	}
	best () {

		if (DEBUG_MODE && DEBUG.best.run) {
			console.error(`best run ${iterationCount}`);
		}

		if (this.candidates.length > 0) {

			//shuffle(this.candidates);

			this.bestCandidate = this.candidates[0];

			if (DEBUG_MODE && DEBUG.best.candidate) {
				printCandidates('best.candidates', this.candidates, 3);
			}

			if (DEBUG_MODE && DEBUG.best.sameCandidates) {
				if (this.candidates.length > 1){
					for (let i = 0; i < this.candidates.length - 1; i++) {
						for (let j = i + 1; j < this.candidates.length; j++) {
							if (JSON.stringify(this.candidates[i].coords) === JSON.stringify(this.candidates[j].coords)) {
								console.error(`${this.candidates[i].id} === ${this.candidates[j].id}`);
								printCandidates('same', this.candidates[i]);
								printCandidates('same', this.candidates[j]);
							}
						}
					}
				}
			}

		} else if (DEBUG.noCandidates) {
			console.error(`No candidates - round: ${round}`);

		}
	}
	iterate (initialPoolSize, mergedNumber, mutatedNumber, firstIteration) {
		this.runOneIteration(initialPoolSize, mergedNumber, mutatedNumber, firstIteration);
	}
	runOneIteration (initialPoolSize, mergedNumber, mutatedNumber, firstIteration) {

		if (this.bestCandidate.score > -Infinity) {

			let wrongCandidatesBefore;

			if (DEBUG_MODE && DEBUG.runOneIteration.tooLongCandidateCoords) {
				wrongCandidatesBefore = this.candidates.filter(candidate => candidate.coords.length > 3).length > 0;
				//if (!wrongCandidatesBefore)
				//	console.error('runOneIteration.tooLongCandidateCoords - ALL candidates good');
			}
			
			this.merge(mergedNumber);
			this.mutate(mutatedNumber);
			this.addRandomCandidates(initialPoolSize - this.candidates.length);

			if (DEBUG_MODE && DEBUG.runOneIteration.tooLongCandidateCoords && round === 1) {
				let wrongCandidatesAfter = this.candidates.filter(candidate => candidate.coords.length > 3);
				if (wrongCandidatesAfter.length > 0 && wrongCandidatesBefore)
					printCandidates(`round: ${round} IT: ${iterationCount} candidates.length: ${this.candidates.length}`, wrongCandidatesAfter);
			}

		}



		this.computeScores();

		/*if (DEBUG_MODE && DEBUG.runOneIteration.candidates && round === 1) {
			printCandidates('createdPool', this.candidates, 10, false);
		}*/


		this.dropUnselected();

		if (DEBUG_MODE && DEBUG.runOneIteration.candidates && round === 1) {
			printCandidates('dropUnselected', this.candidates, 10, false);
		}


		this.best();

		if (firstIteration)
			this.firstEvaluationScore = this.bestCandidate.score;
		else if (this.bestCandidate.score >= this.firstEvaluationScore)
			this.bestEvaluationScore = this.bestCandidate.score;


		if(DEBUG_MODE && DEBUG.runOneIteration.bestCandidate) {
			console.error(`round: ${round} IT_count: ${iterationCount}`);
			console.error(`candidates.length: ${this.candidates.length}`);
			printCandidates('bestCandidate', this.bestCandidate);
		}
	}
}

let round = 0,
	solution = '',
	iterationCount = 0,
	allIterations = 0,
	allEvaluations = 0;

// eslint-disable-next-line no-constant-condition
while (true) {

	let data;

	round++;

	// get input data, parameter GA, create start pool
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
		solution.createStartPool(geneticParameters.initialPoolSize);

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

		if (DEBUG_MODE &&
			DEBUG.input) {
			console.error(`${getObjectAttr(data)}`);
		}

		// update GA
		solution.update(data.x, data.y, data.humans, data.zombies);

		// create start pool with recycled values from last round
		solution.createStartPool(geneticParameters.initialPoolSize, false);

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
	}

	let iterationTime = {
			first: 250,
			others: 100
		},
		time,
		poolSizeStart = solution.candidates.length;

	if (round === 1)
		time = iterationTime.first;
	else
		time = iterationTime.others;

	let now = Date.now();

	while (Date.now() - now < time) {
		iterationCount++;
		solution.iterate(
			geneticParameters.initialPoolSize,
			geneticParameters.mergedNumber,
			geneticParameters.mutatedNumber,
			iterationCount === 1);
	}

	allIterations += iterationCount;
	allEvaluations += solution.evaluations;

	if (DEBUG.endTurn) {
		console.error(`poolSize: ${poolSizeStart} -> ${solution.candidates.length}`);
		console.error(`IT_round: ${iterationCount} EV_round: ${solution.evaluations}`);
		console.error(`evolved: ${solution.bestEvaluationScore - solution.firstEvaluationScore}`);
		console.error(`IT_time: ${Date.now() - now}`);
		console.error(`IT_all: ${allIterations} EV_all: ${allEvaluations}`);
	}

	let moveX,
		moveY;

	try {
		moveX = solution.bestCandidate.coords[0].x;
		moveY = solution.bestCandidate.coords[0].y;
	} catch (err) {
		if (DEBUG_MODE && DEBUG.catch) {
			if (solution.candidates.length > 0) {
				console.error(`catch: bestCandidate.coords are empty ${getObjectAttr(solution.bestCandidate)}`);
			}
		}
		moveX = 0;
		moveY = 0;
	}

	if (DEBUG.endTurn) {
		console.error(`id: ${solution.bestCandidate.id} bestScore: ${(solution.bestCandidate.score).toFixed(3)}`);
		console.error(`coord: ${moveX}, ${moveY} coordsLength: ${solution.bestCandidate.coords.length}, madeBy: ${solution.bestCandidate.madeBy}`);
	}

	let x = truncateValue(data.x + moveX,  0, 15999),
		y = truncateValue(data.y + moveY,  0, 8999);

	console.log(`${x} ${y}`);

	iterationCount = 0;
	//solution.resetProperties();

}
