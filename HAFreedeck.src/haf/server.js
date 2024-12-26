universal.on("haf.statechange", (e) => {
	for(const data of e) universal.ui.visual.typeChangeText(data.wanted, data.state);
});

universal.send("haf.forceupdate");

universal.listenFor("page_change", () => {
	universal.send("haf.forceupdate");
});
