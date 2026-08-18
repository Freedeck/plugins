const { Plugin, HookRef, intents, events, SettingBuilder } = require("@freedeck/api");
const { Client } = require('@distdev/discord-ipc');
const { setStartupMessage } = require("@managers/startupMessage");

class Discord extends Plugin {
    setup() {
        setStartupMessage('Discord: Starting...')
        this.requestIntent(intents.SOCKET);
        this.requestIntent(intents.IO);

        this.add(HookRef.types.server, "server.js");
        this.add(HookRef.types.client, "server.js");

        this.useSetting(
            new SettingBuilder()
                .setId('clientId')
                .setName('App Client ID')
                .setDescription('Your Discord Application Client ID')
                .setDefaultValue('Enter client ID...')
                .setPlaceholder('Enter client ID...')
        );

        this.useSetting(
            new SettingBuilder()
                .setId('clientSecret')
                .setName('App Client Secret')
                .setDescription('Your Discord Application Client Secret')
                .setDefaultValue('Enter client Secret...')
                .setPlaceholder('Enter client Secret...')
        );

        this.useSetting(
            new SettingBuilder()
                .setId('useTbg')
                .setName('Use TextBG')
                .setDescription('Uses TextBG\'s top display to show who\'s currently in and speaking in VC.')
                .setAllowedValues('true', 'false')
                .setDefaultValue('true')
        );

        this.useSetting(
            new SettingBuilder()
                .setId('showcn')
                .setName('Show Channel Name')
                .setDescription('On top display, show current VC name.')
                .setAllowedValues('true', 'false')
                .setDefaultValue('true')
        );

        this.register({
            display: 'Toggle Mute',
            type: 'discord.mute.toggle',
            templateData: {},
            renderType: "button"
        })

        this.register({
            display: 'Toggle Deafen',
            type: 'discord.deafen.toggle',
            templateData: {},
            renderType: "button"
        })

        this.register({
            display: 'Join Given VC',
            type: 'discord.jvc',
            templateData: {
                channelId: '199737254929760257',
                navigate: 'true'
            },
            renderType: "button"
        })

        this.register({
            display: 'Leave Current VC',
            type: 'discord.lvc',
            renderType: "button"
        })

        this.register({
            display: 'Current VC',
            type: 'discord.cvc',
            renderType: "text"
        })

        this.register({
            display: 'Current Server',
            type: 'discord.cs',
            renderType: "text"
        })
        
        this.register({
            display: 'Current VC | Server',
            type: 'discord.cvcs',
            renderType: "text"
        })

        this.on(events.button, async ({ interaction }) => {
            const cs = await this.client.getVoiceSettings();
            if (interaction.type == 'discord.mute.toggle') {
                this.client.setVoiceSettings({
                    mute: !cs.mute
                }).catch(err => {
                    this.pushNotification('Couldn\'t toggle mute. ' + err.toString())
                });
            } else if (interaction.type == 'discord.deafen.toggle') {
                this.client.setVoiceSettings({
                    deaf: !cs.deaf
                }).catch(err => {
                    this.pushNotification('Couldn\'t toggle deafen. ' + err.toString())
                });
            } else if (interaction.type == 'discord.jvc') {
                this.client.selectVoiceChannel(interaction.data.channelId, {
                    navigate: interaction.data.navigate == 'true',
                    force: true
                }).catch(err => {
                    this.pushNotification('Couldn\'t move you to that VC. ' + err.toString())
                })
            } else if (interaction.type == 'discord.lvc') {
                this.client.selectVoiceChannel(null, {
                    force: true
                }).catch(err => {
                    this.pushNotification('Couldn\'t leave VC. ' + err.toString())
                })
            }
            setTimeout(()=>{
                this.updateVoiceState();
            },250);
        })

        this.speakingUsers = new Set();
        this.currentMembers = [];
        this.channelName = null;
        this.serverName = null;

        setStartupMessage('Discord: Loading RPC...')
        this.initRPC().catch(err => {
            this.log("Failed to initialize Discord RPC for tile:", err);
        });

        return true;
    }

    async initRPC() {
        this.client = new Client();
        setStartupMessage('Discord: Connecting..')

        this.client.on('ready', async () => {
            setStartupMessage('Discord: Connected!')
            this.log(`Discord RPC ready for tile plugin.`);

            if (this.client.accessToken) {
                this.setToSaveData("accTkn", this.client.accessToken)
            }
            if (this.client.refreshToken) {
                this.setToSaveData("refTkn", this.client.refreshToken)
            }

            this.startVoicePolling();

            try {
                const vc = await this.client.getSelectedVoiceChannel();
                if (vc && vc.id) {
                    await this.setupSpeakingSubscriptions(vc.id);
                }
            } catch (err) {
                this.log("Could not setup initial speaking subscriptions:", err);
            }
        });

        this.client.on('disconnected', () => {
            this.log("Discord RPC disconnected.");
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
            this.cleanupSubscriptions();
            this.currentMembers = [];
            this.channelName = null;
            this.broadcastState();
        });

        const clientId = this.getSetting("clientId") || "1538335570697265183";
        const clientSecret = this.getSetting("clientSecret") || "null";

        const savedToken = this.getFromSaveData("accTkn");
        const savedRefTkn = this.getFromSaveData("refTkn");

        try {
            await this.client.login({
                clientId: clientId,
                clientSecret: clientSecret,
                scopes: ['rpc', 'rpc.voice.read'],
                redirectUri: 'http://localhost:3000',
                accessToken: savedToken || undefined,
                refreshToken: savedRefTkn || undefined
            });
        } catch (err) {
            this.log("Failed login, clearing stale token if any:", err);
            this.setToSaveData("accTkn", "")
            this.setToSaveData("refTkn", "")
        }
    }

