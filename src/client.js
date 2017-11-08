import sharedb from 'sharedb/lib/client';

import { toShareDBOperations, toSlateOperations } from './toSlateOperations';

function createDelayedSocket(delay) {
    const DelayedWebsocket = WebSocket;

    DelayedWebsocket.prototype.oldSend = DelayedWebsocket.prototype.send;
    DelayedWebsocket.prototype.send = function(data) {
        console.log("Send after" + delay + "ms");
        var sock = this;
        setTimeout(function () {
            WebSocket.prototype.oldSend.apply(sock, [data]);
        }, delay);
    };

    return DelayedWebsocket;
}


const connect = (callback) => {
    const url = 'ws://' + window.location.host;
    var delay = 0;
    if(typeof URL !== 'undefined') {
        delay = parseInt(new URL(window.location.href).searchParams.get("delay"));
    }

    const SlowSocket = createDelayedSocket(delay);
    const socket = new SlowSocket(url);

    const connection = new sharedb.Connection(socket);
    connection.debug = true;

    window.disconnect = function () {
        connection.close();
    };
    window.connect = function () {
        var socket = new SlowSocket('ws://' + window.location.host);
        connection.bindToSocket(socket);
    };

    const doc = connection.get('articles', 'article1');
    doc.subscribe((error) => {
        if(error) console.error(error);
        doc.on('op', (ops, source) => {
            const operations = ops.map(toSlateOperations);
            callback({ operations, source });
        });
    });

    return {
        submit(source) {
            return (change) => {
                const zeroJsonOps = change.operations.map(operation => toShareDBOperations({ operation }));

                doc.submitOp(zeroJsonOps, { source }, (err) => {
                    if(err) console.error(err);
                })
            }
        },
    }

};


export default connect;
