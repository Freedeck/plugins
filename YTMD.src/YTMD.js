const path = require("path");
const Plugin = require(path.resolve('./src/classes/Plugin'));

class YTMD extends Plugin {
    pswd;
    constructor() {
        // With JS Hooks, you must keep the ID of your plugin the name of the source folder.
        super('YouTube Music Desktop', 'Freedeck', 'YTMD', false);
        this.createSaveData();
        this.version = '1.1.0';
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
            this.registerNewType(button.name, 'ytmd.cmd.' + button.command)
        });
        this.registerNewType('Music Volume', 'ytmd.slider.vol', {min: 0, max: 100, value: 50, direction:'vertical'}, 'slider');
        this.setJSClientHook('ytmd/mainHook.js');
        this.setJSServerHook('ytmd/mainHook.js');
        this.setJSSocketHook('ytmd/sock.js');

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
                this.emitAllYVol();
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
    emitAllYVol(){}
}

module.exports = {
	exec: () => new YTMD(),
 	class: YTMD
}