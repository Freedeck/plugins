const { Plugin, events, types, intents, HookRef } = require("@freedeck/api");
const { app } = require("@src/http.js");
const eventNames = require("@handlers/eventNames");
const { generateRandomString, base64urlEncode, sha256 } = require("./utils");
const codeVerifier = generateRandomString(128);
const codeChallenge = base64urlEncode(sha256(codeVerifier));

let globalIo;
let instanceOfPlugin;
const registeredPlaylists = [];
const clientId = "2d0b90c5aaae4e19989e9852da3d1899";
const authUrl = new URL("https://accounts.spotify.com/authorize");
const redirectUri = "http://127.0.0.1:5754/spotify/callback";

authUrl.search = new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  scope: "playlist-read-private user-read-playback-state user-modify-playback-state",
  code_challenge_method: "S256",
  code_challenge: codeChallenge,
  redirect_uri: redirectUri,
}).toString();

let authorization = {};
let authorizationObject = {};

app.get("/spotify/callback", (req, res) => {
  const { code } = req.query;
  getToken(code).then(async (e) => {
    authorization = e;
    if(globalIo) {
      globalIo.send(eventNames.default.reload)
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
  if (!authorization) {
    return { error: { status: 400 } };
  }

  const makeRequest = async (retryCount) => {
    const currentTime = Date.now();
    const rateLimitResetTime = rateLimitMap.get(url) || 0;

    if (currentTime < rateLimitResetTime) {
      const delay = rateLimitResetTime - currentTime;
      console.log(`Rate limited on ${url}. Retrying after ${delay / 1000} seconds...`);
      return { error: { status: 429, message: `Rate limited. Retry after ${delay / 1000} seconds.` } };
    }

    const request = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${authorization}`,
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
          console.log(data.error);
        }
      } catch (ignored) {}
    } catch (err) {
      console.error("Big error", err, request);
    }

    if (request.status === 429 && retryCount > 0) {
      const retryAfter = request.headers.get("Retry-After");
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2 ** (retries - retryCount) * 1000;
      rateLimitMap.set(url, Date.now() + delay);
      console.log(`Rate limited. Retrying after ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return makeRequest(retryCount - 1);
    }

    return data;
  };

  return makeRequest(retries);
}

let dataPacket = { playbackState: {}, lastPlaybackState: {} };
function addToDataPacket(k, v) {
  dataPacket[k] = v;
}
function clearDataPacket() {
  dataPacket = {};
}
addToDataPacket("auth", authUrl);

class Spotify extends Plugin {
  _loop;
  setup() {
    instanceOfPlugin = this;
    if (this.getFromSaveData("authobj")) {
      authorizationObject = this.getFromSaveData("authobj");
      authorization = this.getFromSaveData("ltk");
    }
    this.requestIntent(intents.IO);
    this.requestIntent(intents.SOCKET);

    this.add(HookRef.types.server, "spot/server.js");
    this.add(HookRef.types.client, "spot/server.js");

    this.register({
      type: "sp.rlco",
      display: "Re-authorize"
    });

    this.register({
      type: "sp.clt",
      display: "Currently Listening (Title)",
      renderType: types.text,
    });

    this.register({
      type: "sp.clf",
      display: "Currently Listening (Artists - Title)",
      renderType: types.text,
    });

    this.register({
      type: "sp.clabt",
      display: "Currenty Listening (Album Art)",
      renderType: types.text,
    });

    this.register({
      type: "sp.clabtplus",
      display: "Currenty Listening (Album + Art)",
      renderType: types.text,
    });

    this.register({
      type: "sp.pbt",
      display: "Playback Time",
      renderType: types.text,
    });

    this.register({
      type: "sp.playpause",
      display: "Play/Pause",
    });

    this.register({
      type: "sp.next",
      display: "Next",
    });

    this.register({
      type: "sp.prev",
      display: "Previous",
    });

    this.register({
      type: "sp.shf",
      display: "Toggle Shuffle",
    });

    this.register({
      type: "sp.ntfy",
      display: "Notify Current Song",
    });

    this.on(events.connection, ({ socket, io }) => {
      this.io = io;
      globalIo = io;
      socket.on("spotify_update", () => {
        io.emit("spotify_data", dataPacket);
      });
      if (!this._loop)
        this._loop = setInterval(async () => {
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
            authorization = refreshData.access_token;
          }

          if (
            this.getFromSaveData("ltk") !== authorization ||
            this.getFromSaveData("authobj") !== authorizationObject
          ) {
            this.setToSaveData("authobj", authorizationObject);
            this.setToSaveData("ltk", authorization);
          }
          authenticatedRequest("https://api.spotify.com/v1/me/playlists").then((playlists) =>{
            if(playlists.items) {
              for(const playlist of playlists.items) {
                if(instanceOfPlugin) {
                  instanceOfPlugin.register({
                    type: `sp.ps.${playlist.id}`,
                    display: `Start playlist "${playlist.name}"`
                  })
                }
                console.log("Registering", playlist.name);
              }
            }
          })
          const playbackState = await authenticatedRequest(
            "https://api.spotify.com/v1/me/player"
          );
          const previousState = dataPacket.playbackState;
          if(previousState.item?.id !== playbackState.item?.id) {
            this.notifyOfSong(playbackState);
          }
          addToDataPacket("playbackState", playbackState);


          this.io.emit("spotify_data", dataPacket);
        }, 500);
    });
    return true;
  }

  notifyOfSong(playbackState) {
    this.pushNotification(`Now playing ${playbackState.item?.name} by ${this.getArtistsNames(playbackState.item)}`, {
      image: playbackState.item.album.images[0].url
    })
  }

  getArtistsNames(playbackItem) {
    let output = "";
    const lastArtist = playbackItem.artists[playbackItem.artists.length-1];
    for(const artist of playbackItem.artists) {
      output += artist.name
      if(artist.name !== lastArtist.name) output += ", "
    }
    return output;
  }

  async onButton(interaction) {
    switch (interaction.type) {
      case "sp.rlco": {
        this.io.send("spotify_rlco");
        authorization = "";
        break;
      }
      case "sp.ntfy": {
        this.notifyOfSong(dataPacket.playbackState);
        break;
      }
      case "sp.playpause": {
        if (dataPacket.playbackState?.is_playing == false) {
          await authenticatedRequest(
            "https://api.spotify.com/v1/me/player/play",
            "PUT"
          );
        } else {
          await authenticatedRequest(
            "https://api.spotify.com/v1/me/player/pause",
            "PUT"
          );
        }
        break;
      }
      case "sp.next": {
        await authenticatedRequest(
          "https://api.spotify.com/v1/me/player/next",
          "POST"
        );
        break;
      }
      case "sp.prev": {
        await authenticatedRequest(
          "https://api.spotify.com/v1/me/player/previous",
          "POST"
        );
        break;
      }
      case "sp.shf": {
        const shuffleParams = new URLSearchParams();
        shuffleParams.append("state", !dataPacket.playbackState.shuffle_state);
        await authenticatedRequest(
          `https://api.spotify.com/v1/me/player/shuffle?${shuffleParams}`,
          "PUT"
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
