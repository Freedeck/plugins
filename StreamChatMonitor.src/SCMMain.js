const path = require("path");
const Plugin = require(path.resolve('./src/classes/Plugin'));
const TwitchBot = require('twitch-bot')
const {
    WebcastPushConnection
} = require('tiktok-live-connector');
const { Events, Kient } = require('kient')


class SCM extends Plugin {
    tiktokStreamer = '';
    constructor() {
        // With JS Hooks, you must keep the ID of your plugin the name of the source folder.
        super('Stream Chat Monitor', 'Freedeck', 'StreamChatMonitor', false);
        this.version = '1.1.0';
    }

    onInitialize() {
        const tiktokUsername = this.getFromSaveData("tiktokUsername");
        if (tiktokUsername == undefined || tiktokUsername == "") {
            console.log("[SC] (TikTok) No user found, please enter the username (no @) of the streamer's chat you want to monitor in the config.")
            this.setToSaveData('tiktokUsername', '');
            return false;
        }
        const twitchUser = this.getFromSaveData("twitchUser");
        if (twitchUser == undefined || twitchUser == "") {
            console.log("[SC] (Twitch) No user found, please enter the username (no @) of the streamer's chat you want to monitor in the config.")
            this.setToSaveData('twitchUser', '');
            return false;
        }
        const twitchUsername = this.getFromSaveData("twitchUsername");
        if (twitchUsername == undefined || twitchUsername == "") {
            console.log("[SC] (Twitch) No username for oauth token found for Twitch, please enter it in the config.")
            this.setToSaveData('twitchUsername', '');
            return false;
        }
        const twitchOauth = this.getFromSaveData("twitchOauth");
        if (twitchOauth == undefined || twitchOauth == "") {
            console.log("[SC] (Twitch) No oauth token found for Twitch, please enter it in the config.")
            this.setToSaveData('twitchOauth', '');
            return false;
        }
        const kickUser = this.getFromSaveData("kickUser");
        if (kickUser == undefined || kickUser == "") {
            console.log("[SC] (Kick) No user found, please enter the username (no @) of the streamer's chat you want to monitor in the config.")
            this.setToSaveData('kickUser', '');
            return false;
        }
        console.log('[SC] Initialized, connecting to @' + tiktokUsername + '\'s chat.. (TikTok)')
        console.log('[SC] Initialized, connecting to @' + twitchUser + '\'s chat.. (Twitch)')
        console.log('[SC] Initialized, connecting to @' + kickUser + '\'s chat.. (Kick)')

        const Bot = new TwitchBot({
            username: twitchUsername,
            oauth: twitchOauth,
            channels: [twitchUser]
          })
          
          Bot.on('join', channel => {
            console.log(`[SC] (Twitch) Joined channel: ${channel}`)
          })
          
          Bot.on('error', err => {
            console.log(err)
          })
          
          Bot.on('message', chatter => {
            this.pushNotification(chatter.username+' says: '+chatter.message +' (Twitch)')
          })

          let tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

        tiktokLiveConnection.connect().then(state => {
            console.info(`[SC] (TikTok) Connected to room ${state.roomId}`);
        }).catch(err => {
            console.error('Failed to connect', err);
        })

        tiktokLiveConnection.on('chat', data => {
            this.pushNotification(`${data.userId} says: ${data.comment} (TikTok)`)
        })
        
        tiktokLiveConnection.on('gift', data => {
            this.pushNotification(`${data.userId} gifted you a ${data.giftId}! (TikTok)`)
        })

        // Create a new client instance
        try {
            this.doKick()
        } catch(er) {
            console.error(er)
        }

        return true;
    }
    async doKick() {
        const client = await Kient.create()

        // Get a channel and listen to its chatroom
        const channel = await client.api.channel.getChannel(this.getFromSaveData("kickUser"))
        await client.ws.chatroom.listen(channel.data.chatroom.id)

        // Handle incoming messages
        client.on(Events.Chatroom.Message, (message) => {
            this.pushNotification(`${message.data.sender.username} says: ${message.data.content} (Kick)`)
        })
    }
}

module.exports = {
    exec: () => new SCM(),
    class: SCM
}