const path = require("path");
const Plugin = require(path.resolve('./src/classes/Plugin'));
const { default: OBSWebSocket } = require('obs-websocket-js');

const obs = new OBSWebSocket();
let _SS = null;
let _SIO = null;
class OBSControl extends Plugin {
    currentScene;
    scenes;
    wasOutputs;
    wasInputs;
    constructor() {
        // With JS Hooks, you must keep the ID of your plugin the name of the source folder.
        super('OBS Control', 'Freedeck', 'OBSControl', false);
        this.version = '1.0.0';
    }

    currentSceneTitle() {
        return new Promise((resolve, reject) => {
            obs.call('GetCurrentProgramScene').then((data) => {
                resolve(data);
            }).catch((e) => {
                resolve(e);
            });
        });
    }

    volumeOf(inputname, inputuuid) {
        return obs.call('GetInputVolume', {
            inputName: inputname,
            inputUuid: inputuuid
        }).then((data) => {
            return data;
        }).catch(err =>{
            return err;
        })
    }

    recordStatus() {
        return obs.call('GetRecordStatus').then((data) => {
            return data;
        }).catch(err => {
            return err;
        })
    }

    streamStatus() {
        return obs.call('GetStreamStatus').then((data) => {
            return data;
        }).catch(err => {
            return err;
        });
    }

    SockyInterop(socket, io) {
        console.log('Loaded Socket Interop for OBSControl!')
        _SS = socket;
        _SIO = io;
    }

    onInitialize() {
        console.log('Initialized OBSControl!')
        this.setJSServerHook("oc/server.js");
        this.setJSClientHook("oc/server.js");
        this.setJSSocketHook("oc/socket.js");

        let pswd = this.getFromSaveData('password');
        if (!pswd) {
            this.setToSaveData('password', 'password');
        }
        if(!this.deregisterType) {
            console.log('You\'re running Freedeck on a version below v6.0.0-ob7!')
            console.log('You will only notice the "Authenticate OBS" tile type not being removed. The plugin will still work as normal.');
        }
        this.registerNewType('Authenticate OBS', 'obs.auth', {}, 'button');
        this.tryConnecting();

        // This is all you need to do. Freedeck will do all of the logic for you.
        return true;
    }

    tryConnecting() {
        let pswd = this.getFromSaveData('password');
        obs.connect('ws://localhost:4455', pswd).then((info) => {
            if(this.deregisterType) this.deregisterType('obs.auth');
            this.registerNewType('Current Scene', 'obs.cs', {}, 'text');
            this.registerNewType('Start Recording', 'obs.rec.start', {}, 'button');
            this.registerNewType('Stop Recording', 'obs.rec.stop', {}, 'button');
            this.registerNewType('Toggle Start/Stop Recording', 'obs.rec.toggle', {}, 'button');
            this.registerNewType('Toggle Pause/Unpause', 'obs.rec.toggle_pause', {}, 'button');
            this.registerNewType('Start Streaming', 'obs.str.start', {}, 'button');
            this.registerNewType('Stop Streaming', 'obs.str.stop', {}, 'button');
            this.registerNewType('Toggle Start/Stop Streaming', 'obs.str.toggle', {}, 'button');
            console.log('[OBSControl] Connected and identified. OBS WS: v' + info.obsWebSocketVersion)
            obs.call('GetCurrentProgramScene').then((data) => {
                this.currentScene = data.sceneName;
            }).catch((err) => {
                console.error('Error while getting current scene', err);
            })
            obs.call('GetSceneList').then((data) => {
                data.scenes.forEach((scene) => {
                    this.registerNewType('Switch to ' + scene.sceneName, 'obs.ss.' + scene.sceneName);
                });
            }).catch((err) => {
                console.error('Error while getting the scene list', err);
            })
            obs.call('GetInputList', {inputKind: 'wasapi_output_capture'}).then((data) => {
                this.wasOutputs = data.inputs;
                data.inputs.forEach((input) => {
                    this.registerNewType('Volume of ' + input.inputName, 'obs.v.' + input.inputUuid, {name:input.inputName, value:0,format:'dB',min: -100, max: 25, direction: 'vertical'}, 'slider');
                })
            }).catch((err) => {
                console.error('Error while getting output (WASAPI OUT) capture list', err);
            })
            obs.call('GetInputList', {inputKind: 'wasapi_input_capture'}).then((data) => {
                this.wasInputs = data.inputs;
                data.inputs.forEach((input) => {
                    this.registerNewType('Volume of ' + input.inputName, 'obs.v.' + input.inputUuid, {name:input.inputName, value:0,format:'dB', min: -100, max: 25, direction: 'vertical'}, 'slider');
                })
            }).catch((err) => {
                console.error('Error while getting output (WASAPI IN) capture list', err);
            })
            obs.addListener('RecordStateChanged', (data) => {
                console.log(data.outputActive ? "Recording Started" : "Recording Stopped")
                _SIO.emit('oc_rec', data);
            })
            obs.addListener('StreamStateChanged', (data) => {
                console.log(data.outputActive ? "Stream started" : "Stream stopped");
                _SIO.emit("oc_str", data);
            })
            obs.addListener('CurrentProgramSceneChanged', (data) => {
                console.log('Current scene changed to', data.sceneName)
                this.currentScene = data.sceneName;
            });
            obs.addListener('InputVolumeChanged', (data) => {
                if(_SIO == false) return;
                console.log('Volume of input', data.inputName, 'changed to', data.inputVolumeDb)
                _SIO.emit('oc_vo', {...data, uuid: data.inputUuid});
            })
        }, (e) => {
            console.error('Error Connecting', e)
            this.registerNewType('Retry Connection', 'obs.cf', {}, 'button');
        });
    }

