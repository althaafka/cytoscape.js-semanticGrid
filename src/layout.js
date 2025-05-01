import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import { getNodeCategory } from './utils';
import Grid from './class/grid';

cytoscape.use(cola);

function SemanticGridLayout(options) {
    this.options = Object.assign({
        showGridLines: true,
        showGridLabels: true,
        gridLineColor: '#666666',
        labelColor: '#666666',
        labelFontSize: 12,
        xSpacing: 200,
        ySpacing: 150,
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

  Object.entries(grid.cells).forEach(([_, yCells]) => {
    Object.entries(yCells).reverse().forEach(([_, cell]) => {
      layoutPromises.push(this.runLayoutWithoutBoundingBox(cell, options, grid));
    });
  });

  Promise.all(layoutPromises).then(() => {
    grid.updateCellsPosition()
    console.log("final grid", grid)

    // Geser node ke posisi cell yang sudah diperbarui
    Object.entries(grid.cells).forEach(([_, yCells]) => {
      Object.entries(yCells).forEach(([_, cell]) => {
        const eles = cy.collection(cell.nodes);
        const bounds = eles.boundingBox();
      
        const dx = cell.position.x - bounds.x1 + 100; // padding
        const dy = cell.position.y - bounds.y1 + 75;
      
        eles.positions(node => {
          const pos = node.position();
          return {
            x: pos.x + dx,
            y: pos.y + dy
          };
        });
      });
    });


    cy.batch(() => {
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



SemanticGridLayout.prototype.runLayoutWithoutBoundingBox = function(cell, options, grid) {
  const cy = this.options.cy;
  const padding = 20;
  const eles = cy.collection(cell.nodes);

  return new Promise(resolve => {
    const layout = eles.layout({
      name: 'cola',
      avoidOverlap: true,
      nodeSpacing: node => 0,
      edgeLength: 60,
      maxSimulationTime: 1500
    });

    layout.run();

    layout.once('layoutstop', () => {
      const bounds = eles.boundingBox();
      
      cell.size.width = bounds.w;
      cell.size.height = bounds.h;

      console.log("cell:", cell)
      console.log("bound:", bounds)


      eles.positions(node => {
        const pos = node.position();
        return {
          x: pos.x,
          y: pos.y
        };
      });

      resolve(); // ✅ Promise selesai
    });
  });
};



// Remove existing grid elements
SemanticGridLayout.prototype.removeExistingGridElements = function() {
  const cy = this.options.cy;
  cy.elements('[type="semantic-grid-label"], [type="semantic-grid-line"]').remove();
};

SemanticGridLayout.prototype.addGridLabels = function(xCategories, yCategories, options, grid) {
  console.log("grid", grid.sizeMatrix)
  const cy = this.options.cy;
  const xSpacing = options.xSpacing;
  const ySpacing = options.ySpacing;

  let totalHeight = 0;
  Object.keys(grid.sizeMatrix[xCategories[0]]).forEach((col) => {
      totalHeight += grid.sizeMatrix[xCategories[0]][col].height;
  })
  totalHeight = grid.cells[xCategories[0]][yCategories[yCategories.length-1]].position.y + grid.cells[xCategories[0]][yCategories[yCategories.length-1]].size.height

  console.log('Total Height:', totalHeight);

  xCategories.forEach((cat, xIndex) => {
    cy.add({
      group: 'nodes',
      data: {
        id: `x-label-${xIndex}`,
        label: cat,
        type: 'semantic-grid-label',
        labelType: 'x-axis'
      },
      position: {
        x: grid.cells[cat][yCategories[0]].position.x + (grid.cells[cat][yCategories[0]].size.width) /2,
        y: totalHeight + 30
      },
      selectable: false,
      grabbable: false
    })
  })

  yCategories.forEach((cat, yIndex) => {
    cy.add({
      group: 'nodes',
      data: {
        id: `y-label-${yIndex}`,
        label: cat,
        type: 'semantic-grid-label',
        labelType: 'y-axis'
      },
      position: {
        x: -100,
        y: grid.cells[xCategories[0]][cat].position.y + ((grid.cells[xCategories[0]][cat].size.height) / 2)
      },
      selectable: false,
      grabbable: false
    })
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
  const xSpacing = options.xSpacing;
  const ySpacing = options.ySpacing;

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
    const xPos = grid.cells[xCat][yCategories[0]].position.x;

    // console.log('xPos:', xPos);

    cy.add([
      {
        group: 'nodes',
        data: { 
          id: `vertical-line-${xIndex}-start`,
          type: 'semantic-grid-line'
        },
        position: { 
          x: xPos,
          y: 0
        },
        selectable: false,
        grabbable: false
      },
      {
        group: 'nodes',
        data: { 
          id: `vertical-line-${xIndex}-end`,
          type: 'semantic-grid-line'
         },
        position: { 
          x: xPos, 
          y: totalHeight + 60
        },
        selectable: false,
        grabbable: false
      },
      {
        group: 'edges',
        data: {
          id: `vertical-line-edge-${xIndex}`,
          source: `vertical-line-${xIndex}-start`,
          target: `vertical-line-${xIndex}-end`,
          type: 'semantic-grid-line',
          label: ""
        },
      }
    ]);
  });

  let totalWidth = 0;
  Object.keys(grid.sizeMatrix).forEach((row) => {
      totalWidth += grid.sizeMatrix[row][yCategories[0]].width;
  });

  // Add horizontal grid lines
  yCategories.forEach((yCat, yIndex) => {
    console.log('yCat:', yCat);
    const cell = grid.cells[xCategories[0]][yCat];
    const yPos = cell.position.y  + cell.size.height;

    console.log('yPos:', yPos);

    cy.add([
      {
        group: 'nodes',
        data: { 
          id: `horizontal-line-${yIndex}-start`,
          type: 'semantic-grid-line'
        },
        position: { 
          x: -60, 
          y: yPos
        },
        selectable: false,
        grabbable: false
      },
      {
        group: 'nodes',
        data: { 
          id: `horizontal-line-${yIndex}-end`,
          type: 'semantic-grid-line'
        },
        position: { 
          x: totalWidth,
          y: yPos
        },
        selectable: false,
        grabbable: false
      },
      {
        group: 'edges',
        data: {
          id: `horizontal-line-edge-${yIndex}`,
          source: `horizontal-line-${yIndex}-start`,
          target: `horizontal-line-${yIndex}-end`,
          type: 'semantic-grid-line',
          label: ""
        },
      }
    ]);
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