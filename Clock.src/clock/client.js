const handle = () => {
	for(const button of document.querySelectorAll('.button')) {
		if (button.getAttribute('data-interaction')) {
			let dat = button.getAttribute('data-interaction');
			dat = JSON.parse(dat);
			if(button.id == 'editor-btn') return;
			const currentTime = new Date(Date.now());
			if (dat.type == 'clock.time') {
				let txt = button.querySelector('.button-text').querySelector('p');
				txt.innerText = currentTime.toLocaleTimeString();
			} else if (dat.type == 'clock.date') {
				let txt = button.querySelector('.button-text').querySelector('p');
				txt.innerText = currentTime.toLocaleDateString();
			} else if (dat.type == 'clock.time.24') {
				let txt = button.querySelector('.button-text').querySelector('p');
				txt.innerText = currentTime.toLocaleTimeString('en-US', { hour12: false });
			}
		}
	};
};
handle();
universal.listenFor('page_change', () => {
	handle();
})
setInterval(() => {
	handle();
}, 1000)