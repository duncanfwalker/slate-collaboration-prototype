import sharedb from 'sharedb/lib/client';

import { toSlateOperations, toShareDBOperations } from './toSlateOperations';




const connect = () => {
    const url = 'ws://' + window.location.host;
    const socket = new WebSocket(url);
    const connection = new sharedb.Connection(socket);
    // connection.debug = true;

    window.disconnect = function() {
        connection.close();
    };
    window.connect = function() {
        var socket = new WebSocket('ws://' + window.location.host);
        connection.bindToSocket(socket);
    };

    function fetchDoc() {
        const doc = connection.get('articles', 'article1');
        return new Promise((resolve, reject) => {
            doc.fetch((err) => {
                if (err) reject(err);
                resolve(doc);
            })
        })
    }
    return {
        close() {
            connection.close();
        },
        onOp(operationDone) {
            fetchDoc()
                .then(doc => doc.on('op', (ops, source) => {
                    const operations = ops.map(toSlateOperations);
                    operationDone({ operations, source });
                    }
                ))
        },
        submit(change) {
            const zeroJsonOps = change.operations.map(operation => toShareDBOperations({ operation }));
            fetchDoc()
                .then(doc => {
                    doc.submitOp(zeroJsonOps, { source: true }, console.error)
                });
        },
    }
};


export default connect;
