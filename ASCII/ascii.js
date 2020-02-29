"use strict";

function BB(x) {
    return JSON.stringify(x, null, 2);
}

function testLetters(letters) {
    for (let i = 0; i < L_HEIGHT; i++) {
        let lettersRow = letters[i];
        //console.error(`${lettersRow.length}`);
        for (let j = 0; j < lettersRow.length; j++) {
            //console.error(`${i} ${j}`);
            console.error(`${lettersRow[j]}`);
        }
    }
}

function printLetter(letters) {

}

const
    L_WIDTH = parseInt(readline()),
    L_HEIGHT = parseInt(readline()),
    TEXT = readline();

let letters = [];



for (let i = 0; i < L_HEIGHT; i++) {

    let row = (readline());

    for (let j = 0; j < row.length; j += L_WIDTH) {
        let slice = row.slice(j, j + L_WIDTH);
        console.error(`i: ${i} j: ${j} slice: ${slice}`);
        letters.push(i, slice);
    }
}

//console.error(`${BB(letters)}`);


// Write an action using console.log()
// To debug: console.error('Debug messages...');

console.log('answer');
