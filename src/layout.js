function SemanticGridLayout(options) {
    this.options = options;
}
  
SemanticGridLayout.prototype.run = function() {
    const options = this.options;
    const cy = options.cy;
  
    const nodes = cy.nodes();

    cy.trigger('layoutstart');
  
    nodes.forEach((node, i) => {
      node.position({
        x: i * 100,
        y: 100
      });
    });
  
    cy.one('layoutstop', options.stop || function () {});
    if (typeof options.ready === 'function') {
        options.ready();
    }
    cy.trigger('layoutstop');
}

module.exports = SemanticGridLayout;