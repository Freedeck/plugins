const {Plugin, HookRef, types, events, intents} = require("@freedeck/api");
const { default: OBSWebSocket } = require('obs-websocket-js');

const obs = new OBSWebSocket();
let _timer = null;
class OBSControl extends Plugin {
    currentScene;
    scenes;
    wasOutputs;
    wasInputs;
    currentDataPacket;

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

    setInDataPacket(key, value) {
        if(!this.currentDataPacket) this.currentDataPacket = {};
        if(!this.currentDataPacket[key]) this.currentDataPacket[key] = "";
        this.currentDataPacket[key] = value;
    }

    addToDataPacket(key, ...value) {
        if(!this.currentDataPacket) this.currentDataPacket = {};
        if(!this.currentDataPacket[key]) this.currentDataPacket[key] = [];
        this.currentDataPacket[key].push(...value);
    }

    SockyInterop(socket, io) {
        console.log('Registered socket.io events for OBSControl');
        socket.on('oc_vo', (idata) => {
            this.setInDataPacket('oc_vo', []);
            this.volumeOf(idata.name, idata.uuid).then((data) => {
                this.addToDataPacket('oc_vo', {...data, uuid: idata.uuid})
            })
        })
        socket.on('oc_ms', (idata) => {
            this.setInDataPacket('oc_ms', []);
            this.muteStatus(idata.name, idata.uuid).then((data) => {
                this.addToDataPacket('oc_ms', {...data, uuid: idata.uuid})
            })
        })
        socket.on('oc_src_vis', (idata) => {
            this.setInDataPacket('oc_src_vis', []);
            this.visibility(idata.Scene, idata.Source).then((data) => {
                this.addToDataPacket('oc_src_vis', {...data, uuid: idata.uuid})
            })
        })
        this.MAKESUREPACKETISSENTTO(io);
    }

    MAKESUREPACKETISSENTTO(socket, count=5) {
        let introCounter = 0;
        let introduction = setInterval(() => {
            socket.emit("oc_data", this.currentDataPacket);
            if(introCounter++ > count) clearInterval(introduction)
        },500);
    }

    setup() {
        console.log('Initialized OBSControl!')
        this.currentDataPacket = {};
        this.hidePopout();

        this.requestIntent(intents.SOCKET);
        this.requestIntent(intents.IO);

        this.addView("OBS Control", "editor");

        this.add(HookRef.types.server, 'oc/server.js');
        this.add(HookRef.types.client, 'oc/server.js');

        let pswd = this.getFromSaveData('password');
        if (!pswd) {
            this.setToSaveData('password', 'password');
        }

        this.register({
            display: "Reconnect to OBS",
            type: "obs.cf",
            hidden: true,
            templateData: {
                password: "change-me"
            }
        })
        try {
            this.tryConnecting();
        } catch(err) {
            console.log("[OC] Could not connect.")
        }

        this.on(events.connection, ({socket, io}) => {
            if(_timer) clearInterval(_timer);
            _timer = setInterval(() => {
                if(this.io) {
                    this.io.emit('oc_data', this.currentDataPacket);
                }
            },500);
            this.SockyInterop(socket, io)
        });
        

        // This is all you need to do. Freedeck will do all of the logic for you.
        return true;
    }

