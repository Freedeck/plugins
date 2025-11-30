const cache = {};
universal.on("haf.statechange", (e) => {
	universal.send("haf.setup_status");
	universal.once("haf.setup_status", (e) => {
		if(e) {
			if(document.querySelector("#con_haf")) {
				document.querySelector("#con_haf").innerText = e ? 'Open Settings' : 'Connect to Home Assistant';
			}
		}
	})
	for(const data of e) {
		cache[data.wanted] = data.state;
		universal.ui.visual.typeChangeText(data.wanted, data.state);
	}
});

universal.send("haf.forceupdate");

universal.listenFor("page_change", () => {
	universal.send("haf.forceupdate");
	for(const key in cache) universal.ui.visual.typeChangeText(key, cache[key]);
});
