import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { State, Change, Block } from 'slate';

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


it('adds node', () => {
    const operations = transform(addition);

    const operationsAddition = state.change().applyOperations(operations);

    expect(operationsAddition.state.toJS().document.nodes[0].data).toEqual({ name: 'initial' } );
    expect(operationsAddition.state.toJS().document.nodes[1].data).toEqual({ name: 'added' } );
    expect(operationsAddition).toEqual(addition);

});

it('removes node', () => {
    const operations = transform(removal);

    const operationsRemoval = addition.state.change().applyOperations(operations);

    expect(operationsRemoval.state.toJS().document.nodes.length).toEqual(1);
    expect(operationsRemoval.state.toJS().document.nodes[0].data).toEqual({ name: 'initial' } );
    expect(operationsRemoval.state.toJS()).toEqual(state.toJS());
});

it('does not matter the order of operations', () => {
    const addThenRemove  = state.change().applyOperations([...transform(addition), ...transform(removal)]);

    const removeThenAdd = state.change().applyOperations([...transform(removal), ...transform(addition) ]);

    expect(addThenRemove.state.toJS()).toEqual(removeThenAdd.state.toJS());
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
        p: [1],
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
        p: [1],
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

function transform(change) {
    const zeroJson = change.operations.map(operation => toZeroJSON({operation}));

    return zeroJson.map(op => toSlateOperations(op));
}

function toZeroJSON({ operation }) {
    return {
        p: operation.path,
        [map[operation.type]]: operation.node,
    }
}

function toSlateOperations(operation) {
    const slateOp = {
        path: operation.p,
    };

    Object.keys(inverseMap).forEach(key => {
        const node = operation[key];
        if(node !== undefined) {
            slateOp['node'] = node;
            slateOp['type'] = inverseMap[key];
        }
    });
    return slateOp;
}


/**
 * keys need to be unique across clients. can be done with uuids but prob not sustainable for character level changes
 *
 * using json0 operational transforms are O(n^2) so prob not scalable for character level changes or even large numbers of blocks
 */