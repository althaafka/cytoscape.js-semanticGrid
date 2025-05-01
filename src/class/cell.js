const NODE_SPACING_X = 40
const NODE_SPACING_Y = 30

export default class Cell {
    constructor(xCategory, yCategory) {
        this.xCategory = xCategory;
        this.yCategory = yCategory;
        this.position = { x: 0, y: 0 };
        this.size = { width: 0, height: 0 };
        this.nodes = [];
    }
    
}