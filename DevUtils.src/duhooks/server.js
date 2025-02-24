for(const button of document.querySelectorAll(".button")) {
	let interaction = JSON.parse(button.getAttribute("data-interaction"));
	if(interaction != null) {
		if(interaction.type == 'du.rc') {
			button.addEventListener("click", () => {
				universal.send(universal.events.default.recompile)
			});
		}
	}
};