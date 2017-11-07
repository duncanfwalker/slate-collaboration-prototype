import sharedb from 'sharedb/lib/client';
import WebSocket from 'ws';


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
        }
    }
};

export default connect;