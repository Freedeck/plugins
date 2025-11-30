const eventNames = require("@handlers/eventNames");
const { Plugin, events, types, intents, HookRef } = require("@freedeck/api");
const {
	authorizationUrl,
	authenticatedRequest,
	initialize,
	getClientId,
	setClientId
} = require("./AuthenticationManager");

const staticTypes = require("./StaticTypes.json");

const { dataPacket, get, set, remove } = require("./DataPacketManager");
set("playbackState", { authorizationUrl });

let shouldRegisterPlaylistsType = true;

let lyrics = {
	type: "none",
	current: null,
	not_exist: true,
	values: null,
};

let lastLyric = { time: 0, lyric: "", active: false };

class Spotify extends Plugin {
	_loop;
	setup() {
		initialize(this);
		this.requestIntent(intents.IO);
		this.requestIntent(intents.SOCKET);

		this.add(HookRef.types.server, "spot/server.js");
		this.add(HookRef.types.import, "spot/page.html");
		this.add(HookRef.types.import, "spot/authenticated.html");
		this.add(HookRef.types.import, "spot/msg01.png");
		this.add(HookRef.types.import, "spot/msg02.png");
		this.add(HookRef.types.import, "spot/msg03.png");
		this.add(HookRef.types.client, "spot/server.js");
		this.add(HookRef.types.dashModule, "spotify");

		this.setPopout(
			`<a id='con_sp' onclick='window.open("/spotify", "Spotify Setup", "width=800,height=800"); return false;'>Connect Spotify</a>`
		);

		const cid = this.getFromSaveData("cid");
		if(cid != undefined || cid != null) setClientId(cid);

		set("playbackState", {})

		for (const type of staticTypes) {
			if (type.renderType && types[type.renderType]) {
				type.renderType = types[type.renderType];
				// Holy confusing
				// If your static type has a render type "text", look for "types.text"
				// and assign the value so the registrar can do it like good
			}
			this.register(type);
		}

		this.on(events.connection, ({ socket, io }) => {
			this.io = io;

			socket.on("spotify_pcc", () => {
				socket.emit("spotify_pcc", true);
			});

			socket.on("sp_cset", (data) => {
				setClientId(data);
				this.setToSaveData("cid", data);
			})

			socket.on("spotify_update", () => {
				io.emit("spotify_data", dataPacket);
			});

			let reallyRateLimited = false;

			if (!this._loop)
				this._loop = setInterval(async () => {

					if(getClientId() == "none") {
						return;
					}

					let playbackState = {};

					if (!reallyRateLimited) {
						playbackState = await authenticatedRequest(
							"https://api.spotify.com/v1/me/player",
						);
					}
					if (!reallyRateLimited && playbackState != undefined && playbackState.error == "stop") {
						reallyRateLimited = true;
						console.log("Really rate limited, stopping requests.");
					}

					const previousState = get("playbackState", {});
					if (previousState.item?.id !== playbackState?.item?.id) {
						this.io.emit("spotify_new_song");
						this.notifyOfSong(playbackState);
					}

					if (
						previousState.playbackState?.is_playing != playbackState.is_playing
					) {
						this.io.emit(
							eventNames.companion.set_tile_icon,
							"sp.playpause",
							playbackState.is_playing ? "play.png" : "pause.png",
						);
					}

					this.doLyric(playbackState);

					set("playbackState", { ...playbackState, authorizationUrl });

					if (previousState == playbackState) return;
					this.io.emit("spotify_data", dataPacket);
				}, 500);
		});
		return true;
	}
	getLyricAt(timestampMs) {
		if (lyrics.not_exist || !lyrics.values || lyrics.values.length === 0) {
			lastLyric = { time: 0, lyric: "", active: false };
			return lastLyric;
		}
		if (lyrics.type === "synced") {
			for (const lyricObject of lyrics.values) {
				if (lyricObject.time <= timestampMs) {
					lastLyric = lyricObject;
				} else {
					break;
				}
			}
		} else {
			lastLyric = { time: 0, lyric: lyrics.values || "", active: false };
		}
		return lastLyric;
	}

