module.exports = (socket, io, instance) => {
	instance.SockyInterop(socket, io);
	socket.on('oc_cs', () => {
		socket.emit('oc_cs', instance.currentScene);
	})
	socket.on('oc_vo', (idata) => {
		instance.volumeOf(idata.name, idata.uuid).then((data) => {
			socket.emit('oc_vo', {...data, uuid: idata.uuid});
		})
	})
	socket.on('oc_rec', () => {
		instance.recordStatus().then((data) => {
			socket.emit('oc_rec', data);
		})
	})
	socket.on('oc_str', () => {
		instance.streamStatus().then((data) => {
			socket.emit('oc_str', data);
		})
	})
}