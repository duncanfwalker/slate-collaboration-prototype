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

const changeAfterAdd = state.change()
    .insertNodeByKey(state.document.key, 1, Block.create({ type: 'text', data: { name: 'added' }}));

const key = changeAfterAdd.state.document.nodes.get(1).key;

const changeAfterRemoval = changeAfterAdd.state.change()
    .removeNodeByKey(key);


it('adds node', () => {
    const addOperationChange = state.change().applyOperations(transformOperations(changeAfterAdd))

    expect(addOperationChange.state.toJS().document.nodes[0].data).toEqual({ name: 'initial' } )
    expect(addOperationChange.state.toJS().document.nodes[1].data).toEqual({ name: 'added' } )
    expect(addOperationChange).toEqual(changeAfterAdd)

});

it('removes node', () => {
    const removeOperationChange = changeAfterAdd.state.change().applyOperations(transformOperations(changeAfterRemoval))
    
    expect(removeOperationChange.state.toJS().document.nodes.length).toEqual(1)
    expect(removeOperationChange.state.toJS().document.nodes[0].data).toEqual({ name: 'initial' } )
    expect(removeOperationChange.state.toJS()).toEqual(state.toJS())
});

it('does not matter the order of operations', () => {
    const addThenRemove  = state.change().applyOperations([...transformOperations(changeAfterAdd), ...transformOperations(changeAfterRemoval)])

    const removeThenAdd = state.change().applyOperations([...transformOperations(changeAfterRemoval), ...transformOperations(changeAfterAdd) ])

    expect(addThenRemove.state.toJS()).toEqual(removeThenAdd.state.toJS())
    
})

it('slate blocks has default node with kind text and leaves', () => {

})

it('transforms an insert_node operation', () => {
    const slateOperation = { 
        type: 'insert_node',
        path: [ 1 ],
        node: { 'kind': 'block', "data": { "name": "added" }, "isVoid": false, "nodes": [], "type": "text" } 
    }



    const transformedOperation = {
        p: [1],
        li: slateOperation.node
    }

    expect(transformOperations({ operations: [ slateOperation ] })).toEqual([transformedOperation])

})

it('transforms an remove_node operation', () => {
    const slateOperation = { 
        type: 'remove_node',
        path: [ 1 ],
        node: { 'kind': 'block', "data": { "name": "added" }, "isVoid": false, "nodes": [], "type": "text" } 
    }



    const transformedOperation = {
        p: [1],
        ld: slateOperation.node
    }

    expect(transformOperations({ operations: [ slateOperation ] })).toEqual([transformedOperation])
})

function transformOperations({ state, operations }) {
    console.log(operations)
    const map = {
        remove_node: 'ld',
        insert_node: 'li'
    };
    const transformedOperations = operations.map(operation => {

        return {
            p: operation.path,
            [map[operation.type]]: operation.node
        }
    });
    //some logic
    return transformedOperations;
}


/**
 * keys need to be unique across clients. can be done with uuids but prob not sustainable for character level changes
 * 
 * using json0 operational transforms are O(n^2) so prob not scalable for character level changes or even large numbers of blocks
 */