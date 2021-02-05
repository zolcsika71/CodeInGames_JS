'use strict';


const
	MY_KILL_RANGE = 2000,
	MY_MOVE_RANGE = 1000,
	ZOMBIE_KILL_RANGE = 400,
	DEPTH = 4,
	TIME = 100,
	RAND = Alea();

let round = -1,
	now,
	sol_ct = -1,
	humans = [],
	zombies = [],
	myX,
	myY;

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
function toRadians(degrees) {
	return degrees * (Math.PI / 180);
}
function shuffle(array) {
	return array.sort(function () {
		return 0.5 - RAND();
	});
}
function cloneClass(classToClone) {
	return Object.assign(Object.create(Object.getPrototypeOf(classToClone)), classToClone);
}
function cloneArray(array) {
	return array.map(a => Object.assign({}, a));
}
function fib(n) {
	let result = [0, 1];
	for (let i = 2; i <= n; i++) {
		let a = result[i - 1],
			b = result[i - 2];
		result.push(a + b);
	}
	return result[n];
}
function baseVector(point1, point2) {
	return {
		x: point2.x - point1.x,
		y: point2.y - point1.y
	};
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
class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	distSquare (point) {

		//console.error(`this: ${this.x}`);
		//console.error(`point: ${point.x}`);

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
		this.endGameCache = {};
		this.solution = {};
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
	endGameSave () {
		this.endGameCache.x = this.x;
		this.endGameCache.y = this.y;
		this.endGameCache.humans = cloneArray(this.humans);
		this.endGameCache.zombies = cloneArray(this.zombies);
		this.endGameCache.zombieKilled = this.zombieKilled;
		this.endGameCache.humanKilled = this.humanKilled;
	}
	endGameLoad () {
		this.x = this.endGameCache.x;
		this.y = this.endGameCache.y;
		this.humans = cloneArray(this.endGameCache.humans);
		this.zombies = cloneArray(this.endGameCache.zombies);
		this.zombieKilled = this.endGameCache.zombieKilled;
		this.humanKilled = this.endGameCache.humanKilled;
	}
	update (x, y, humans, zombies) {
		this.x = x;
		this.y = y;
		this.humans = cloneArray(humans);
		this.zombies = cloneArray(zombies);
	}
	move (target) {
		this.x = this.x + target.x;
		this.y = this.y + target.y;
	}
	moveToZombie (id) {
		let base = baseVector(this, this.zombies[id]),
			direction = new Vector(base.x, base.y);
		// TODO truncate is not necessary, coordinates are truncated by the engine in theory
		direction = direction.truncate(MY_MOVE_RANGE);
		this.move(direction);
	}
	solve () {

		let best = new Solution(this.x, this.y),
			//turns = rnd(1, DEPTH),
			turns = 3, // TODO lastScore multiplied wth this
			lastScore = 0,
			score = 0;

		//best.coords.x = this.x;
		//best.coords.y = this.y;

		console.error(`solutionLength: ${turns}`);
		let zombiePos = new Point(this.zombies[0].nextX, this.zombies[0].nextY);
		console.error(`dist: ${this.dist(zombiePos)}`);
		console.error(`humansKilled ${this.humanKilled} zombiesKilled: ${this.zombieKilled}`);

		// simulate
		while (Date.now() - now < TIME) {

			sol_ct++;

			let solution = new Solution(this.x, this.y);

			// create a random solution
			for (let i = 0; i < turns; i++)
				solution.randomize();

			//console.error(`solution.length: ${turns}`);
			//console.error(`solution: ${BB(solution)}`);

			//console.error(`before getSolutionScore-> zombies.alive: ${this.zombies[0].alive}`);


			this.save();

			score = this.getSolutionScore(solution);
			//console.error(`scores: ${scores}`);

			this.load();

			//console.error(`x: ${solution.coords.x} y: ${solution.coords.y}`);
			//console.error(`scores: ${scores}`);

			if (score > lastScore) {
				lastScore = score;
				best = solution;
				//console.error(`best: ${best.coords.x} ${best.coords.y}`);
			}
		}
		//console.error(`${this.x} ${this.y}`);
		//console.error(`${best.coords.x} ${best.coords.y}`);
		//console.error(`best scores: ${lastScore}`);

		if (humanCount > 0) {
			this.solution.x = this.x + best.coords[0].x;
			this.solution.y = this.y + best.coords[0].y;
			this.solution.score = lastScore;
		} else {
			this.solution.x = 0;
			this.solution.y = 0;
			this.solution.score = lastScore;
		}

	}
	getSolutionScore (solution) {

		let score = 0,
			finalScore = 0,
			lastFinalScore = 0,
			solutionLength = solution.coords.length;

		// move on solution, count scores on the move
		for (let i = 0; i < solutionLength; i++) {
			//this.save();
			this.move(solution.coords[i]);
			//console.error(`solution-> x: ${solution.coords[i].x} y: ${solution.coords[i].y}`);
			score += this.score();

			// at position move to all zombies
			//console.error(`before endGame-> myX: ${this.x} myY: ${this.y}`);
			//console.error(`before endGame-> zombies.alive: ${this.zombies[0].alive}`);

			this.endGameSave();

			finalScore = score + this.endGame();

			if (finalScore > lastFinalScore)
				lastFinalScore = finalScore;

			this.endGameLoad();
			//console.error(`round: ${i} sim: x: ${this.x} y: ${this.y} scores: ${lastFinalScore}`);
			//console.error(`myX: ${this.x} myY: ${this.y}`);
			//console.error(`before endGame-> zombies.alive ${this.zombies[0].alive}`);
			//scores = 0;

		}
		//console.error(`scores: ${lastFinalScore}`);
		return lastFinalScore;
	}
	endGame () {
		let endGameScore = 0,
			lastEndGameScore = 0,
			counter = 0,
			zombiesLength = this.zombies.length;

		shuffle(this.zombies);

		//console.error(`start-> x: ${this.x} y: ${this.y}`);

		for (let i = 0; i < zombiesLength; i++) {
			if (this.zombies[i].alive) {
				let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);
				while (this.dist(zombiePos) > MY_KILL_RANGE) {
					this.moveToZombie(i);
					//console.error(`x: ${this.x} y: ${this.y} not in range: ${this.dist(zombiePos) > MY_KILL_RANGE_SQUARE}`);
					endGameScore += this.score();
					counter++;
				}
				endGameScore = endGameScore / counter;
				if (endGameScore > lastEndGameScore)
					lastEndGameScore = endGameScore;
				//console.error(`counter: ${counter}`);
				counter = 0;
			}
		}
		return lastEndGameScore;
	}
	score() {

		let zombieLength = this.zombies.length,
			humanLength = this.humans.length;

		for (let i = 0; i < zombieLength; i++) {

			if (this.zombies[i].alive) {

				let zombiePos = new Point(this.zombies[i].nextX, this.zombies[i].nextY);

				// zombie killed?
				if (zombiePos.dist(this) <= MY_KILL_RANGE) {
					this.zombieKilled++;
					this.zombies[i].alive = false;
				}

				// human killed?
				for (let j = 0; j < humanLength; j++) {
					if (this.humans[j].alive && zombiePos.dist(this.humans[j]) <= ZOMBIE_KILL_RANGE) {
						this.humanKilled++;
						this.humans[j].alive = false;
					}
				}
			}
		}
		return this.evaluate();
	}
	evaluate () {

		let humansAlive = this.humans.length - this.humanKilled,
			score = 0;

		if (this.zombieKilled > 1)
			score = humansAlive * humansAlive * 10 * fib(this.zombieKilled + 3);
		else if (this.zombieKilled === 1)
			score = humansAlive * humansAlive * 10;

		//console.error(`humansKilledData ${this.humanKilled} zombiesKilledData: ${this.zombieKilled} scores: ${scores}`);

		return score;

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
class Solution {
	constructor(x, y) {
		this.coords = [];
		this.simX = x;
		this.simY = y;
		this.score = -1;
	}
	selectRange () {

		let rand = {
			min: 0,
			max: 359
		};

		// corner cases, side cases
		if (this.simX <= 1414 && this.simY <= 1414) { // top left
			rand.min = 270;
			rand.max = 359;
		} else if (this.simX >= 14586 && this.simY <= 1414) { // top right
			rand.min = 180;
			rand.max = 270;
		} else if (this.simX >= 14586 && this.simY >= 7586) { // bottom right
			rand.min = 90;
			rand.max = 180;
		} else if (this.simX <= 1414 && this.simY >= 7586) { // bottom left
			rand.min = 0;
			rand.max = 90;
		} else if (this.simY <= 1414) { // top
			rand.min = 180;
			rand.max = 359;
		} else if (this.simY >= 7586) { // bottom
			rand.min = 0;
			rand.max = 180;
		} else if (this.simX <= 1414) {  // left
			let side = rnd(1);
			if (side === 0) {
				rand.min = 0;
				rand.max = 90;
			} else {
				rand.min = 270;
				rand.max = 359;
			}
		} else if (this.simX >= 14586) { // right
			rand.min = 90;
			rand.max = 270;
		}

		return rand;
	}
	randomize () {

		let rand = this.selectRange(),
			turn = toRadians(rnd(rand.min, rand.max)),
			magnitude = Math.max(0, Math.min(MY_MOVE_RANGE, rnd(-0.5 * MY_MOVE_RANGE, 2 * MY_MOVE_RANGE))),
			x = magnitude * Math.cos(turn),
			y = -1 * magnitude * Math.sin(turn);

		this.coords.push({
			x: Math.round(x),
			y: Math.round(y)
		});
	}
}

let inputs = readline().split(' ');

myX = parseInt(inputs[0]);
myY = parseInt(inputs[1]);

let humanCount = parseInt(readline());

for (let i = 0; i < humanCount; i++) {
	let inputs = readline().split(' '),
		x = parseInt(inputs[1]),
		y = parseInt(inputs[2]);
	humans.push(new Human(i, x, y));
}

let zombieCount = parseInt(readline());

for (let i = 0; i < zombieCount; i++) {
	let inputs = readline().split(' '),
		x = parseInt(inputs[1]),
		y = parseInt(inputs[2]),
		nextX = parseInt(inputs[3]),
		nextY = parseInt(inputs[4]);
	zombies.push(new Zombie(i, x, y, nextX, nextY));
}

let me = new Sim(myX, myY, humans, zombies);

// game loop
while (true) {

	round++;

	if (round > 0) {
		let inputs = readline().split(' ');

		myX = parseInt(inputs[0]);
		myY = parseInt(inputs[1]);

		humanCount = parseInt(readline());

		humans = humans.slice(0, humanCount);

		for (let i = 0; i < humanCount; i++) {
			let inputs = readline().split(' '),
				x = parseInt(inputs[1]),
				y = parseInt(inputs[2]);
			humans[i].update(x, y);
		}

		zombieCount = parseInt(readline());

		zombies = zombies.slice(0, zombieCount);

		for (let i = 0; i < zombieCount; i++) {
			let inputs = readline().split(' '),
				x = parseInt(inputs[1]),
				y = parseInt(inputs[2]),
				nextX = parseInt(inputs[3]),
				nextY = parseInt(inputs[4]);
			zombies[i].update(x, y, nextX, nextY);
		}

		me.update(myX, myY, humans, zombies);
	}


	now = Date.now();
	me.solve();

	console.error(`elapsed time: ${Date.now() - now}`);

	console.error(`sol_ct ${round === 0 ? sol_ct : sol_ct / round} score: ${me.solution.score}`);

	console.error(`humans: ${humans.length} zombies: ${zombies.length}`);

	console.error(`zombie.coords: ${zombies[0].x} ${zombies[0].y}`);

	console.log(`${me.solution.x} ${me.solution.y}`);


}
