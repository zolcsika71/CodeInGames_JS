
import lineReader from 'line-reader';


function getData() {




	function readLine () {

		let lineCounter = 1,
			humanCount,
			humans = [],
			zombies = [],
			myX = -Infinity,
			myY = -Infinity;

		lineReader.eachLine('test.txt', function(line) {
			if (line.length === 0)
				return false;

			//console.log('               ');
			//console.log(`lineCounter: ${lineCounter}`);
			//console.log(`line: ${line}`);
			//console.log(`length: ${line.length}`);
			//console.log('---------------');
			//console.log('               ');

			if (lineCounter === 1){

				let inputs = line.split(' ');

				myX = parseInt(inputs[0]);
				myY = parseInt(inputs[1]);

				//console.log('me: ');
				//console.log(`x: ${myX}  y: ${myY}`);

				lineCounter++;

			} else if (lineCounter === 2) {

				humanCount = parseInt(line);

				//console.log(`humanCount: ${humanCount}`);

				lineCounter++;

			} else if (lineCounter >= 3 && lineCounter <= 2 + humanCount) {
				

				let inputs = line.split(' '),
					id = inputs[0],
					x = inputs[1],
					y = inputs[2];

				//console.log('human: ');
				//console.log(`id: ${id} x: ${x} y: ${y}`);

				humans.push(new Human(id, x, y));
				lineCounter++;

			} else if (lineCounter === 3 + humanCount) {

				lineCounter++;

			} else {
				
				let inputs = line.split(' '),
					id = inputs[0],
					x = inputs[1],
					y = inputs[2],
					nextX = parseInt(inputs[3]),
					nextY = parseInt(inputs[4]);

				//console.log('zombie: ');
				//console.log(`id: ${id} x: ${x} y: ${y} nextX: ${nextX} nextY: ${nextY}`);

				zombies.push(new Zombie(id, x, y, nextX, nextY));
				lineCounter++;
			}
		});
		return {
			x: myX,
			y: myY,
			humans: humans,
			zombies: zombies
		};
	}

	let data = readLine();

	console.log(`GETDATA: ${data.x} ${data.y} ${data.humans.length} ${data.zombies.length}`);


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



let data = getData();

console.log(`RESULT: ${data.x} ${data.y} ${data.humans} ${data.zombies}`);









