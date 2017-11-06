import React from 'react';
import { Block, Change, State } from 'slate';
import sharedb from 'sharedb/lib/client';
import WebSocket from 'ws';


const url = 'ws://' + 'localhost' +':8080';

require('./server');
var socket = new WebSocket('ws://' + url, {handshakeTimeout: 10000});
var conn1 = new sharedb.Connection(socket);
var conn2 = new sharedb.Connection(socket);

function fetchDoc(connection) {
    const doc = connection.get('articles', 'article1');
    return new Promise((resolve, reject) => {
        doc.fetch((err) => {
            if(err) reject(err);
            resolve(doc);
        })
    })
}

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


const transformer = doc => (change, operationDone) => {
    let count = 0;
    doc.subscribe(function (err) {

        doc.on('op', (ops, source) => {

            console.log(ops)

            const operations = ops.map(toSlateOperations);
            // doc.unsubscribe(() => {
            // if (err) reject(err);

            let name;
            let path;
            if(operations[0].node.data) {
                count++;
                name = operations[0].node.data.name;
                path = operations[0].path[0];

            }

            console.log('Count',count)
            console.log('Path',name,path)
            return operationDone({
                operations
            })
        });

        const zeroJsonOps = change.operations.map(operation => toZeroJSON({ operation }));

        /* We need to fake the version number since it is used to assign op version number here:
         https://github.com/share/sharedb/blob/b33bdd59ce4f2c55604801d779554add94a12616/lib/client/connection.js#L393
         */


        // console.log('submitting', zeroJsonOps["0"].li.get('data').get('name'));
        doc.submitOp(zeroJsonOps, { source: true }, (err) => {
            console.error(err)
        });

        // doc.version = previousVersion;
        doc.flush()
    })
// }, delay);
};


let transform;
beforeEach(() => {

    conn1.bindToSocket(new WebSocket(url));
    conn2.bindToSocket(new WebSocket(url));

    const jsState = state.toJS();
    // return fetchDoc()
    //     .then((doc) => {
    //         transform = transformer(doc);
    //     });
});

afterEach(() => {
  setTimeout(() => {
        conn1.close();
        conn2.close();
    }, 2000);
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

function namesFromDoc(doc) {
    return doc.data.document.nodes
        .filter(node => node.data)
        .map(node => node.data.name);
}

it.only('does not matter the order of operations', (done) => {
    var slateChangeC;
    // try{

    // https://github.com/ottypes/json0/blob/master/test/json0.coffee#L139
    let doc2;
    let doc1;
    fetchDoc(conn1)
        .then(doc => {
            doc1 = doc;
            return fetchDoc(conn2)
         })
        .then((doc) => {
            doc2 = doc;
        })
        // .then(() => new Promise((resolve => doc1.unsubscribe(resolve))))
        .then(() => {
            const operationWrappers = [];

            const operationDone = ({ operations }) => {
                operationWrappers.push(operations);

                if (operationWrappers.length === 4 ) {
                    const allOperations = operationWrappers.reduce((memo, current) => ([...memo, ...current]),[]);

                    const rest = allOperations.filter((item, index) => [2,3,4].includes(index));

                    const bothApplied = state.change().applyOperations(rest);


                    expect(bothApplied.state.toJS().document.nodes.map(node => node.data.name)).toEqual(['A','B','C']);
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
            slateOp['path'] = node.kind === 'text' ? [...path, 0] : [...path];
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

