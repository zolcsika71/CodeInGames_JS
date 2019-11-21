"use strict";

class LIFO {

    constructor(item) {
        this.itemArray = [];
    }

    set addItem (item) {
        this.item = item;
        this.itemArray.push(item);
    }

    lastItem () {
        let returnValue;
        if (this.itemArray.length === 1)
            returnValue = this.itemArray[0];
        else {
            returnValue = this.itemArray[0];
            this.itemArray = this.itemArray.slice(1);
        }
        return returnValue;
    }
}
