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
        this.nodes = options.cy.nodes().filter(node => !node.isParent())

        this.isXNumeric = this.getIsNumericDimension(this.xDimension);
        this.isYNumeric = this.getIsNumericDimension(this.yDimension);

        this.rangeCount = this.options?.rangeCount || {x: null, y: null} 
        this.rangeStep = this.options?.rangeStep || {x: null, y: null}
        this.rangeStart = this.options?.rangeStart || {x: null, y: null}

        if (this.isXNumeric) {
          const range = this.getNumericRange(this.xDimension)
          this.rangeStart.x = options?.rangeStart?.x || range.min;
          if (!options?.rangeStep?.x) {
            this.rangeCount.x = 10;
            this.rangeStep.x = ((range.max-range.min) / this.rangeCount.x);
          } else {
            this.rangeStep.x = options?.rangeStep?.x;
            this.rangeCount.x = Math.ceil((range.max-range.min) / this.rangeStep.x);
          }
        }

        if (this.isYNumeric) {
          const range = this.getNumericRange(this.yDimension)
          this.rangeStart.y = options?.rangeStart?.y || range.min;
          if (!options?.rangeStep?.y) {
            this.rangeCount.y = 10;
            this.rangeStep.y = ((range.max-range.min) / this.rangeCount.y);
          } else {
            this.rangeStep.y = options.rangeStep.y;
            this.rangeCount.y = Math.ceil((range.max-range.min) / this.rangeStep.y);
          }
        }

        this.xCategories = options?.xCategories || this.getCategories(this.xDimension, 'x');
        this.yCategories = options?.yCategories || this.getCategories(this.yDimension, 'y');
        this.xPadding = options.xPadding,
        this.yPadding = options.yPadding

        this.cells = {};

        this.xCategories.forEach(xCat => {
            this.cells[xCat] = {};
            this.yCategories.forEach(yCat => {
                this.cells[xCat][yCat] = new Cell(xCat, yCat, []);
            });
        });


        this.nodes.forEach(node => {
            const xCategory = !this.isXNumeric? getNodeCategory(node, this.xDimension) : this.getNodeNumericalCategory(node, 'x');
            const yCategory = !this.isYNumeric? getNodeCategory(node, this.yDimension) : this.getNodeNumericalCategory(node, 'y');

            if (this.cells[xCategory] && this.cells[xCategory][yCategory]) {
                this.cells[xCategory][yCategory].nodes.push(node);
            }
        });
    }

    getCategories(dimension, axis) {
      var categories = new Set();
  
      if (axis === 'x' && this.isXNumeric) {
          const start = this.rangeStart.x;
          const step = this.rangeStep.x;
          const count = this.rangeCount.x;
  
          for (let i = 0; i < count; i++) {
              const binStart = (start + i * step);
              const binEnd = (binStart + step);
              categories.add(`${parseFloat(binStart).toFixed(2)}-${parseFloat(binEnd).toFixed(2)}`);
          }
      } else if (axis === 'y' && this.isYNumeric) {
          const start = this.rangeStart.y;
          const step = this.rangeStep.y;
          const count = this.rangeCount.y;
          console.log(start,step,count)
  
          for (let i = 0; i < count; i++) {
              const binStart = (start + i * step);
              const binEnd = (binStart + step);
              categories.add(`${parseFloat(binStart).toFixed(2)}-${parseFloat(binEnd).toFixed(2)}`);
          }
      } else {
          this.nodes.forEach(node => {
              const category = getNodeCategory(node, dimension);
              if (category !== null) {
                  categories.add(category);
              }
          });
      }
  
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

    isNumeric(value) {
      return !isNaN(parseFloat(value)) && isFinite(value);
    }
    
    getIsNumericDimension(dimension) {
      return this.nodes.every(node => this.isNumeric(getNodeCategory(node, dimension))|| getNodeCategory(node, dimension)==null);
    }

    getNumericRange(dimension) {
        let values = this.nodes.map(n => parseFloat(getNodeCategory(n, dimension))).filter(v => !isNaN(v));
        return {
          min: Math.min(...values),
          max: Math.max(...values)
        };
    }

    getNodeNumericalCategory(node, axis) {
      const getBin = (value, start, step, count, axis) => {
          for (let i = 0; i < count; i++) {
              const binStart = start + i * step;
              const binEnd = binStart + step;
              if (value >= binStart && value < binEnd) {
                if (axis == 'x'){
                  return this.xCategories[i]
                } else {
                  return this.yCategories[i]
                }
              }
          }
          
          if (axis == 'x'){
            return this.xCategories[this.xCategories.length-1]
          } else {
            return this.yCategories[this.yCategories.length-1]
          }
      };
  
      if (axis == 'x') {
          const xValue = parseFloat(getNodeCategory(node, this.xDimension));
          if (!isNaN(xValue)) {
              const xBin = getBin(xValue, this.rangeStart.x, this.rangeStep.x, this.rangeCount.x, 'x');
              if (xBin) return xBin;
          }
      }
  

      if (axis == 'y') {
          const yValue = parseFloat(getNodeCategory(node, this.yDimension));
          if (!isNaN(yValue)) {
              const yBin = getBin(yValue, this.rangeStart.y, this.rangeStep.y, this.rangeCount.y, 'y');
              if (yBin) return yBin;
          }
      }
  
      return null; 
    }

}