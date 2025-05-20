const cache = {};
universal.on("haf.statechange", (e) => {
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