	isFetchingLyrics = false;
	getLyricsFor(name, artist, album, durationMs) {
		if (this.isFetchingLyrics) return;
		const url = new URL("https://lrclib.net/api/get");
		url.search = new URLSearchParams({
			track_name: name,
			artist_name: artist,
			album_name: album,
			duration: durationMs / 1000,
		}).toString();
		this.isFetchingLyrics = true;
		console.log("Fetching lyrics", url.toString());
		fetch(url)
			.then((res) => res.json())
			.then((res) => {
				this.isFetchingLyrics = false;
				lyrics.not_exist = false;
				lyrics.current = { name, artist, album };
				if (res.syncedLyrics) {
					lyrics.type = "synced";
					lyrics.values = [];
					for (const line of res.syncedLyrics.split("\n")) {
						const timestamp = line.split("[")[1].split("]")[0];
						const ms = this.timestampToMs(timestamp);
						const actualText = line.split("] ")[1];
						const lyricObject = {
							time: ms,
							lyric: actualText,
							active: true,
						};
						lyrics.values.push(lyricObject);
					}
				} else {
					lyrics.type = "generic";
					lyrics.values = res.plainLyrics || res || "";
				}
				console.log("GOT LYRICS!");
			})
			.catch((err) => {
				this.isFetchingLyrics = false;
				console.error("Error while grabbing lyrics", err);
			});
	}

	timestampToMs(timestamp) {
		const [minutes, seconds] = timestamp.split(":");
		const [secondsPart, milliseconds] = seconds.split(".");
		const totalMinutes = Number.parseInt(minutes);
		const totalSeconds = Number.parseInt(secondsPart);
		const totalMilliseconds = Number.parseInt(milliseconds);
		return totalMinutes * 60 * 1000 + totalSeconds * 1000 + totalMilliseconds;
	}

	doLyric(playbackState) {
		if (Object.keys(playbackState).length == 0) {
			this.io.emit("textbg-display", "");
			this.io.emit("spotify-current-lyric", "");
			return;
		}
		if (!playbackState.item) return;
		const albumName = playbackState.item?.album?.name;
		const itemName = playbackState.item?.name;
		const currentLyric = lastLyric;
		this.getLyricAt(playbackState.progress_ms);

		if (lastLyric.active) {
			if (
				currentLyric.lyric !== lastLyric.lyric ||
				currentLyric.time !== lastLyric.time
			) {
				this.io.emit("textbg-command", "pulse");
			}
			const tbgTitle = `${lastLyric.lyric}`;
			this.io.emit("textbg-display", tbgTitle);
			this.io.emit("spotify-current-lyric", tbgTitle);
		}

		if (lyrics.type === "none") {
			this.getLyricsFor(
				itemName,
				playbackState.item.artists[0].name,
				albumName,
				playbackState.item.duration_ms,
			);
		} else {
			if (lyrics.current.name !== itemName) {
				this.io.emit("textbg-display", "");
				this.io.emit("spotify-current-lyric", "");
				this.getLyricsFor(
					itemName,
					playbackState.item.artists[0].name,
					albumName,
					playbackState.item.duration_ms,
				);
			}
		}
	}

	notifyOfSong(playbackState) {
		this.pushNotification(
			`Now playing ${playbackState.item?.name} by ${this.getArtistsNames(
				playbackState.item,
			)}`,
			{
				image: playbackState.item?.album?.images[0].url,
			},
		);
	}

	getArtistsNames(playbackItem) {
		let output = "";
		try {
			const lastArtist = playbackItem.artists[playbackItem.artists.length - 1];
			for (const artist of playbackItem.artists) {
				output += artist.name;
				if (artist.name !== lastArtist.name) output += ", ";
			}
		} catch (ignored) {}
		return output;
	}

	async onButton(interaction) {
		switch (interaction.type) {
			case "sp.rlco": {
				this.io.send("spotify_rlco");
				break;
			}
			case "sp.ntfy": {
				this.notifyOfSong(dataPacket.playbackState);
				break;
			}
			case "sp.playpause": {
				if (dataPacket.playbackState?.is_playing === false) {
					await authenticatedRequest(
						"https://api.spotify.com/v1/me/player/play",
						"PUT",
					);
				} else {
					await authenticatedRequest(
						"https://api.spotify.com/v1/me/player/pause",
						"PUT",
					);
				}
				break;
			}
			case "sp.next": {
				await authenticatedRequest(
					"https://api.spotify.com/v1/me/player/next",
					"POST",
				);
				break;
			}
			case "sp.prev": {
				await authenticatedRequest(
					"https://api.spotify.com/v1/me/player/previous",
					"POST",
				);
				break;
			}
			case "sp.shf": {
				const shuffleParams = new URLSearchParams();
				shuffleParams.append("state", !dataPacket.playbackState.shuffle_state);
				await authenticatedRequest(
					`https://api.spotify.com/v1/me/player/shuffle?${shuffleParams}`,
					"PUT",
				);
				break;
			}
		}
	}
}

module.exports = {
	exec: () => new Spotify(),
	class: Spotify,
};
