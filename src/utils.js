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

