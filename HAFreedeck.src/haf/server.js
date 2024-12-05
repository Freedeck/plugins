universal.on("haf.statechange", (data) => {
	universal.ui.visual.typeChangeText(data.wanted, data.state);
});

universal.send("haf.forceupdate");

universal.listenFor("page_change", () => {
	universal.send("haf.forceupdate");
});
