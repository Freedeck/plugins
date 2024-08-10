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
        if (pswd == 'Change me' || !pswd) {
            this.setToSaveData('password', 'password');
        }
        obs.connect('ws://localhost:4455', pswd).then((info) => {
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
        });

        this.registerNewType('Current Scene', 'obs.cs', {}, 'text');
        // This is all you need to do. Freedeck will do all of the logic for you.
        return true;
    }

    onButton(interaction) {
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
        return true;
    }

}

module.exports = {
    exec: () => new OBSControl(),
    class: OBSControl
}