    async setupSpeakingSubscriptions(channelId) {
        try {
            await this.cleanupSubscriptions();

            this.speakingStartSub = await this.client.subscribe("SPEAKING_START", { channel_id: channelId });
            this.speakingStopSub = await this.client.subscribe("SPEAKING_STOP", { channel_id: channelId });

            this.client.on('SPEAKING_START', (e) => {
                if (e && e.user_id) {
                    this.speakingUsers.add(e.user_id);
                    if (this.socket) this.socket.emit('discord_speaking_start', e)
                    this.broadcastState();
                }
            });

            this.client.on('SPEAKING_STOP', (e) => {
                if (e && e.user_id) {
                    this.speakingUsers.delete(e.user_id);
                    if (this.socket) this.socket.emit('discord_speaking_stop', e)
                    this.broadcastState();
                }
            });
        } catch (err) {
            this.log("Failed to subscribe to speaking events:", err);
        }
    }

    async cleanupSubscriptions() {
        try {
            if (this.speakingStartSub && typeof this.speakingStartSub.unsubscribe === 'function') {
                await this.speakingStartSub.unsubscribe();
            }
            if (this.speakingStopSub && typeof this.speakingStopSub.unsubscribe === 'function') {
                await this.speakingStopSub.unsubscribe();
            }
        } catch (err) { }
        this.speakingStartSub = null;
        this.speakingStopSub = null;
    }

    startVoicePolling() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }

        this._pollingInterval = setInterval(async () => {
            await this.updateVoiceState();
        }, 5000);
    }

    async updateVoiceState() {
        if (!this.client || !this.client.user) return;

        try {
            const channel = await this.client.getSelectedVoiceChannel();
            if (!channel) {
                if (this.currentMembers.length > 0 || this.channelName !== null) {
                    this.currentMembers = [];
                    this.channelName = null;
                    this.serverName = null;
                    this.speakingUsers.clear();
                    this.broadcastState();
                }
                return;
            }

            const guild = await this.client.getGuild(channel.guild_id)
            this.serverName = guild.name;
            this.channelName = channel.name;
            const members = [];
            if (channel.voice_states && Array.isArray(channel.voice_states)) {
                for (const vs of channel.voice_states) {
                    if (vs.user) {
                        members.push({
                            id: vs.user.id,
                            avatar: vs.user.avatar,
                            name: vs.nick,
                            mute: vs.voice_state.self_mute || vs.mute || vs.voice_state.mute,
                            deaf: vs.voice_state.self_deaf || vs.voice_state.deaf,
                        });
                    }
                }
            }

            this.currentMembers = members;
            this.broadcastState();
        } catch (err) {
            this.log("Error updating voice state:", err);
        }
    }

    broadcastState() {
        if (!this.channelName || this.currentMembers.length === 0) {
            const payload = { text: "Not in a VC", members: [] };
            if (this.io && typeof this.io.emit === 'function') {
                this.io.emit("discord_vc_tile_update", payload);
            }
            return;
        }

        let formattedList = this.currentMembers.sort().map(member => {
            const isSpeaking = this.speakingUsers.has(member.id);
            let fmt = '%name%'
            if (member.mute) {
                fmt = '<s>%name%</s>'
                if (member.deaf) fmt = '<i><s style="opacity:0.5;">%name%</s></i>'
            }
            if (isSpeaking) fmt = '<b><i>%name%</i></b>'
            return fmt.replace('%name%', member.name)
        }).join(', ');
        if(this.getSetting('showcn') == 'true') formattedList = this.channelName + ' | ' + this.serverName + ' | ' + formattedList
        
        const payload = {
            channelName: this.channelName,
            serverName: this.serverName,
            text: formattedList,
            members: this.currentMembers
        };

        if (this.io && typeof this.io.emit === 'function') {
            this.io.emit("discord_vc_tile_update", payload);
        }
    }

    onStopping() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
        this.cleanupSubscriptions();
        if (this.client) {
            try { this.client.destroy(); } catch (err) { }
        }
    }
}

module.exports = {
    exec: () => new Discord(),
    class: Discord
};