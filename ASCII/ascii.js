const
    L_WIDTH = parseInt(readline()),
    L_HEIGHT = parseInt(readline()),
    TEXT = readline(),
    ABC_LENGTH = 27,
    abcId = {
        A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25
    };

let letters = [],
    rows = [],
    ABC = [];

function createABC(ABC) {
    for (let i = 0; i < L_HEIGHT; i++) {
        let row = readline();
        ABC.push(row);
        //console.error(ABC[i]);
    }
}

function testInput(ABC, L_WIDTH, L_HEIGHT, TEXT) {

    console.error(`width: ${L_WIDTH}`);
    console.error(`height: ${L_HEIGHT}`);
    console.error(`text: ${TEXT}`);

    for (let i = 0; i < L_HEIGHT; i++)
        console.error(ABC[i]);

}

function createLetters(letters) {
    for (let j = 0; j < ABC_LENGTH * L_WIDTH; j += L_WIDTH) {
        for (let i = 0; i < L_HEIGHT; i++) {
            let row = ABC[i];
            //console.error(`${i} ${j}`);
            let slice = row.slice(j, j + L_WIDTH);
            letters.push(slice);
        }
    }
}

function initRows(rows) {
    for (let i = 0; i < L_HEIGHT; i++)
        rows[i] = '';
}

function addLetterToRows(rows, letters, letterPosition) {
    let index = 0;
    for (let i = letterPosition * L_HEIGHT; i < letterPosition * L_HEIGHT + L_HEIGHT; i++) {
        rows[index] = rows[index].concat(letters[i]);
        index++;
    }
}

function createRows(rows, letters, abcId, string) {
    let letter;

    for (let i = 0; i < string.length; i++) {
        letter = string.slice(i, i + 1);
        //console.error(letter, abcId[letter]);
        if (abcId[letter] !== undefined)
            addLetterToRows(rows, letters, abcId[letter]);
        else
            addLetterToRows(rows, letters, ABC_LENGTH - 1);
    }
}

function printRows(rows) {
    for (let row of rows)
        console.log(row);
}



createABC(ABC);
testInput(ABC, L_WIDTH, L_HEIGHT, TEXT);
createLetters(letters);
initRows(rows);
createRows(rows, letters, abcId, TEXT);

printRows(rows);
