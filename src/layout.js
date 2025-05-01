import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import { createLabels, createLines } from './utils';
import Grid from './grid';

cytoscape.use(cola);

function SemanticGridLayout(options) {
    this.options = Object.assign({
        showGridLines: true,
        showGridLabels: true,
        gridLineColor: '#666666',
        labelColor: '#666666',
        labelFontSize: 12,
        xPadding: 100,
        yPadding: 75
    },options);
}
  
SemanticGridLayout.prototype.run = function() {
  const options = this.options;
  const cy = options.cy;

  cy.trigger('layoutstart');

  const grid = new Grid(options);

  const layoutPromises = [];

  grid.forEachCell(cell => {
    layoutPromises.push(this.runLayout(cell, options, grid));
  })

  Promise.all(layoutPromises).then(() => {
    grid.updateCellsPosition()

    cy.batch(() => {

      grid.forEachCell(cell => {
        this.shiftNodesToCell(cell,options)
      })

      this.removeExistingGridElements();

      if (options.showGridLabels) {
        this.addGridLabels(grid.xCategories, [...grid.yCategories].reverse(), options, grid);
      }

      if (options.showGridLines) {
        this.addGridLines(grid.xCategories, [...grid.yCategories].reverse(), options, grid);
      }
    });

    if (typeof options.ready === 'function') {
      options.ready();
    }

    cy.trigger('layoutstop');
  });
};



SemanticGridLayout.prototype.runLayout = function(cell, options, grid) {
  const cy = this.options.cy;
  const eles = cy.collection(cell.nodes);

  return new Promise(resolve => {
    const layout = eles.layout({
      name: 'cola',
      avoidOverlap: true,
      nodeSpacing: node => 0,
      maxSimulationTime: 1500
    });

    layout.run();

    layout.once('layoutstop', () => {
      const bounds = eles.boundingBox();
      
      cell.size.width = bounds.w;
      cell.size.height = bounds.h;

      eles.positions(node => {
        const pos = node.position();
        return {
          x: pos.x,
          y: pos.y
        };
      });

      resolve();
    });
  });
};

SemanticGridLayout.prototype.shiftNodesToCell = function(cell, options) {
  const cy = this.options.cy;
  const eles = cy.collection(cell.nodes);
  const bounds = eles.boundingBox();

  const dx = cell.position.x - bounds.x1 + options.xPadding;
  const dy = cell.position.y - bounds.y1 + options.yPadding;

  eles.positions(node => {
    const pos = node.position();
    return {
      x: pos.x + dx,
      y: pos.y + dy
    };
  });
}

// Remove existing grid elements
SemanticGridLayout.prototype.removeExistingGridElements = function() {
  const cy = this.options.cy;
  cy.elements('[type="semantic-grid-label"], [type="semantic-grid-line"]').remove();
};

SemanticGridLayout.prototype.addGridLabels = function(xCategories, yCategories, options, grid) {
  const cy = this.options.cy;

  const totalHeight = grid.getTotalHeight()

  xCategories.forEach((cat, xIndex) => {
    const cell = grid.getCell(cat, undefined)
    const position = {
      x: cell.position.x + (cell.size.width) /2,
      y: totalHeight + 30
    }
    cy.add(createLabels(`x-label-${xIndex}`, cat, position))
  })

  yCategories.forEach((cat, yIndex) => {
    const cell = grid.getCell(undefined, cat)
    const position = {
      x: -100,
      y: cell.position.y + (cell.size.height/2)
    }
    cy.add(createLabels(`y-label-${yIndex}`, cat, position))
  })

  cy.style()
    .selector('node[type="semantic-grid-label"]')
    .style({
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'color': options.labelColor,
      'font-size': options.labelFontSize,
      'background-opacity': 0,
      'border-width': 0,
    })
    .update();
}

SemanticGridLayout.prototype.addGridLines = function(xCategories, yCategories, options, grid) {
  console.log("grid lines")
  const cy = this.options.cy;

  // Define grid line styles in the stylesheet
  cy.style()
    .selector('edge[type="semantic-grid-line"]')
    .style({
      'width': 1,
      'line-color': options.gridLineColor || '#dddddd',
      'opacity': 0.5,
      'line-style': 'dashed',
      'curve-style': 'bezier',
    })
    .update();
  
  cy.style()
    .selector('node[type="semantic-grid-line"]')
    .style({
      'width': 1,
      'height': 1,
      'background-opacity': 0,
      'border-width': 0,
      'content': '' 
    })
    .update();

  let totalHeight = 0;
  Object.keys(grid.sizeMatrix[xCategories[0]]).forEach((col) => {
      totalHeight += grid.sizeMatrix[xCategories[0]][col].height;
  })

  // Add vertical grid lines
  xCategories.forEach((xCat, xIndex) => {
    const xPos = grid.getCell(xCat, undefined).position.x;

    cy.add(
      createLines(
        `vertical-line-${xIndex}-start`, 
        `vertical-line-${xIndex}-end`,
        `vertical-line-edge-${xIndex}`, 
        {x: xPos, y: 0},
        {x: xPos, y: totalHeight+60}
      )
    )

  });

  let totalWidth = grid.getTotalWidth()

  // Add horizontal grid lines
  yCategories.forEach((yCat, yIndex) => {
    const cell = grid.cells[xCategories[0]][yCat];
    const yPos = cell.position.y + cell.size.height;

    cy.add(
      createLines(
        `horizontal-line-${yIndex}-start`,
        `horizontal-line-${yIndex}-end`,
        `horizontal-line-edge-${yIndex}`,
        {x: -60, y: yPos},
        {x: totalWidth, y: yPos}
      )
    )
  });
};


if (typeof cytoscape !== 'undefined') {
  cytoscape('layout', 'semanticGrid', SemanticGridLayout);
}

export default function register(cytoscape) {
if (!cytoscape) {
  throw new Error('Cytoscape is not defined');
}
cytoscape('layout', 'semanticGrid', SemanticGridLayout);
}