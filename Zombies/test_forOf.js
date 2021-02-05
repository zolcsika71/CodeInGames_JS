
function getObjectAttr(x) {
	return JSON.stringify(x, null, 2);
}

let numbers = [10, 20, 30];


// working
for (let i = 0; i < numbers.length; i++) {
	numbers[i] = 1;
}

// not working
/*for (let number of numbers) {
	number = 1;
}*/

console.log(`${getObjectAttr(numbers)}`);

