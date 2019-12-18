"use strict";

let zombie = [
    {id: 0}, {id: 1}, {id: 2}, {id: 3}, {id: 4},
],
    filteredBy = [2, 3];


function reduce(array, idArray) {
    return array.filter(arrayElement => {
        return !idArray.some(idArrayElement => {
            return idArrayElement === arrayElement.id;
        })
    })
}

function some(array) {
    return array.some(idArrayElement => {
        return idArrayElement !== 1;
    })
}

console.log(`${reduce(zombie, filteredBy)}`);

