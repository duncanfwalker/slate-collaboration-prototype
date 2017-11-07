import sharedb from 'sharedb/lib/client';
import WebSocket from 'ws';

import { toSlateOperations, toShareDBOperations } from './toSlateOperations';

const connect = () => {
    const url = 'ws://' + 'localhost' + ':8080';
    const socket = new WebSocket('ws://' + url, { handshakeTimeout: 10000 });
    const connection = new sharedb.Connection(socket);

    connection.bindToSocket(new WebSocket(url));


    return {
        fetchDoc() {
            const doc = connection.get('articles', 'article1');
            return new Promise((resolve, reject) => {
                doc.fetch((err) => {
                    if (err) reject(err);
                    resolve(doc);
                })
            })
        },
        close() {
            connection.close();
        },
        onOp(operationDone) {
            fetchDoc()
                .then(doc => doc.on('op', (ops, source) => operationDone({
                        operations: ops.map(toSlateOperations),
                        source
                    })
                ))
        },
        submit(change) {
            const zeroJsonOps = change.operations.map(operation => toShareDBOperations({ operation }));
            fetchDoc()
                .then(doc => doc.submitOp(zeroJsonOps, { source: true }, console.error));
        },
    }
};


export default connect;
