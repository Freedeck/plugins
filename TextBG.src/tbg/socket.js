module.exports = (socket, io, instance) => {
	socket.on('Request text', () => {
		socket.emit('_t', instance.wantedText);
	})
}