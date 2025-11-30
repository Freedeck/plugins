const eventNames = require("@handlers/eventNames");
const { generateRandomString, base64urlEncode, sha256 } = require("./utils");
const codeVerifier = generateRandomString(128);
const codeChallenge = base64urlEncode(sha256(codeVerifier));
const { app } = require("@src/http.js");
const path = require("node:path");
const { dataPacket, get, set, remove } = require("./DataPacketManager");
const authorizationUrl = new URL("https://accounts.spotify.com/authorize");
const redirectUri = "http://127.0.0.1:5754/spotify/callback";
let authorizationObject = {};
let pluginInstance;
let clientId = "none";

function setClientId(e) {
	clientId = e;
	authorizationUrl.search = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		scope:
			"playlist-read-private user-read-playback-state user-modify-playback-state",
		code_challenge_method: "S256",
		code_challenge: codeChallenge,
		redirect_uri: redirectUri,
	}).toString();
}


app.get("/spotify", (req, res) => {
	pluginInstance.socket.once("spotify_pcc", () => {
		pluginInstance.socket.emit("spotify_pcc", true);
	});
	res.sendFile(path.resolve("./user-data/hooks/spot/page.html"));
});

app.get("/spotify/callback", (req, res) => {
	const { code } = req.query;
	getToken(code).then(async (e) => {
		if (pluginInstance?.io) {
			pluginInstance.io?.send(eventNames.default.reload);
		}
		res.sendFile(path.resolve("./user-data/hooks/spot/authenticated.html"));
	});
});

const getToken = async (code, refresh = false) => {
	const payload = {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: clientId,
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			code_verifier: codeVerifier,
		}),
	};

	if (refresh) {
		payload.body = new URLSearchParams({
			client_id: clientId,
			grant_type: "refresh_token",
			refresh_token: authorizationObject.refresh_token,
		});
	}

	const body = await fetch("https://accounts.spotify.com/api/token", payload);
	const response = await body.json();
	authorizationObject.grabbed = Date.now() / 1000;
	authorizationObject = response;
	pluginInstance.setToSaveData("ao", authorizationObject);
};
const rateLimitMap = new Map();

async function authenticatedRequest(
	url,
	method = "GET",
	body = null,
	retries = 3,
) {
	if (!authorizationObject.access_token) {
		return { error: { status: 400 } };
	}

	const makeRequest = async (retryCount) => {
		const currentTime = Date.now();
		const rateLimitResetTime = rateLimitMap.get(url) || 0;

		if (currentTime < rateLimitResetTime) {
			const delay = rateLimitResetTime - currentTime;
			const message = `Rate limit exceeded. Retrying after ${delay / 1000} seconds...`;
			console.log(message);
			return { error: { status: 429, message } };
		}

		const request = await fetch(url, {
			method,
			headers: {
				Authorization: `Bearer ${authorizationObject.access_token}`,
				"Content-Type": "application/json",
			},
			body: body ? JSON.stringify(body) : null,
		}).catch((err) => {
			const data = { error: { status: -1, message: err.message } };
			return {
				json: async () => data,
				text: async () => JSON.stringify(data),
			};
		});

		let data = await request.text();
		try {
			if (data == "Too many requests") {
				return { error: "stop" };
			}
			if (data.length > 0) data = JSON.parse(data);
			if (data.error) {
				console.log("Error while fetching Spotify playbackState:", data);
				if (pluginInstance) {
					if (data.error.message.includes("expired")) {
						getToken(null, true);
						return data;
					}
					if (data.error.message.includes("Refresh token revoked")) {
						pluginInstance.io.emit(
							"spotify_force_relogin",
							authorizationUrl.toString(),
						);
						return data;
					}
					if (data.error.message.includes("fetch failed")) {
						return {};
					}
					if (data.error.message.includes("Server error."))
						return get("dataPacket", {});
					pluginInstance.pushNotification(data.error.message);
				}
			}
		} catch (err) {
			console.error("Spotify API Server Error", err, request);
		}

		if (request.status === 429 && retryCount > 0) {
			const retryAfter = request.headers.get("Retry-After");
			const delay = retryAfter
				? Number.parseInt(retryAfter) * 1000
				: 2 ** (retries - retryCount) * 1000;
			rateLimitMap.set(url, Date.now() + delay);
			console.log(`Rate limited. Retrying after ${delay / 1000} seconds...`);
			await new Promise((resolve) => setTimeout(resolve, delay));
			return makeRequest(retryCount - 1);
		}

		return data;
	};

	return makeRequest(retries);
}

async function initialize(instance) {
	pluginInstance = instance;
	if (instance.getFromSaveData("ao")) {
		authorizationObject = instance.getFromSaveData("ao");
	}
}

module.exports = {
	authorizationUrl,
	authenticatedRequest,
	setClientId,
	getClientId:() => clientId,
	initialize,
};
