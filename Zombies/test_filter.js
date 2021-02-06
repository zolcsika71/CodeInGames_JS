'use strict';


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
function getObjectAttr(x) {
	return JSON.stringify(x, null, 2);
}

class Candidate {
	constructor(id) {
		this.id = id;
		this.coords = [];
		this.score = -Infinity;
	}
}

// create N candidate

const
	RAND = new Alea(),
	N = 5,
	SAME = 2;

let candidates = [];


for (let i = 0; i < N - SAME; i++) {

	if (i === 0) {
		for (let j = 0; j < SAME; j++) {
			let candidate = new Candidate(j);
			candidate.coords = [{'x': 0, 'y': 0}];
			candidate.score = 0;
			candidates.push(candidate);
		}
	}

	let candidate = new Candidate(candidates.length);
	candidate.coords = [{'x': rnd(1000), 'y': rnd(1000)}];
	candidate.score = 0;
	candidates.push(candidate);
}



//console.log(`original: ${getObjectAttr(candidate)}`);

let topScore = Math.max.apply(null, candidates.map(candidate => candidate.score));

candidates = candidates.filter((currentValue,index,array) => array.findIndex(currentElement => (JSON.stringify(currentElement.coords) === JSON.stringify(currentValue.coords) && currentValue.score === topScore)) === index);

console.log(`filtered: ${getObjectAttr(candidates)}`);
