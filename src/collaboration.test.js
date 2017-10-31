import React from 'react';
import { Block, Change, State } from 'slate';
import ShareDB from 'sharedb';
const backend = new ShareDB();


function createDoc(state) {
    return new Promise(resolve => {
        const connection = backend.connect();
        const doc = connection.get('articles', 'article1');
        doc.fetch(function (err) {
            if (err) throw err;
            doc.create(state, () => resolve(doc));
        });
    })
}

const initialNode = {  kind: 'block', type: 'text', data: { name: 'initial'} };
const initialNode2 = {  kind: 'block', type: 'text', data: { name: 'second node'} };

const initialStateJS = {
    document: {
        nodes: [
            initialNode
        ]
    }
};

const state = State.fromJSON(initialStateJS);

const addition = state.change()
    .insertNodeByKey(state.document.key, 1, Block.create({ type: 'text', data: { name: 'added' }}));

const removal = addition.state.change()
    .removeNodeByKey(addition.state.document.nodes.get(1).key);


const transformer = doc => (change, version) => {
    return new Promise((resolve, reject) => {
        doc.on('op', (ops) => {
            const operations = ops.map(toSlateOperations);

            return resolve({
                operations
            });
        });
        doc.on('error', reject);


        const zeroJsonOps = change.operations.map(operation => toZeroJSON({ operation }));

        /* We need to fake the version number since it is used to assign op version number here:
        https://github.com/share/sharedb/blob/b33bdd59ce4f2c55604801d779554add94a12616/lib/client/connection.js#L393
        */
        if(version !== undefined) {
            doc.version = version;
        }

        doc.submitOp(zeroJsonOps, {source: true}, reject);
    });
};


let transform;
beforeEach(() => {
    const jsState = state.toJS();
    return createDoc(jsState)
        .then((doc) => {
            transform = transformer(doc);
        });
});

it('adds node', () => {
    return transform(addition)
        .then(({operations}) => {
            const transformed = operations;
            const operationsAddition = state.change().applyOperations(transformed);

            expect(operationsAddition.state.toJS().document.nodes[0].data).toEqual({ name: 'initial' });
            expect(operationsAddition.state.toJS().document.nodes[1].data).toEqual({ name: 'added' });
            expect(operationsAddition.state.toJS()).toEqual(addition.state.toJS());
        });
});

it('removes node', () => {
    return transform(removal)
        .then(({operations}) => {
            const transformed = operations;
            const operationsRemoval = addition.state.change().applyOperations(transformed);

            expect(operationsRemoval.state.toJS().document.nodes.length).toEqual(1);
            expect(operationsRemoval.state.toJS().document.nodes[0].data).toEqual({ name: 'initial' });
            expect(operationsRemoval.state.toJS()).toEqual(state.toJS());
        });
});

it('keeps version in operation', () => {
    return transform(addition, 4)
        .then(({operations}) => {
            const transformed = operations;

            expect(transformed[0].v).toEqual(1);
        });
});

it('does not matter the order of operations', () => {
    const additionPromise = transform(addition);
    const removalPromise = transform(removal);

    return Promise.all([ additionPromise, removalPromise])
        .then(([ transformedAddition, transformedRemoval]) => {

            const removeThenAdd = state.change().applyOperations([...transformedRemoval.operations, ...transformedAddition.operations]);

            expect(removeThenAdd.state.toJS().document.nodes.length).toEqual(1);
            expect(removeThenAdd.state.toJS().document.nodes[0].data).toEqual({ name: 'initial' });
            expect(removeThenAdd.state.toJS()).toEqual(state.toJS());
        });
});

it('slate blocks has default node with kind text and leaves', () => {

});

it('transforms an insert_node operation', () => {
    const slateOperation = {
        type: 'insert_node',
        path: [ 1 ],
        node: { 'kind': 'block', "data": { "name": "added" }, "isVoid": false, "nodes": [], "type": "text" }
    };

    const transformedOperation = {
        p: ['document', 'nodes', 1],
        li: slateOperation.node
    };

    expect(toZeroJSON({ operation: slateOperation })).toEqual(transformedOperation)

});

it('transforms an remove_node operation', () => {
    const slateOperation = {
        type: 'remove_node',
        path: [ 1 ],
        node: { 'kind': 'block', "data": { "name": "added" }, "isVoid": false, "nodes": [], "type": "text" },
    };



    const transformedOperation = {
        p: ['document', 'nodes', 1],
        ld: slateOperation.node
    };

    expect(toZeroJSON({ operation: slateOperation })).toEqual(transformedOperation)
});

const map = {
    remove_node: 'ld',
    insert_node: 'li'
};

const inverseMap = {};

Object.keys(map).forEach(key => {
    inverseMap[map[key]] = key;
});

function toZeroJSON({ operation }) {
    const [path, ...rest] = operation.path; // TODO: work out why this only seems to work with first element in path
    return {
        p: ['document', 'nodes', path],
        [map[operation.type]]: operation.node,
        // v: version,
    }
}

function toSlateOperations(operation) {
    const path = operation.p.filter(key => !(['document', 'nodes'].includes(key) ));

    const slateOp = {};

    Object.keys(inverseMap).forEach(key => {
        const node = operation[key];
        if(node !== undefined) {
            slateOp['node'] = node;
            slateOp['type'] = inverseMap[key];
            slateOp['path'] = node.kind === 'text' ? [...path, 0] : path;
            return;
        }
    });
    return slateOp;
}


/**
 * keys need to be unique across clients. can be done with uuids but prob not sustainable for character level changes
 *
 * using json0 operational transforms are O(n^2) so prob not scalable for character level changes or even large numbers of blocks
 */