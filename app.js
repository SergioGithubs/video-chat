
// https://github.com/kolson25/WebRTC-Multi-Peer-Video-Audio

var express = require('express')
//   , routes = require('./routes');

// var app = module.exports = express.createServer();
const PORT = process.env.PORT || 3000;
const INDEX = '/client/index.html';

const server = express()
  // .use("main.css", (req, res) => res.sendFile('/client/main.css', { root: __dirname }))
  // .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .use(express.static('client'))
  .use('/', function(req, res) {
    res.render('/client/index.html', {
        puerto: PORT
    })
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

var io = require('socket.io')(server);

io.on('connection', function(socket){
	io.sockets.emit("user-joined", socket.id, io.engine.clientsCount, Object.keys(io.sockets.clients().sockets));

	socket.on('signal', (toId, message) => {
		io.to(toId).emit('signal', socket.id, message);
  	});

    socket.on("message", function(data){
		io.sockets.emit("broadcast-message", socket.id, data);
    })

	socket.on('disconnect', function() {
		io.sockets.emit("user-left", socket.id);
	})
});
