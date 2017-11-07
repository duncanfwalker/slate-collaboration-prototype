import React from 'react';
import { Block, Change, State } from 'slate';
import {toShareDBOperations, toSlateOperations} from './toSlateOperations';
import transformer from './transformer';
import connect from './client'


require('./server');

const initialNode = {  kind: 'block', type: 'text', data: { name: 'A'} };
const initialNode2 = {  kind: 'block', type: 'text', data: { name: 'second node'} };

const initialStateJS = {
    document: {
        nodes: [
            {  kind: 'block', type: 'text', data: { name: 'A'} }
        ]
    }
};

const state = State.fromJSON(initialStateJS);

const addition = state.change()
    .insertNodeByKey(state.document.key, 1, Block.create({ type: 'text', data: { name: 'added' }}));

const additionB = state.change()
.insertNodeByKey(state.document.key, 1, Block.create({ type: 'text', data: { name: 'B' }}));

const additionC = state.change()
.insertNodeByKey(state.document.key, 1, Block.create({ type: 'text', data: { name: 'C' }}));

const removal = addition.state.change()
    .removeNodeByKey(addition.state.document.nodes.get(1).key);


let transform;
let conn1;
let conn2;
beforeEach(() => {
    conn1 = connect();
    conn2 = connect();
});

afterEach(() => {
  setTimeout(() => {
        conn1.close();
        conn2.close();
    }, 500);
});

it.skip('adds node', () => { // TODO: add in a document
    return transform(addition)
        .then(({operations}) => {
            const transformed = operations;
            const operationsAddition = state.change().applyOperations(transformed);

            expect(operationsAddition.state.toJS().document.nodes[0].data).toEqual({ name: 'initial' });
            expect(operationsAddition.state.toJS().document.nodes[1].data).toEqual({ name: 'added' });
            expect(operationsAddition.state.toJS()).toEqual(addition.state.toJS());
        });
});

it.skip('removes node', () => { // TODO: add in a document
    return transform(removal)
        .then(({operations}) => {
            const transformed = operations;
            const operationsRemoval = addition.state.change().applyOperations(transformed);

            expect(operationsRemoval.state.toJS().document.nodes.length).toEqual(1);
            expect(operationsRemoval.state.toJS().document.nodes[0].data).toEqual({ name: 'initial' });
            expect(operationsRemoval.state.toJS()).toEqual(state.toJS());
        });
});

function namesFromDoc(doc) {
    return doc.document.nodes
        .filter(node => node.data)
        .map(node => node.data.name);
}

it.only('does not matter the order of operations', (done) => {
    var slateChangeC;
    // try{

    // https://github.com/ottypes/json0/blob/master/test/json0.coffee#L139
    let doc2;
    let doc1;
    conn1.fetchDoc()
        .then(doc => {
            doc1 = doc;
            return conn2.fetchDoc()
         })
        .then((doc) => {
            doc2 = doc;
        })
        // .then(() => new Promise((resolve => doc1.unsubscribe(resolve))))
        .then(() => {
            const operationWrappers = [];

            const operationDone = ({ operations }) => {
                operationWrappers.push(operations);

                if (operationWrappers.length === 3 ) {
                    const allOperations = operationWrappers.reduce((memo, current) => ([...memo, ...current]),[]);

                    const rest = allOperations.filter((item, index) => [2,3,4].includes(index));

                    const bothApplied = state.change().applyOperations(rest);


                    expect(namesFromDoc(bothApplied.state.toJS())).toEqual(['A','B','C']);
                    done();
                }
            };

            transformer(doc1)(additionC, (results) => {
                transformer(doc2)(additionB, operationDone);
                operationDone(results)
            });



            // return Promise.all([transformer(doc1)(additionC),transformer(doc2)(additionB)])  // (doc1)(additionC)
            //     .then(([slateChangeC, slateChangeB])=>{
            // throw JSON.stringify(slateChangeB)
            // console.log("RESOLVED");
            // expect(doc2.version).toEqual(doc1.version);
            // expect(namesFromDoc(doc1)).toEqual(['A','C']);
            // expect(namesFromDoc(doc2)).toEqual(['A','B', 'C']);

            // expect(doc2.data.document.nodes.map(node => node.data && node.data.name)).toEqual(['A']);
            // expect(doc1.data.document.nodes.map(node =>  node.data && node.data.name)).toEqual(['A']);
            //

            // expect(slateChangeC.operations[0].path).toEqual([2]);
            //

            //             // expect(removeThenAdd.state.toJS()).toEqual(state.toJS());
            //         })
            // })
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

    expect(toShareDBOperations({ operation: slateOperation })).toEqual(transformedOperation)

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

    expect(toShareDBOperations({ operation: slateOperation })).toEqual(transformedOperation)
});



/**
 * keys need to be unique across clients. can be done with uuids but prob not sustainable for character level changes
 *
 * using json0 operational transforms are O(n^2) so prob not scalable for character level changes or even large numbers of blocks
 */

