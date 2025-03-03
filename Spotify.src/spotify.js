const { Plugin, events, types, intents, HookRef } = require("@freedeck/api");
const { app } = require("@src/http.js");
const {generateRandomString, base64urlEncode, sha256} = require("./utils");
const codeVerifier = generateRandomString(128);
const codeChallenge = base64urlEncode(sha256(codeVerifier));

const clientId = "2d0b90c5aaae4e19989e9852da3d1899";
const authUrl = new URL("https://accounts.spotify.com/authorize")
const redirectUri = "http://127.0.0.1:5754/spotify/callback";

authUrl.search = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  scope: 'user-read-playback-state user-modify-playback-state',
  code_challenge_method: 'S256',
  code_challenge: codeChallenge,
  redirect_uri: redirectUri,
}).toString();

let authorization = {};
let authorizationObject = {};

app.get('/spotify/callback', function(req, res) {
  const {code} = req.query;
  getToken(code).then((e) => {
    authorization = e;
    res.send("<h1>Authentication success!</h1><p>Please return to Freedeck, close this window, if it hasn't already.</p><script>window.close()</script>")
  })
});

const url = "https://accounts.spotify.com/api/token";
const getToken = async code => {
  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  }

  const body = await fetch(url, payload);
  const response = await body.json();
  authorizationObject.grabbed = Date.now() / 1000;
  authorizationObject = response;
  return response.access_token;
}


async function authenticatedRequest(url,method='GET',body=null) {
  if(authorization === "") {
    return {error:{status:400}}
  }
  const request = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + authorization
    },
    body
  }).catch((err) => {
    return {json:async ()=>{
      return {error: {status:-1, message: err}}
    }}
  })
  let data = await request.text();
  try {
    if(data.length > 0) data = JSON.parse(data);
    if(data.error) {
      console.log(data.error)
    }
  }catch(ignored){}
  return data;
}

let dataPacket = {playbackState:{}};
function addToDataPacket(k,v) {
  dataPacket[k] = v;
}
function clearDataPacket() {
  dataPacket = {};
}
addToDataPacket("auth", authUrl);

class Spotify extends Plugin {
  _loop;
  setup() {
    if(this.getFromSaveData("authobj")) {
      authorizationObject = this.getFromSaveData("authobj");
      authorization = this.getFromSaveData("ltk");
    }
    this.requestIntent(intents.IO);
    this.requestIntent(intents.SOCKET);

    this.add(HookRef.types.server, "spot/server.js");

    this.register({
      type: "sp.clf",
      display: "Currently Listening (Artists - Title)",
      renderType: types.text,
    });

    this.register({
      type: "sp.clt",
      display: "Currently Listening (Title)",
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

    this.on(events.connection, ({ socket, io }) => {
      this.io = io;
      socket.on('spotify_update', () => {
        io.emit("spotify_data", dataPacket);
      })
      if(!this._loop) this._loop = setInterval(async () => {
        let currentSecs = Date.now() / 1000;
        const secondsSinceGrab = Math.abs(currentSecs - authorizationObject.grabbed);
        if (authorizationObject.expires_in && secondsSinceGrab <= authorizationObject.expires_in) {
          const refreshToken = authorizationObject.refresh_token;
          const refreshPayload = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId,
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
            }),
          };
  
          const refreshResponse = await fetch(url, refreshPayload);
          const refreshData = await refreshResponse.json();
          authorizationObject = refreshData;
          authorization = refreshData.access_token;
        }
  
        if(this.getFromSaveData("ltk") != authorization || this.getFromSaveData("authobj") != authorizationObject) {
          this.setToSaveData("authobj", authorizationObject);
          this.setToSaveData("ltk", authorization);
        }
        const playbackState = await authenticatedRequest("https://api.spotify.com/v1/me/player");
        addToDataPacket("playbackState", playbackState);
  
        this.io.emit("spotify_data", dataPacket);
      }, 500);
    });
    return true;
  }

  async onButton(interaction) {
    switch(interaction.type) {
      case 'sp.playpause': {
        if(dataPacket.playbackState?.is_playing == false) {
          await authenticatedRequest("https://api.spotify.com/v1/me/player/play", 'PUT');
        } else {
          await authenticatedRequest("https://api.spotify.com/v1/me/player/pause", 'PUT');
        }
        break;
      }
      case 'sp.next': {
        await authenticatedRequest('https://api.spotify.com/v1/me/player/next', 'POST')
        break;
      }
      case 'sp.prev': {
        await authenticatedRequest('https://api.spotify.com/v1/me/player/previous', 'POST')
        break;
      }
    }
  }
}



module.exports = {
  exec: () => new Spotify(),
  class: Spotify,
};
