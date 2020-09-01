
// https://github.com/kolson25/WebRTC-Multi-Peer-Video-Audio

var express = require('express')
//   , routes = require('./routes');

// var app = module.exports = express.createServer();
const PORT = process.env.PORT || 3000;
const INDEX = '/client/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

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

// app.listen(3000, function(){
// 	console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
// });

server.listen(port, () => console.log(`Server is running on port ${port}`));