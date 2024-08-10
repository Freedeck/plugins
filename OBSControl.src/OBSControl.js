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
        this.version = '1.2.0';
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

    muteStatus(name,iuid) {
        return obs.call('GetInputMute', {
            inputName: name,
            inputUuid: iuid
        }).then((data) => {
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
        this.registerNewType('Reconnect to OBS', 'obs.cf', {}, 'button');
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
            this.registerNewType('Current Scene', 'obs.cs', {}, 'text');
            
            this.registerNewType('Source Visibility', 'obs.src.vis', {Scene: 'Change me!', Source:'Change me!'}, 'button');
            
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
                    this.registerNewType('Mute ' + input.inputName, 'obs.m.' + input.inputUuid, {name:input.inputName}, 'button');
                })
            }).catch((err) => {
                console.error('Error while getting output (WASAPI OUT) capture list', err);
            })
            obs.call('GetInputList', {inputKind: 'wasapi_input_capture'}).then((data) => {
                this.wasInputs = data.inputs;
                data.inputs.forEach((input) => {
                    this.registerNewType('Volume of ' + input.inputName, 'obs.v.' + input.inputUuid, {name:input.inputName, value:0,format:'dB', min: -100, max: 25, direction: 'vertical'}, 'slider');
                    this.registerNewType('Mute ' + input.inputName, 'obs.m.' + input.inputUuid, {name:input.inputName}, 'button');
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
                _SIO.emit('oc_cs', data.sceneName);
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
            obs.addListener('InputMuteStateChanged', (data) => {
                if(_SIO == false) return;
                console.log('Mute state of input', data.inputName, 'changed to', data.inputMuted);
                _SIO.emit('oc_ms', {...data, uuid: data.inputUuid});
            });
            obs.addListener('SceneItemEnableStateChanged', (data) => {
                if(_SIO == false) return;
                console.log('Visibility of input', data.sceneItemId, 'changed to', data.sceneItemEnabled);
                this.whoIsSceneItem(data.sceneName, data.sceneItemId).then((source) => {
                    _SIO.emit('oc_src_vis', {...data, ...source});
                });
            });
            obs.addListener('ConnectionClosed', (e) => {
                console.error('Connection closed', e);
                _SIO = false;
                _SS = false;
                this.pushNotification('Lost connection to OBS! Please reconnect by pressing the "Reconnect to OBS" Tile.');
            })
        }, (e) => {
            console.error('Error Connecting', e)
        });
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

    setEnabled(state, name, scene) {
        obs.call('GetSceneItemId', {
            sourceName: name,
            sceneName: scene,
        }).then((id) => {
            obs.call('SetSceneItemEnabled', {
                sourceName: name,
                sceneName: scene,
                sceneItemEnabled: state,
                sceneItemId: id.sceneItemId
            })
        })
    }

    whoIsSceneItem(name, id) {
        return obs.call('GetSceneItemSource', {
            sceneName: name,
            sceneItemId: id
        }).then((data) => {
            return data;
        }).catch((e) => {
            return e;
        });
    }

    visibility(scene, name) {
        return obs.call('GetSceneItemId', {
            sceneName: scene,
            sourceName: name,
        }).then((id) => {
            return obs.call('GetSceneItemEnabled', {
                sourceName: name,
                sceneName: scene,
                sceneItemId: id.sceneItemId
            }).then((data) => {
                return {...data, sourceName: name, uuid: id.sceneItemId};
            })
        }).catch((e) => {
        })
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
        } else if(interaction.type.startsWith('obs.m.')) {
            let uuid = interaction.type.split('obs.m.')[1];
            obs.call('ToggleInputMute', {
                inputUuid: uuid
            }).catch((err) => {
                console.error('Error while toggling mute', err);
            })
        }
        switch(interaction.type) {
            default:
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
            case 'obs.src.vis':
                this.visibility(interaction.data.Scene, interaction.data.Source).then((data) => {
                    this.setEnabled(!data.sceneItemEnabled, interaction.data.Source, interaction.data.Scene);
                })
                break;
        }
        return true;
    }

}

module.exports = {
    exec: () => new OBSControl(),
    class: OBSControl
}