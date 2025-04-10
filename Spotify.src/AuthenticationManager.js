const eventNames = require("@handlers/eventNames");
const { generateRandomString, base64urlEncode, sha256 } = require("./utils");
const codeVerifier = generateRandomString(128);
const codeChallenge = base64urlEncode(sha256(codeVerifier));
const { app } = require("@src/http.js");

const clientId = "2d0b90c5aaae4e19989e9852da3d1899";
const authorizationUrl = new URL("https://accounts.spotify.com/authorize");
const redirectUri = "http://127.0.0.1:5754/spotify/callback";
let authorizationToken;
let authorizationObject = {};
let pluginInstance;

authorizationUrl.search = new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  scope: "playlist-read-private user-read-playback-state user-modify-playback-state",
  code_challenge_method: "S256",
  code_challenge: codeChallenge,
  redirect_uri: redirectUri,
}).toString();

app.get("/spotify/callback", (req, res) => {
  const { code } = req.query;
  getToken(code).then(async (e) => {
    authorizationToken = e;
    if(pluginInstance?.io) {
      pluginInstance.io?.send(eventNames.default.reload)
    }
    res.send(
      "<h1>Authentication success!</h1><p>Please return to Freedeck, close this window, if it hasn't already.</p><script>window.close()</script>"
    );
  });
});

const url = "https://accounts.spotify.com/api/token";
const getToken = async (code) => {
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

  const body = await fetch(url, payload);
  const response = await body.json();
  authorizationObject.grabbed = Date.now() / 1000;
  authorizationObject = response;
  return response.access_token;
};
const rateLimitMap = new Map();

async function authenticatedRequest(url, method = "GET", body = null, retries = 3) {
  if (!authorizationToken) {
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
        Authorization: `Bearer ${authorizationToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    }).catch((err) => {
      const data = { error: { status: -1, message: err.message } };
      return {
        json: async () => data,
        text: async () => JSON.stringify(data),
      };
    });

    let data;
    try {
      data = await request.text();
      try {
        if (data.length > 0) data = JSON.parse(data);
        if (data.error) {
          console.log(data.error.message);
          if(pluginInstance) {
            if(data.error.message.includes("expired")) {
              pluginInstance.io.emit("spotify_force_relogin", authorizationUrl.toString());
              return;
            }
            if(data.error.message.includes("fetch failed")) {
              return {};
            }
            pluginInstance.pushNotification(data.error.message);
          }
        }
      } catch (ignored) {}
    } catch (err) {
      console.error("Big error", err, request);
    }

    if (request.status === 429 && retryCount > 0) {
      const retryAfter = request.headers.get("Retry-After");
      const delay = retryAfter ? Number.parseInt(retryAfter) * 1000 : 2 ** (retries - retryCount) * 1000;
      rateLimitMap.set(url, Date.now() + delay);
      console.log(`Rate limited. Retrying after ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return makeRequest(retryCount - 1);
    }

    return data;
  };

  return makeRequest(retries);
}

async function refreshPeriodicLoop(instance) {
  const currentSecs = Date.now() / 1000;
  const secondsSinceGrab = Math.abs(
    currentSecs - authorizationObject.grabbed
  );
  if (
    authorizationObject.expires_in &&
    secondsSinceGrab <= authorizationObject.expires_in
  ) {
    const refreshToken = authorizationObject.refresh_token;
    const refreshPayload = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    };

    const refreshResponse = await fetch(url, refreshPayload);
    const refreshData = await refreshResponse.json();
    authorizationObject = refreshData;
    authorizationToken = refreshData.access_token;
  }

  if (
    instance.getFromSaveData(authManSettings.saveDataTokenLabel) !== authorizationToken ||
    instance.getFromSaveData(authManSettings.saveDataObjectLabel) !== authorizationObject
  ) {
    instance.setToSaveData(authManSettings.saveDataObjectLabel, authorizationObject);
    instance.setToSaveData(authManSettings.saveDataTokenLabel, authorizationToken);
    console.log("Updated Spotify token in save data.");
  }
}

async function initialize(instance) {
  pluginInstance = instance;
  if (instance.getFromSaveData(authManSettings.saveDataObjectLabel)) {
    authorizationObject = instance.getFromSaveData(authManSettings.saveDataObjectLabel);
    authorizationToken = instance.getFromSaveData(authManSettings.saveDataTokenLabel);
  }
}

const authManSettings = {
  saveDataTokenLabel: "at",
  saveDataObjectLabel: "ao"
}

module.exports = {
  authorizationUrl,
  authorizationToken,
  authorizationObject,
  authenticatedRequest,

  refreshPeriodicLoop,
  initialize
}