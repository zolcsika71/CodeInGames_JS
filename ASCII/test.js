"use strict";


let str = " #  ##   ## ##  ### ###  ## # # ###  ## # # #   # # ###  #  ##   #  ##   ## ### # # # # # # # # # # ### ### ";

//let str = "000 000 000 ";
//let str = "Hello World!";

for (let j = 0; j < str.length; j += 4) {
    //console.error(`i: ${i}`);
    //console.error(`j: ${j}`);
    //let slice = str.slice(j, 4);
    //console.error(`${str}`);
    console.error(`${str.slice(j, j + 4)}`);
    //console.error(`${str.slice(j, j + 4).length}`);

    //letters.push(i, slice);
}


