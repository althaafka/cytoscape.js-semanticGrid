export function getNodeCategory(node, pathOrFunction){
    if (typeof pathOrFunction === 'function') {
      return pathOrFunction(node);
    }
  
    const parts = pathOrFunction.split('.');
    let value = node.data();
  
    for (let i = 0; i < parts.length; i++) {
      value = value[parts[i]];
      if (value === undefined) {
        return null;
      }
    }
    return value;
}

export function createLabels(id, label, position) {
  return {
    group: 'nodes',
    data: {
      id: id,
      label: label,
      type: 'semantic-grid-label'
    },
    position: {
      x: position.x,
      y: position.y
    },
    selectable: false,
    grabbable: false
  }
}

export function createLines(idN1, idN2, idE, pos1, pos2,) {
  return [
    {
      group: "nodes",
      data: {
        id: idN1,
        type: 'semantic-grid-line'
      },
      position: {
        x: pos1.x,
        y: pos1.y
      },
      selectable: false,
      grabbable: false
    },
    {
      group: "nodes",
      data: {
        id: idN2,
        type: 'semantic-grid-line'
      },
      position: {
        x: pos2.x,
        y: pos2.y
      },
      selectable: false,
      grabbable: false
    },
    {
      group: 'edges',
      data: {
        id: idE,
        source: idN1,
        target: idN2,
        type: 'semantic-grid-line',
        label: ""
      },
    }

  ]
}