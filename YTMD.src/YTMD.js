const { Plugin, HookRef, types, events, intents } = require("@freedeck/api");

class YTMD extends Plugin {
    pswd;
    setup() {
        this.createSaveData();
        if(!this.getFromSaveData('pswd')) {
            this.setToSaveData('pswd', 'Change me!')
            console.log('You have not set your password for YTMD. Please set it in the plugin settings, or turn off password protection in the YTMD settings.')
        }
        this.pswd = this.getFromSaveData('pswd');
    }

    query(url, pw, action='') {
        return new Promise((resolvePro, rej) => {
            fetch(url + '/query' + (action!=''?'/' + action:''), {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + pw
                }
            }).then((res) => res.json()).then((res)=> {
                resolvePro(res)
            }).catch((err) => {
            })
        })
    }

    command(url, pw, action, value="") {
        return new Promise((resolvePro, rej) => {
            fetch(url + '/query', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + pw
                },
                body: JSON.stringify({
                    command: action,
                    value
                })
            }).then((res) => res.json()).then((res)=>{
                resolvePro(res)
            }).catch((err) => {
            })
        })
    }
    onInitialize () {
        let lastSong = '';
        const simple = [
            {
                name: 'Play/Pause',
                command: 'track-pause'
            },
            {
                name: 'Next',
                command: 'track-next'
            },
            {
                name: 'Previous',
                command: 'track-previous'
            },
            {
                name: 'Volume Up',
                command: 'player-volume-up'
            },
            {
                name: 'Volume Down',
                command: 'player-volume-down'
            },
            {
                name: 'Forward 10s',
                command: 'player-forward'
            },
            {
                name: 'Rewind 10s',
                command: 'player-rewind'
            },
            {
                name: 'Toggle Shuffle',
                command: 'player-shuffle'
            },
        ]
        simple.forEach((button) => {
            this.register({
                display: button.name,
                type: 'ytmd.cmd.' + button.command
            })
        });
        this.register({
            display: "Music Volume",
            type: 'ytmd.slider.vol',
            renderType: "slider",
            templateData: {
                min: 0,
                max: 100,
                value: 50,
                direction: 'vertical'
            }
        })
        this.setJSSocketHook('ytmd/sock.js');
        this.add(HookRef.types.client, "ytmd/mainHook.js");
        this.add(HookRef.types.server, "ytmd/mainHook.js");
        this.requestIntent(intents.IO);
        this.requestIntent(intents.SOCKET);
        this.on(events.connection, ({socket,io}) => {
            socket.on('yvo', () => {
                this.ytmdVol().then((vol) => {
                    io.emit('yvo', vol);
                })
            })
            this.stateChange = (...data) => {
                const track = data[0];
                const player = data[1];
                io.emit('_t', `Playing: ${track.title} by ${track.author} (${player.seekbarCurrentPositionHuman}/${track.durationHuman})`);
            }
        })

        setInterval(() => {
            this.query('http://localhost:9863', this.pswd, 'track').then((res1) => {
                this.query('http://localhost:9863', this.pswd, 'player').then((res2) => {
                    if(lastSong != res1.title+'-'+res1.author) {
                        this.pushNotification('Now playing: ' + res1.title + ' by ' + res1.author, {
                            image: res1.image
                        })
                    }
                    lastSong = res1.title+'-'+res1.author;
                    this.stateChange(res1, res2)
                })
            })
        }, 1500);
        // This is all you need to do. Freedeck will do all of the logic for you.
        return true;
    }

    onButton(interaction) {
        if (interaction.type.includes('ytmd.cmd.')) {
            this.command('http://localhost:9863', this.pswd, interaction.type.split('ytmd.cmd.')[1]).then((res) => {
                console.log('Sent command to YTMD!');
            })
            .catch((err) => {
                console.error(err)
            })
        } else if (interaction.type.includes('ytmd.slider.vol')) {
            this.command('http://localhost:9863', this.pswd, 'player-set-volume', parseInt(interaction.data.value)).then((res) => {
                console.log('Sent command to YTMD!');
                instance.ytmdVol().then((vol) => {
                    io.emit('yvo', vol);
                })
            })
            .catch((err) => {
                console.error(err)
            })
        }
    }

    ytmdVol() {
        return new Promise((resolvePro, rej) => {
            this.query('http://localhost:9863', this.pswd, 'player').then((res) => {
                resolvePro(res.volumePercent)
            }).catch((err) => {
            })
        });
    }

    stateChange(){}
}

module.exports = {
	exec: () => new YTMD(),
 	class: YTMD
}