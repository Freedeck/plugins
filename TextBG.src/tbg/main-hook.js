const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = '/user-data/hooks/tbg/_tbg.css';

const display = document.createElement('p');
display.style.display = "block";
display.classList.add('textbg-display');

const callback = (e) => {
	doDisplayShow(new String(e).length > 0)
	display.innerHTML = universal.cleanHTML(e);
};

function doDisplayShow(is=true) {
	const currentDisplayMode = display.style.display;
	if(currentDisplayMode === "block" && !is) {
		display.style.opacity = 0;
		display.style.top = "-1%";
	} else {
		display.style.opacity = 1;
		display.style.top="0%";
	}
}

universal.on('textbg-visible', doDisplayShow);
universal.on('textbg-display', callback);
universal.on('_t', callback); // Compatibility layer for v1

universal.send('textbg-display')

document.head.appendChild(style);
document.body.appendChild(display);