const http = require( 'http');
const express = require( 'express');
const ShareDB = require( 'sharedb');
const WebSocket = require( 'ws');
const WebSocketJSONStream = require( 'websocket-json-stream');
const redis = require("redis");


const initialStateJS = {
    document: {
        nodes: [
            {  kind: 'block', type: 'text', data: { name: 'A'} }
        ]
    }
};

const mongourl = process.env.MONGO_URL;
const redisurl = process.env.REDIS_URL;
const db = require('sharedb-mongo')(mongourl);
const redisClient = redis.createClient({url: redisurl, port: 6379, host: 'redis'});
redisClient.on('error', function (er) {
    console.trace('Here I am');
    console.error(er.stack);
});
const redisPubsub = require('sharedb-redis-pubsub')(redisClient); // Redis client being an existing redis client connection

var backend = new ShareDB({
    db: db,  // db would be your mongo db or other storage location
    pubsub: redisPubsub
});
createDoc(startServer);

// Create initial document then fire callback
function createDoc(callback) {
  var connection = backend.connect();
  var doc = connection.get('articles', 'article1');
  doc.fetch(function(err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create(initialStateJS, callback);
      return;
    }
    callback();
  });
}


function startServer() {
    // Create a web server to serve files and listen to WebSocket connections
    const app = express();
    app.use(express.static('build'));
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

    // const url = 'ws://' + 'localhost' +':8080';
    // var socket = new WebSocket('ws://' + url, {handshakeTimeout: 10000});
    // var conn1 = new sharedb.Connection(socket);

}