const eventNames = require("@handlers/eventNames");
const { Plugin, events, types, intents, HookRef } = require("@freedeck/api");
const {
  authorizationUrl,
  authenticatedRequest,
  refreshPeriodicLoop,
  initialize,
} = require("./AuthenticationManager");

const staticTypes = require("./StaticTypes.json");

const { dataPacket, get, set, remove } = require("./DataPacketManager");
set("playbackState", {authorizationUrl});

let shouldRegisterPlaylistsType = true;

class Spotify extends Plugin {
  _loop;
  setup() {
    initialize(this);
    this.requestIntent(intents.IO);
    this.requestIntent(intents.SOCKET);

    this.add(HookRef.types.server, "spot/server.js");
    this.add(HookRef.types.client, "spot/server.js");

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

      socket.on("spotify_update", () => {
        io.emit("spotify_data", dataPacket);
      });

      if (!this._loop)
        this._loop = setInterval(async () => {
          await refreshPeriodicLoop(this);

          const playbackState = (await authenticatedRequest(
            "https://api.spotify.com/v1/me/player"
          )) || {};

          const previousState = get("playbackState", {});
          if (previousState.item?.id !== playbackState?.item?.id) {
            this.notifyOfSong(playbackState);
          }

          set("playbackState", {...playbackState, authorizationUrl});

          if (
            playbackState !== null &&
            Object.keys(playbackState).length > 0 &&
            shouldRegisterPlaylistsType === true
          ) {
            console.log("Fetching playlists...");
            authenticatedRequest(
              "https://api.spotify.com/v1/me/playlists"
            ).then((playlists) => {
              if (playlists.items) {
                for (const playlist of playlists.items) {
                  this.register({
                    type: `sp.ps.${playlist.id}`,
                    display: `Start playlist "${playlist.name}"`,
                  });
                  console.log("Registering", playlist.name);
                }
              }
            });
            shouldRegisterPlaylistsType = false;
            this.io.emit(eventNames.default.reload);
          }
          this.io.emit("spotify_data", dataPacket);
        }, 500);
    });
    return true;
  }

  notifyOfSong(playbackState) {
    this.pushNotification(
      `Now playing ${playbackState.item?.name} by ${this.getArtistsNames(
        playbackState.item
      )}`,
      {
        image: playbackState.item?.album?.images[0].url,
      }
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
