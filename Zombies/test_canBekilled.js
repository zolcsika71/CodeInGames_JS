const

	MY_KILL_RANGE = 2000,
	MY_KILL_RANGE_SQUARE = MY_KILL_RANGE * MY_KILL_RANGE,
	ZOMBIE_KILL_RANGE = 400,
	ZOMBIE_KILL_RANGE_SQUARE = ZOMBIE_KILL_RANGE * ZOMBIE_KILL_RANGE,
	ZOMBIE_MOVE_RANGE = 400,
	ZOMBIE_MOVE_RANGE_SQUARE = ZOMBIE_MOVE_RANGE * ZOMBIE_MOVE_RANGE,
	MY_MOVE_RANGE = 1000,
	MY_MOVE_RANGE_SQUARE = MY_MOVE_RANGE * MY_MOVE_RANGE;




function getObjectAttr(x) {
	return JSON.stringify(x, null, 2);
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


let me = new Point(5000, 0),
	zombie = new Point(2737, 6831),
	human = new Point(950, 6000);

/*let meToHuman = me.distSquare(human) - MY_MOVE_RANGE_SQUARE,
	zombieToHuman = zombie.distSquare(human),
	meStepsToHuman = meToHuman / MY_MOVE_RANGE_SQUARE,
	zombieStepsToHuman = zombieToHuman / ZOMBIE_MOVE_RANGE_SQUARE + ((2 * Math.sqrt(zombieToHuman)) / ZOMBIE_MOVE_RANGE) + 1;


console.log(`${meStepsToHuman}, ${zombieStepsToHuman}`);*/



let meToHuman = me.dist(human) - MY_MOVE_RANGE,
	zombieToHuman = zombie.dist(human),
	meStepsToHuman = Math.floor(meToHuman / MY_MOVE_RANGE),
	zombieStepsToHuman = Math.floor(zombieToHuman / ZOMBIE_MOVE_RANGE) + 2;



console.log(`${meStepsToHuman}, ${zombieStepsToHuman}`);

