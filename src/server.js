import express from 'express';
import http from 'http';
import ShareDB from 'sharedb';
import WebSocket from 'ws';
import WebSocketJSONStream from 'websocket-json-stream';


const initialStateJS = {
    document: {
        nodes: [
            {  kind: 'block', type: 'text', data: { name: 'A'} }
        ]
    }
};

const backend = new ShareDB();
createDoc(initialStateJS).then(startServer);

// Create initial document then fire callback
function createDoc(state) {
    return new Promise(resolve => {
        var connection = backend.connect();
        const doc = connection.get('articles', 'article1');
        doc.fetch(function (err) {
            if (err) throw err;
            doc.create(state, () => resolve(doc));
        });
    })
}


function startServer() {
    // Create a web server to serve files and listen to WebSocket connections
    const app = express();
    const server = http.createServer(app);

    // Connect any incoming WebSocket connection to ShareDB
    const wss = new WebSocket.Server({server: server});
    wss.on('connection', function(ws, req) {
        const stream = new WebSocketJSONStream(ws);
        console.log('connection');
        backend.listen(stream);
    });

    server.listen(8080);
    console.log('Listening on http://localhost:8080');
}