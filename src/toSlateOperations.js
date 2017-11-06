const map = {
    remove_node: 'ld',
    insert_node: 'li'
};

const inverseMap = {};

Object.keys(map).forEach(key => {
    inverseMap[map[key]] = key;
});

function toSlateOperations(operation) {
    const path = operation.p.filter(key => !(['document', 'nodes'].includes(key) ));

    const slateOp = {};

    Object.keys(inverseMap).forEach(key => {
        const node = operation[key];
        if(node !== undefined) {
            slateOp['node'] = node;
            slateOp['type'] = inverseMap[key];
            slateOp['path'] = node.kind === 'text' ? [...path, 0] : [...path];
            return;
        }
    });
    return slateOp;
}

export default toSlateOperations;
