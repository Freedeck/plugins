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

    replayBufferStatus() {
        return obs.call("GetReplayBufferStatus").then((data) => {
            return data;
        }).catch(err => {
            return err;
        })
    }

    saveFromReplayBuffer() {
        return obs.call("SaveReplayBuffer").then((data) => {
            return data;
        }).catch(err => {
            return err;
        })
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
            console.log('[OBSControl] Connected and identified. OBS WS: v' + info.obsWebSocketVersion)
            if(this.deregisterType) this.deregisterType('obs.auth');
            this.registerNewType('Current Scene', 'obs.cs', {}, 'text');
            
            this.registerNewType('Start Recording', 'obs.rec.start', {}, 'button');
            this.registerNewType('Stop Recording', 'obs.rec.stop', {}, 'button');
            this.registerNewType('Toggle Start/Stop Recording', 'obs.rec.toggle', {}, 'button');
            this.registerNewType('Toggle Pause/Unpause', 'obs.rec.toggle_pause', {}, 'button');
            
            this.registerNewType('Start Streaming', 'obs.str.start', {}, 'button');
            this.registerNewType('Stop Streaming', 'obs.str.stop', {}, 'button');
            this.registerNewType('Toggle Start/Stop Streaming', 'obs.str.toggle', {}, 'button');
            
            this.registerNewType('Start Replay Buffer', 'obs.rb.start')
            this.registerNewType('Save from Replay Buffer', 'obs.rb.save')
            this.registerNewType('Stop Replay Buffer', 'obs.rb.stop')
            this.registerNewType('Toggle Replay Buffer', 'obs.rb.toggle')
            
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
            obs.addListener('ReplayBufferSaved', (data) => {
                if(_SIO == false) return;
                console.log('Replay buffer saved!');
                this.pushNotification('Replay buffer saved!');
            });
        }, (e) => {
            console.error('Error Connecting', e)
        });
        this.registerNewType('Reconnect to OBS', 'obs.cf', {}, 'button');
    }

    typeToCall(call, returnNotif = false, notifHook=(e)=>{}) {
        obs.call(call).then((data) => {
            console.log('Called', call, 'successfully');
            return data;
        }).catch((err) => {
            console.error('Error while calling', call, err);
            if(returnNotif) notifHook(err)
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
        } 
        switch(interaction.type) {
            default:
                this.pushNotification('Unknown button type: ' + interaction.type);
                break;
            case 'obs.rec.start':
                this.typeToCall('StartRecord');
                break;
            case 'obs.rec.stop':
                this.typeToCall('StopRecord');
                break;
            case 'obs.rec.toggle':
                let out = this.typeToCall('ToggleRecord');
                _SIO.emit('oc_rec', out.outputActive);
                break;
            case 'obs.rec.toggle_pause':
                this.typeToCall('ToggleRecordPause');
                break;
            case 'obs.str.start':
                this.typeToCall('StartStream', true, (e) => {
                    let msg = e.code == 500 ? 'You\'re already streaming!' : e.error;
                    this.pushNotification('Error while starting stream. ' + msg);
                });
                break;
            case 'obs.str.stop':
                this.typeToCall('StopStream', true, (e) => {
                    let msg = e.code == 500 ? 'You\'re not streaming!' : e.error;
                    this.pushNotification('Error while stopping stream. ' + msg);
                });
                break;
            case 'obs.str.toggle':
                let str = this.typeToCall('ToggleStream');
                _SIO.emit('oc_str', str.outputActive);
                break;
            case 'obs.rb.start':
                this.typeToCall('StartReplayBuffer');
                break;
            case 'obs.rb.stop':
                this.typeToCall('StopReplayBuffer');
                break;
            case 'obs.rb.toggle':
                let rb = this.typeToCall('ToggleReplayBuffer');
                _SIO.emit('oc_rb', rb.outputActive);
                break;
            case 'obs.rb.save':
                this.typeToCall('SaveReplayBuffer');
                break;
        }
        return true;
    }

}

module.exports = {
    exec: () => new OBSControl(),
    class: OBSControl
}