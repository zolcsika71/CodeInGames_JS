"use strict";

let str = [];
str.push(" #  ##   ## ##  ### ###  ## # # ###  ## # # #   # # ###  #  ##   #  ##   ## ### # # # # # # # # # # ### ### ");
str.push("# # # # #   # # #   #   #   # #  #    # # # #   ### # # # # # # # # # # #    #  # # # # # # # # # #   #   # ");
str.push("### ##  #   # # ##  ##  # # ###  #    # ##  #   ### # # # # ##  # # ##   #   #  # # # # ###  #   #   #   ## ");
str.push("# # # # #   # # #   #   # # # #  #  # # # # #   # # # # # # #    ## # #   #  #  # # # # ### # #  #  #       ");
str.push("# # ##   ## ##  ### #    ## # # ###  #  # # ### # # # #  #  #     # # # ##   #  ###  #  # # # #  #  ###  #  ");

const
    L_WIDTH = 4,
    L_HEIGHT = 5,
    TEXT = "E",
    ABC_LENGTH = 27;



let letters = [],
    rowLength;

function testLetters(letters) {
    console.error(`${letters.length}`);
    for (let i = 0; i < letters.length; i += L_WIDTH) {
        //let lettersRow = letters[i];
        //if (!rowLength)
            //rowLength = lettersRow.length;
        //console.error(`${lettersRow.length}`);

        //console.error(`${i} ${j}`);
        console.error(`${letters[i][L_WIDTH]}`);
    }
}

function BB(x) {
    return JSON.stringify(x, null, 2);
}

for (let i = 0; i < L_HEIGHT; i++) {

    let row = str[i];

    for (let j = 0; j < row.length; j += L_WIDTH) {
        let slice = row.slice(j, j + L_WIDTH);
        //console.error(`i: ${i} j: ${j} slice: ${slice}`);
        letters.push(i, slice);
    }
}

testLetters(letters);
//console.error(`${BB(letters)}`);