    _packetUpdateLoop;
    tryConnecting() {
        let pswd = this.getFromSaveData('password');
        obs.connect('ws://localhost:4455', pswd).then((info) => {
            this.currentDataPacket = {};
            console.log('[OBSControl] Connected and identified. OBS WS: v' + info.obsWebSocketVersion)

            this.deregisterAllTypes();

            this.register({
                display: "Reconnect to OBS",
                type: "obs.cf",
                hidden: true,
                templateData: {
                    password: "change-me"
                }
            })

            this.register({
                hidden: true,
                display: "Current Scene",
                type: "obs.cs",
                renderType: types.text
            })

            this.register({
                display: "Source Visibility",
                type: "obs.src.vis",
                templateData: {
                    Scene: 'Change me!',
                    Source: 'Change me!'
                }
            })

            this.register({
                hidden: true,
                display: "Start Recording",
                type: "obs.rec.start",
            })
            
            this.register({
                hidden: true,
                display: "Stop Recording",
                type: "obs.rec.stop",
            })

            this.register({
                hidden: true,
                display: "Recording Time",
                type: "obs.rec.time",
                renderType: types.text
            })
            
            this.register({
                hidden: true,
                display: "Toggle Start/Stop Recording",
                type: "obs.rec.toggle",
            })

            this.register({
                hidden: true,
                display: "Toggle Pause/Unpause",
                type: "obs.rec.toggle_pause",
            })

            this.register({
                hidden: true,
                display: "Streaming Time",
                type: "obs.rec.time",
                renderType: types.text
            })

            this.register({
                hidden: true,
                display: "Start Streaming",
                type: "obs.str.start",
            })

            this.register({
                hidden: true,
                display: "Stop Streaming",
                type: "obs.str.stop",
            })

            this.register({
                hidden: true,
                display: "Toggle Start/Stop Streaming",
                type: "obs.str.toggle",
            })

            this.register({
                hidden: true,
                display: "Start Replay Buffer",
                type: "obs.rb.start",
            })

            this.register({
                hidden: true,
                display: "Save from Replay Buffer",
                type: "obs.rb.save",
            })

            this.register({
                hidden: true,
                display: "Stop Replay Buffer",
                type: "obs.rb.stop",
            })

            this.register({
                hidden: true,
                display: "Toggle Replay Buffer",
                type: "obs.rb.toggle",
            })

            if(this.io && this.io.emit) this.io.emit('dR')

            this._packetUpdateLoop = setInterval(() => {
                    this.setInDataPacket('oc_cs', this.currentScene);
                    this.recordStatus().then((data) => {
                        this.setInDataPacket('oc_rec', data);
                    })
                    this.streamStatus().then((data) => {
                        this.setInDataPacket('oc_str', data);
                    })
                    this.replayBufferStatus().then((data) => {
                        this.setInDataPacket('oc_rb', data);
                    })
            }, 499);

            obs.call('GetCurrentProgramScene').then((data) => {
                this.currentScene = data.sceneName;
            }).catch((err) => {
                console.error('Error while getting current scene', err);
            })
            obs.call('GetSceneList').then((data) => {
                data.scenes.forEach((scene) => {
                    this.register({
                        hidden: true,
                        display: 'Switch to ' + scene.sceneName, 
                        type: 'obs.ss.' + scene.sceneName
                    });
                });
            }).catch((err) => {
                console.error('Error while getting the scene list', err);
            })
            obs.call('GetInputList', {inputKind: 'wasapi_output_capture'}).then((data) => {
                this.wasOutputs = data.inputs;
                data.inputs.forEach((input) => {
                    this.register({
                        hidden: true,
                        display: 'Volume of ' + input.inputName, 
                        type: 'obs.v.' + input.inputUuid, 
                        templateData: {name:input.inputName, value:0,format:'dB',min: -100, max: 25, direction: 'vertical'},
                        renderType: types.slider
                    });
                    this.register({
                        hidden: true,
                        display: 'Mute ' + input.inputName,
                        type: 'obs.m.' + input.inputUuid,
                        templateData: {name:input.inputName},
                    });
                })
            }).catch((err) => {
                console.error('Error while getting output (WASAPI OUT) capture list', err);
            })
            obs.call('GetInputList', {inputKind: 'wasapi_input_capture'}).then((data) => {
                this.wasInputs = data.inputs;
                data.inputs.forEach((input) => {
                    this.register({
                        hidden: true,
                        display: 'Volume of ' + input.inputName, 
                        type: 'obs.v.' + input.inputUuid, 
                        templateData: {name:input.inputName, value:0,format:'dB', min: -100, max: 25, direction: 'vertical'},
                        renderType: types.slider
                    });
                    this.register({
                        hidden: true,
                        display: 'Mute ' + input.inputName,
                        type: 'obs.m.' + input.inputUuid,
                        templateData: {name:input.inputName},
                    });
                })
            }).catch((err) => {
                console.error('Error while getting output (WASAPI IN) capture list', err);
            })
            obs.addListener('RecordStateChanged', (data) => {
                console.log(data.outputActive ? "Recording Started" : "Recording Stopped")
                this.setInDataPacket('oc_rec', data);
            })
            obs.addListener('StreamStateChanged', (data) => {
                console.log(data.outputActive ? "Stream started" : "Stream stopped");
                this.setInDataPacket('oc_str', data);
            })
            obs.addListener('CurrentProgramSceneChanged', (data) => {
                console.log('Current scene changed to', data.sceneName)
                this.currentScene = data.sceneName;
                this.setInDataPacket('oc_cs', data.sceneName);
            });
            obs.addListener('InputVolumeChanged', (data) => {
                console.log('Volume of input', data.inputName, 'changed to', data.inputVolumeDb)
                this.addToDataPacket("oc_vo", {...data, uuid:data.inputUuid});
            })
            obs.addListener('ReplayBufferSaved', (data) => {
                console.log('Replay buffer saved!');
                this.pushNotification('Replay buffer saved!');
            });
            obs.addListener('InputMuteStateChanged', (data) => {
                console.log('Mute state of input', data.inputName, 'changed to', data.inputMuted);
                this.addToDataPacket("oc_ms", {...data, uuid:data.inputUuid});
            });
            obs.addListener('SceneItemEnableStateChanged', (data) => {
                console.log('Visibility of input', data.sceneItemId, 'changed to', data.sceneItemEnabled);
                this.whoIsSceneItem(data.sceneName, data.sceneItemId).then((source) => {
                    this.addToDataPacket("oc_src_vis", {...data, ...source});
                });
            });
            obs.addListener('ConnectionClosed', (e) => {
                console.error('Connection closed', e);
                this.pushNotification('Lost connection to OBS! Please reconnect by pressing the "Reconnect to OBS" Tile.');
            })
        }, (e) => {
            console.error('[OC] Could not connect.', e)
            this.pushNotification('Could not connect to OBS. Please check your connection settings.');
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
            this.setToSaveData('password', interaction.data.password);
            this.tryConnecting();
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
                this.typeToCall('ToggleRecord');
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
                this.typeToCall('ToggleStream');
                break;
            case 'obs.rb.start':
                this.typeToCall('StartReplayBuffer');
                break;
            case 'obs.rb.stop':
                this.typeToCall('StopReplayBuffer');
                break;
            case 'obs.rb.toggle':
                this.typeToCall('ToggleReplayBuffer');
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
        if(this.io) this.io.emit('oc_data', this.currentDataPacket);
        return true;
    }

}

module.exports = {
    exec: () => new OBSControl(),
    class: OBSControl
}