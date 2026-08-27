const handle = () => {
	const currentTime = new Date(Date.now());
	universal.UI.visual.typeChangeText('clock.time', currentTime.toLocaleTimeString());
	universal.UI.visual.typeChangeText('clock.time.24', currentTime.toLocaleTimeString('en-US', { hour12: false }));
	universal.UI.visual.typeChangeText('clock.date', currentTime.toLocaleDateString());
};
handle();
universal.listenFor('page_change', () => {
	handle();
})
setInterval(() => {
	handle();
}, 1000)