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
        yPadding: 75,
        rangeCount: {x: null, y: null},
        rangeStep: {x: null, y: null},
        rangeStart: {x: null, y: null}
    },options);
}
  
SemanticGridLayout.prototype.run = function() {
  const options = this.options;
  const cy = options.cy;

  cy.trigger('layoutstart');

  const grid = new Grid(options);
  const layoutPromises = [];

  // Jalankan layout cola untuk setiap cell
  grid.forEachCell(cell => {
    layoutPromises.push(this.runLayout(cell, options, grid));
  });

  Promise.all(layoutPromises).then(() => {
    grid.updateCellsPosition();

    const unassignedEles = cy.collection(grid.unassignedNodes);

    if (unassignedEles.length > 0) {
      const unassignedLayout = unassignedEles.layout({
        name: 'cola',
        avoidOverlap: true,
        nodeSpacing: 10,
        maxSimulationTime: 1500
      });

      unassignedLayout.run();

      unassignedLayout.once('layoutstop', () => {
        const bounds = unassignedEles.boundingBox();

        // Geser ke pojok kanan atas
        const dx = grid.getTotalWidth() + options.xPadding * 2 - bounds.x1;
        const dy = 0 - bounds.y1;

        unassignedEles.positions(node => {
          const pos = node.position();
          return {
            x: pos.x + dx,
            y: pos.y + dy
          };
        });

        finalize.call(this); // panggil dengan konteks this yang benar
      });
    } else {
      finalize.call(this);
    }

    function finalize() {
      cy.batch(() => {
        // Geser semua node kategori ke posisi cell-nya
        grid.forEachCell(cell => {
          this.shiftNodesToCell(cell, options);
        });

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
    }
  });
};

SemanticGridLayout.prototype.destroy = function() {
  this.removeExistingGridElements();
}

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
    let position;
    let label

    if (grid.isXNumeric) {
      const tempLabel = cy.add(createLabels(`temp-x-label-${xIndex}`, cat, { x: 0, y: 0 }));
      const labelWidth = tempLabel.width()
      tempLabel.remove()
      label = cat.split('-')[0];

      position = {
        x: cell.position.x + (labelWidth + 10),
        y: totalHeight + 30
      }
    } else {
      label = cat
      position = {
        x: cell.position.x + (cell.size.width) /2,
        y: totalHeight + 30
      }
    }
    cy.add(createLabels(`x-label-${xIndex}`, label, position))
  })

  yCategories.forEach((cat, yIndex) => {
    const cell = grid.getCell(undefined, cat)
    let position;
    let label;
    if (grid.isYNumeric) {
      const tempLabel = cy.add(createLabels(`temp-y-label-${yIndex}`, cat, { x: 0, y: 0 }));
      const labelHeight = tempLabel.height()
      const labelWidth = tempLabel.width()
      tempLabel.remove()
      label = cat.split('-')[0];

      position = {
        x: 0 - labelWidth - 10,
        y: cell.position.y + (cell.size.height) - (labelHeight/2)
      }
    } else {
      label = cat
      position = {
        x: -100,
        y: cell.position.y + (cell.size.height/2)
      }
    }

    cy.add(createLabels(`y-label-${yIndex}`, label, position))
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

  const totalHeight = grid.getTotalHeight()

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
    const cell = grid.getCell(undefined, yCat)
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