    onButton(interaction) {
        if(interaction.type == 'obs.cf') {
            this.tryConnecting();
            _SIO.emit('dR')
        }
        if(interaction.type == 'obs.auth') {
            this.pushNotification('Please edit this tile, and press "View Settings" and put your server password in the password box.');
        }
        if (interaction.type.startsWith('obs.ss.')) {
            let scene = interaction.type.split('obs.ss.')[1];
            obs.call('SetCurrentProgramScene', {
                'sceneName': scene
            }).catch((err) => {
                console.error('Error while setting current scene', err);
            })
        } else if (interaction.type.startsWith('obs.v.')) {
            let uuid = interaction.type.split('obs.v.')[1];
            obs.call('SetInputVolume', {
                inputUuid: uuid,
                inputVolumeDb: parseFloat(interaction.data.value)
            }).catch((err) => {
                console.error('Error while setting input volume', err);
            })
        } else if(interaction.type == 'obs.rec.start') {
            obs.call('StartRecord').catch((err) => {
                console.error('Error while starting recording', err);
            })
        } else if(interaction.type == 'obs.rec.stop') {
            obs.call('StopRecord').catch((err) => {
                console.error('Error while stopping recording', err);
            })
        } else if(interaction.type == 'obs.rec.toggle_pause') {
            obs.call('ToggleRecordPause').catch((err) => {
                console.error('Error while toggling recording pause', err);
            });
        } else if(interaction.type == 'obs.rec.toggle') {
            obs.call('ToggleRecord').then((res) => {
                _SIO.emit('oc_rec', res.outputActive);
            }).catch((err) => {
                console.error('Error while toggling recording pause', err);
            });
        } else if(interaction.type == 'obs.str.start') {
            obs.call('StartStream').catch((err) => {
                console.error('Error while starting streaming', err);
            })
        } else if(interaction.type == 'obs.str.stop') {
            obs.call('StopStream').catch((err) => {
                console.error('Error while stopping streaming', err);
            })
        } else if(interaction.type == 'obs.str.toggle') {
            obs.call('ToggleStream').catch((err) => {
                console.error('Error while toggling streaming', err);
            })
        }
        return true;
    }

}

module.exports = {
    exec: () => new OBSControl(),
    class: OBSControl
}