let isAuthorized = false;
universal.on("spotify_rlco", () => {
	isAuthorized = false;
});
let isTryingToLogin = false;
universal.on("spotify_force_relogin", (data) => {
	if (universal.name === "Companion") forceLogin(data);
});

function forceLogin(data) {
	if (isTryingToLogin) return;
	const win = window.open(data, "_blank");
	isTryingToLogin = true;
	if(document.querySelector("#con_sp")) {
		document.querySelector("#con_sp").innerText = 'Connect Spotify';
	}
	if (win) {
		const timer = setInterval(() => {
			if (win.closed) {
				clearInterval(timer);
				isTryingToLogin = false;
			}
		}, 500);
	}
}

universal.on("spotify_data", (data) => {
	const { playbackState } = data;
	if (
		(playbackState.error?.status === 400 ||
			playbackState.error?.status === 401 ||
			playbackState === "FIRST_TIME") &&
		!isAuthorized
	) {
		isAuthorized = true;
		forceLogin(playbackState.authorizationUrl);
	} else {
		isAuthorized = true;
	}
	if (!playbackState.item) return;
	const albumName = playbackState.item?.album?.name;
	const artists = getArtistsNames(playbackState.item);
	const itemName = playbackState.item.name;
	const showing = `${artists} - ${itemName}`;

	if(document.querySelector("#con_sp")) {
		document.querySelector("#con_sp").innerText = 'Connected!';
	}

	universal.ui.visual.typeChangeText("sp.clf", showing);
	universal.ui.visual.typeChangeText("sp.clt", `${playbackState.item.name}`);

	if (playbackState.is_playing === false) {
		makeAll("sp.cl", "yellow");
		makeAll("sp.playpause", "yellow");
	} else {
		makeAll("sp.cl", "none");
		makeAll("sp.playpause", "green");
	}

	if (playbackState.shuffle_state === true) {
		makeAll("sp.shf", "green");
	} else {
		makeAll("sp.shf", "none");
	}

	const ctime = msToTimestamp(playbackState.progress_ms);
	const ttime = msToTimestamp(playbackState.item.duration_ms);
	universal.ui.visual.typeChangeText("sp.pbt", `${ctime}/${ttime}`);
	imgs = [];
	for (const { element, interaction } of [
		...getAllOfType("sp.clabt"),
		...getAllOfType("sp.clabtplus"),
	]) {
		if (!element.querySelector("img#sptcart")) {
			const image = new Image();
			image.id = "sptcart";
			image.style.pointerEvents = "none";
			element.appendChild(image);
			imgs.push(image);
		} else {
			imgs.push(element.querySelector("img#sptcart"));
		}
		const txt = element.querySelector(".button-text");
		if (interaction.type === "sp.clabtplus") {
			if (txt.style.display !== "block") txt.style.display = "block";
			if (txt.style.position !== "fixed") txt.style.position = "fixed";
			txt.querySelector("p").innerText = albumName;
		} else {
			if (txt.style.display !== "none") txt.style.display = "none";
		}
	}

	const wantedCoverArt = playbackState.item.album.images[0].url;
	for (const imgElement of imgs) {
		if (imgElement.src !== wantedCoverArt) imgElement.src = wantedCoverArt;
		if (imgElement.style.width !== "100%") imgElement.style.width = "100%";
		if (imgElement.style.height !== "100%") imgElement.style.height = "100%";
	}
});

universal.on("spotify-current-lyric", (e) => {
	universal.ui.visual.typeChangeText("sp.cll", `${e}`);
});

function makeAll(type, color) {
	for (const { element } of getAllOfType(type)) {
		if (color === "none") removeIndicatorFromButton(element);
		else setIndicatorToButton(element, color);
	}
}

function timestampToMs(timestamp) {
	const [minutes, seconds] = timestamp.split(":");
	const [secondsPart, milliseconds] = seconds.split(".");
	const totalMinutes = Number.parseInt(minutes);
	const totalSeconds = Number.parseInt(secondsPart);
	const totalMilliseconds = Number.parseInt(milliseconds);
	return totalMinutes * 60 * 1000 + totalSeconds * 1000 + totalMilliseconds;
}

let imgs = [];

function msToTimestamp(ms) {
	const minutes = Math.floor(ms / 60000);
	const seconds = ((ms % 60000) / 1000).toFixed(0);
	return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function getArtistsNames(playbackItem) {
	let output = "";
	const lastArtist = playbackItem.artists[playbackItem.artists.length - 1];
	for (const artist of playbackItem.artists) {
		output += artist.name;
		if (artist.name !== lastArtist.name) output += ", ";
	}
	return output;
}

function setIndicatorToButton(btn, indicator) {
	if (!btn.querySelector("#sp_indi")) {
		let indicator = document.createElement("div");
		indicator.id = "sp_indi";
		btn.appendChild(indicator);
	}
	const cl = btn.querySelector("#sp_indi").classList;
	cl.remove("indicator-red");
	cl.remove("indicator-green");
	cl.remove("indicator-yellow");
	cl.add("indicator-" + indicator);
}

function removeIndicatorFromButton(btn) {
	if (btn.querySelector("#sp_indi")) {
		btn.querySelector("#sp_indi").remove();
	}
}

function getAllOfType(type) {
	let out = [];
	document.querySelectorAll(".button").forEach((btn) => {
		let inter = JSON.parse(btn.getAttribute("data-interaction"));
		if (inter != null && btn.id !== "editor-btn") {
			if (inter.type == type) out.push({ element: btn, interaction: inter });
		}
	});
	return out;
}

universal.listenFor("page_change", () => {
	universal.send("spotify_update");
});
