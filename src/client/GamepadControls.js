import { stringify } from "query-string";

var gamepadAPI = {
	controller: {},
	turbo: false,
	connect: function(evt) {
		gamepadAPI.controller = evt.gamepad;
		gamepadAPI.turbo = true;
		console.log('Gamepad connected.');
	},
	disconnect: function(evt) {
		gamepadAPI.turbo = false;
		delete gamepadAPI.controller;
		console.log('Gamepad disconnected.');
	},
	update: function() {
		gamepadAPI.buttonsCache = [];
		for(var k=0; k<gamepadAPI.buttonsStatus.length; k++) {
			gamepadAPI.buttonsCache[k] = gamepadAPI.buttonsStatus[k];
		}
		gamepadAPI.buttonsStatus = [];
		var c = gamepadAPI.controller || {};
		var pressed = [];
		if(c.buttons) {
			for(var b=0,t=c.buttons.length; b<t; b++) {
				if(c.buttons[b].pressed) {
					pressed.push(gamepadAPI.buttons[b]);
				}
			}
		}
		var axes = [];
		if(c.axes) {
			for(var a=0,x=c.axes.length; a<x; a++) {
				axes.push(c.axes[a].toFixed(2));
			}
		}
		gamepadAPI.axesStatus = axes;
		gamepadAPI.buttonsStatus = pressed;
		return pressed;
	},
	buttonPressed: function(button, hold) {
		var newPress = false;
		for(var i=0,s=gamepadAPI.buttonsStatus.length; i<s; i++) {
			if(gamepadAPI.buttonsStatus[i] == button) {
				newPress = true;
				if(!hold) {
					for(var j=0,p=gamepadAPI.buttonsCache.length; j<p; j++) {
						if(gamepadAPI.buttonsCache[j] == button) {
							newPress = false;
						}
					}
				}
			}
		}
		return newPress;
	},
	buttons: [ // XBox360 layout
		'DPad-Up','DPad-Down','DPad-Left','DPad-Right',
		'Start','Back','Axis-Left','Axis-Right',
		'LB','RB','Power','A','B','X','Y',
	],
	buttonsCache: [],
	buttonsStatus: [],
	axesStatus: []
};

/**
 * This class allows easy usage of gamepad controls
 */
class GamepadControls {

    constructor(clientEngine) {

        this.clientEngine = clientEngine;
        this.gameEngine = clientEngine.gameEngine;

        this.setupListeners();

        // keep a reference for key press state
        this.padState = {};

        // a list of bound keys and their corresponding actions
        this.boundKeys = {};

        this.gameEngine.on('client__preStep', () => {

            if (gamepadAPI.controller.buttons == null) return;
            gamepadAPI.update();

            var buttonsDown = "";

            for(var i = 0; i < gamepadAPI.controller.buttons.length; i++) {
                var val = gamepadAPI.controller.buttons[i];
                if (gamepadAPI.buttonPressed(i, true)) {
                    buttonsDown = buttonsDown + stringify(i) + " ";
                    this.clientEngine.sendInput("up", { movement: true });
                }
            }

            if (gamepadAPI.axesStatus[1] > 0.5) {
                this.clientEngine.sendInput("down", { movement: true });
            }
            if (gamepadAPI.axesStatus[1] < -0.5) {
                this.clientEngine.sendInput("up", { movement: true });
            }

            if (gamepadAPI.axesStatus[2] < -0.5) {
                this.clientEngine.sendInput("left", { movement: true });
            }
            if (gamepadAPI.axesStatus[2] > 0.5) {
                this.clientEngine.sendInput("right", { movement: true });
            }
            if (buttonsDown && !buttonsDown.trim())
            {
                console.log(buttonsDown);
            }
            /*
            for (let keyName of Object.keys(this.boundKeys)) {
                if (this.keyState[keyName] && this.keyState[keyName].isDown) {

                    // handle repeat press
                    if (this.boundKeys[keyName].options.repeat || this.keyState[keyName].count == 0) {
                        // todo movement is probably redundant
                        this.clientEngine.sendInput(this.boundKeys[keyName].actionName, { movement: true });
                        this.keyState[keyName].count++;
                    }
                }
            }
            */
        });
    }

    setupListeners() {
        window.addEventListener("gamepadconnected", gamepadAPI.connect);
        window.addEventListener("gamepaddisconnected", gamepadAPI.disconnect);

        //this.clientEngine.controls.bindKey('left', 'left', { repeat: true });
        //this.clientEngine.controls.bindKey('right', 'right', { repeat: true });
        this.clientEngine.controls.bindKey('A', 'up', { repeat: true } );
        //this.clientEngine.controls.bindKey('space', 'space');
    }

    bindKey(keys, actionName, options) {
        if (!Array.isArray(keys)) keys = [keys];

        let keyOptions = Object.assign({
            repeat: false
        }, options);

        keys.forEach(keyName => {
            this.boundKeys[keyName] = { actionName, options: keyOptions };
        });
    }

    // todo implement unbindKey

    onKeyChange(e, isDown) {
        e = e || window.event;

        let keyName = keyCodeTable[e.keyCode];
        if (keyName && this.boundKeys[keyName]) {
            if (this.keyState[keyName] == null) {
                this.keyState[keyName] = {
                    count: 0
                };
            }
            this.keyState[keyName].isDown = isDown;

            // key up, reset press count
            if (!isDown) this.keyState[keyName].count = 0;

            // keep reference to the last key pressed to avoid duplicates
            this.lastKeyPressed = isDown ? e.keyCode : null;
            // this.renderer.onKeyChange({ keyName, isDown });
            e.preventDefault();
        }
    }
}

export default GamepadControls;
