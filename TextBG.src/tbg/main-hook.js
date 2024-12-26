const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = '/user-data/hooks/tbg/_tbg.css';

const display = document.createElement('p');
display.classList.add('textbg-display');

const callback = (e) => {
	display.innerText = e;
};

universal.on('textbg-display', callback);
universal.on('_t', callback); // Compatibility layer for v1

universal.send('textbg-request')

document.head.appendChild(style);
document.body.appendChild(display);