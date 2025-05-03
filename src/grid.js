import { getNodeCategory } from './utils.js';

class Cell {
    constructor(xCategory, yCategory) {
        this.xCategory = xCategory;
        this.yCategory = yCategory;
        this.position = { x: 0, y: 0 };
        this.size = { width: 0, height: 0 };
        this.nodes = [];
    }
    
}

export default class Grid {
    constructor(options) {
        this.xDimension = options.xDimension
        this.yDimension = options.yDimension
        this.nodes = options.cy.nodes()
        this.xCategories = options?.xCategories || this.getCategories(this.xDimension);
        this.yCategories = options?.yCategories || this.getCategories(this.yDimension);
        this.xPadding = options.xPadding,
        this.yPadding = options.yPadding
        this.cells = {};

        console.log('X Categories:', this.xCategories);
        console.log('Y Categories:', this.yCategories);

        this.xCategories.forEach(xCat => {
            this.cells[xCat] = {};
            this.yCategories.forEach(yCat => {
                this.cells[xCat][yCat] = new Cell(xCat, yCat, []);
            });
        });

        this.nodes.forEach(node => {
            const xCategory = getNodeCategory(node, this.xDimension);
            const yCategory = getNodeCategory(node, this.yDimension);

            if (this.cells[xCategory] && this.cells[xCategory][yCategory]) {
                this.cells[xCategory][yCategory].nodes.push(node);
            }
        });
    }

    getCategories(dimension) {
        var categories = new Set();
        
        this.nodes.forEach(node => {
          const category = getNodeCategory(node, dimension);
          if (category !== null) {
            categories.add(category);
          }
        });

        return Array.from(categories);
    }

    forEachCell(callback) {
        Object.entries(this.cells).forEach(([xCat, yCells]) => {
            Object.entries(yCells).forEach(([yCat, cell]) => {
                callback(cell, xCat, yCat);
            });
        });
    }

    getTotalHeight() {
        let totalHeight = 0;
        Object.keys(this.sizeMatrix[this.xCategories[0]]).forEach((col) => {
            totalHeight += this.sizeMatrix[this.xCategories[0]][col].height;
        })

        return totalHeight
    }

    getTotalWidth() {
        let totalWidth = 0
        Object.keys(this.sizeMatrix).forEach((row) => {
            totalWidth += this.sizeMatrix[row][this.yCategories[0]].width;
        });

        return totalWidth
    }

    getCell(x = undefined, y = undefined) {
        let categoryX = x? x : this.xCategories[0];
        let categoryY = y? y : this.yCategories[0];
        return this.cells[categoryX][categoryY]
    }

    getCellSizeMatrix() {
        let sizeMatrix = []

        this.yCategories.forEach(yCat => {
            let maxY = 0;
            this.xCategories.forEach(xCat => {
                const cell = this.cells[xCat][yCat];
                const size = cell.size
                if (maxY < size.height + 2*this.yPadding){
                    maxY = size.height + 2*this.yPadding
                }
            })
            this.xCategories.forEach(xCat => {
                sizeMatrix[xCat] = sizeMatrix[xCat] || {};
                sizeMatrix[xCat][yCat] = { ...sizeMatrix[xCat][yCat], height: maxY };
            });
        })

        this.xCategories.forEach(xCat => {
            let maxX = 0;
            this.yCategories.forEach(yCat => {
                const cell = this.cells[xCat][yCat];
                const size = cell.size
                if (maxX < size.width + 2*this.xPadding) {
                    maxX = size.width + 2*this.xPadding;
                }

            })
            this.yCategories.forEach(yCat => {
                sizeMatrix[xCat] = sizeMatrix[xCat] || {};
                sizeMatrix[xCat][yCat] = { ...sizeMatrix[xCat][yCat], width: maxX };
            });
        })
        return sizeMatrix;
    }

    updateCellsPosition() {
        this.sizeMatrix = this.getCellSizeMatrix();

        let prevPos = { x: 0, y: 0 };
        let prevSize = { width: 0, height: 0 };
        let size
        Object.keys(this.cells).forEach((xCat, i) => {
            Object.keys(this.cells[xCat]).reverse().forEach((yCat, j) => {
                const cell = this.cells[xCat][yCat];

                cell.position.x =  prevSize.width;
                cell.position.y = prevPos.y + prevSize.height;

                size = this.sizeMatrix[xCat][yCat];
                cell.size.width = size.width;
                cell.size.height = size.height;

                prevPos.y = cell.position.y;
                prevSize.height = cell.size.height;

            });

            prevPos.y = 0
            prevSize.height = 0;
            prevSize.width += size.width;
        });
    }

}