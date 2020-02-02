let PIXI = null;
import { Renderer } from 'lance-gg';
import Utils from './../common/Utils';
import Ship from '../common/Ship';

/**
 * Renderer for the Spaaace client - based on Pixi.js
 */
export default class SpaaaceRenderer extends Renderer {

    get ASSETPATHS(){
        return {
            ship: 'assets/ship1.png',
            missile: 'assets/shot.png',
            bg1: 'assets/space3.png',
            bg2: 'assets/space2.png',
            bg3: 'assets/clouds2.png',
            bg4: 'assets/clouds1.png',
            smokeParticle: 'assets/smokeparticle.png'
        };
    }

    // TODO: document
    constructor(gameEngine, clientEngine) {
        super(gameEngine, clientEngine);
        // PIXI = require('pixi.js');
        // this.sprites = {};
        this.models = {};
        // this.healthbars = {};
        this.isReady = true;

        // asset prefix
        // this.assetPathPrefix = this.gameEngine.options.assetPathPrefix?this.gameEngine.options.assetPathPrefix:'';
        //
        // // these define how many gameWorlds the player ship has "scrolled" through
        // this.bgPhaseX = 0;
        // this.bgPhaseY = 0;

        this.worldRadius = 30.
    }

    init() {
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        // this.stage = new PIXI.Container();
        // this.layer1 = new PIXI.Container();
        // this.layer2 = new PIXI.Container();
        //
        // this.stage.addChild(this.layer1, this.layer2);

        if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive') {
            this.onDOMLoaded();
        } else {
            document.addEventListener('DOMContentLoaded', ()=>{
                this.onDOMLoaded();
            });
        }

        // return new Promise((resolve, reject)=>{
        //     PIXI.loader.add(Object.keys(this.ASSETPATHS).map((x)=>{
        //         return{
        //             name: x,
        //             url: this.assetPathPrefix + this.ASSETPATHS[x]
        //         };
        //     }))
        //     .load(() => {
        //         this.isReady = true;
        //         this.setupStage();
        //
        //         if (Utils.isTouchDevice()) {
        //             document.body.classList.add('touch');
        //         } else if (isMacintosh()) {
        //             document.body.classList.add('mac');
        //         } else if (isWindows()) {
        //             document.body.classList.add('pc');
        //         }
        //
        //         resolve();
        //
        //         this.gameEngine.emit('renderer.ready');
        //     });
        // });

        this.camera3js = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
        this.camera3js.position.set( 0., 0., -this.worldRadius * 2 ); // FIXME: Investigate sign flip
        this.camera3js.lookAt( 0, 0, 0 );

        this.scene = new THREE.Scene();

        // let lt_spread = 20.0;
        // var directionalLight = new THREE.DirectionalLight( 0xff8888, 0.35 );
        // directionalLight.position.set( -lt_spread,  lt_spread, -100.); // FIXME: Investigate sign flip
        // this.scene.add( directionalLight );
        // directionalLight = new THREE.DirectionalLight( 0x8888ff, 0.25 );
        // directionalLight.position.set( -lt_spread, -lt_spread, -100.); // FIXME: Investigate sign flip
        // this.scene.add( directionalLight );
        // directionalLight = new THREE.DirectionalLight( 0x88ff88, 0.30 );
        // directionalLight.position.set(  lt_spread,         0., -100.); // FIXME: Investigate sign flip
        // this.scene.add( directionalLight );

        // Dark mode FTW
        var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.25 );
        directionalLight.position.set(-10., 10., -100.); // FIXME: Investigate
        this.scene.add( directionalLight );

        var geometry = new THREE.SphereGeometry( this.worldRadius, 128, 64 );
        // var lineGeometry = new THREE.WireframeGeometry( geometry );

        // var surfaceMaterial = new THREE.MeshBasicMaterial( {color: 0x4444ff} );
        // var edgeMaterial = new THREE.LineBasicMaterial( { color: 0xffffff });
        //var surfaceMaterial = new THREE.MeshPhongMaterial( {color: 0x4444ff, specular: 0x333355, shininess: 60, flatShading:true} )
        // The second part of the dark mode reversion.
        var surfaceMaterial = new THREE.MeshPhongMaterial( {color: 0x4444ff, specular: 0x2222aa, shininess: 30, flatShading:true} )

        var worldMesh = new THREE.Mesh( geometry, surfaceMaterial );
        //var worldGrid = new THREE.LineSegments( lineGeometry, edgeMaterial );

        var group = new THREE.Group();
        group.add( worldMesh );
        //group.add( worldGrid );
        this.world = group;

        this.scene.add( group );

        var smallGooberGeom = new THREE.ConeGeometry( 0.25, 1.0, 12, 1, false );
        var smallGooberMat = new THREE.MeshPhongMaterial( {color: 0xaa0000, specular: 0x000088, shininess: 30, flatShading:true} )

        this.upGoober = new THREE.Mesh( smallGooberGeom, smallGooberMat );
        this.rightGoober = new THREE.Mesh( smallGooberGeom, smallGooberMat );

        // this.scene.add( this.upGoober );
        // this.scene.add( this.rightGoober );

        this.world_focus_x = 0.;
        this.world_focus_y = 0.;
        this.world_window = 1000.; //this.gameEngine.worldSettings.width / 4.;
                                   //this.gameEngine.worldSettings is undefined *and* in setupStage()?!
        this.world_free_roam = 50.;
        this.world_focus_scoot_rate = 0.08;
        this.world_cell_size = 125.;

        this.renderer3js = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer3js.setPixelRatio( window.devicePixelRatio );
        this.renderer3js.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( this.renderer3js.domElement );

        return new Promise((resolve, reject)=>{
                setTimeout(()=>{
                    this.setupStage();
                    resolve();
                    this.gameEngine.emit('renderer.ready');
                }, 100);
            });
    }

    onDOMLoaded(){
        // this.renderer = PIXI.autoDetectRenderer(this.viewportWidth, this.viewportHeight);
        // document.body.querySelector('.pixiContainer').appendChild(this.renderer.view);
    }

    setupStage() {
        window.addEventListener('resize', ()=>{ this.setRendererSize(); });

        // this.lookingAt = { x: 0, y: 0 };
        // this.camera = new PIXI.Container();
        // this.camera.addChild(this.layer1, this.layer2);
        //
        // // parallax background
        // this.bg1 = new PIXI.extras.TilingSprite(PIXI.loader.resources.bg1.texture,
        //         this.viewportWidth, this.viewportHeight);
        // this.bg2 = new PIXI.extras.TilingSprite(PIXI.loader.resources.bg2.texture,
        //     this.viewportWidth, this.viewportHeight);
        // this.bg3 = new PIXI.extras.TilingSprite(PIXI.loader.resources.bg3.texture,
        //     this.viewportWidth, this.viewportHeight);
        // this.bg4 = new PIXI.extras.TilingSprite(PIXI.loader.resources.bg4.texture,
        //     this.viewportWidth, this.viewportHeight);
        //
        // this.bg3.blendMode = PIXI.BLEND_MODES.ADD;
        // this.bg4.blendMode = PIXI.BLEND_MODES.ADD;
        // this.bg4.alpha = 0.6;
        //
        // this.stage.addChild(this.bg1, this.bg2, this.bg3, this.bg4);
        // this.stage.addChild(this.camera);

        // this.debug= new PIXI.Graphics();
        // this.camera.addChild(this.debug);

        // this.debugText = new PIXI.Text('DEBUG', {fontFamily:"arial", fontSize: "100px", fill:"white"});
        // this.debugText.anchor.set(0.5, 0.5);
        // this.debugText.x = this.gameEngine.worldSettings.width/2;
        // this.debugText.y = this.gameEngine.worldSettings.height/2;
        // this.camera.addChild(this.debugText);

        this.elapsedTime = Date.now();
        // // debug
        // if ('showworldbounds' in Utils.getUrlVars()) {
        //     let graphics = new PIXI.Graphics();
        //     graphics.beginFill(0xFFFFFF);
        //     graphics.alpha = 0.1;
        //     graphics.drawRect(0, 0, this.gameEngine.worldSettings.width, this.gameEngine.worldSettings.height);
        //     this.camera.addChild(graphics);
        // }

    }

    setRendererSize() {
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        // this.bg1.width = this.viewportWidth;
        // this.bg1.height = this.viewportHeight;
        // this.bg2.width = this.viewportWidth;
        // this.bg2.height = this.viewportHeight;
        // this.bg3.width = this.viewportWidth;
        // this.bg3.height = this.viewportHeight;
        // this.bg4.width = this.viewportWidth;
        // this.bg4.height = this.viewportHeight;
        //

        this.camera3js.aspect = window.innerWidth / window.innerHeight;
        this.camera3js.updateProjectionMatrix();

        this.renderer3js.setSize( window.innerWidth, window.innerHeight );
    }

    draw(t, dt) {
        super.draw(t, dt);

        let now = Date.now();

        if (!this.isReady) return; // assets might not have been loaded yet
        let worldWidth = this.gameEngine.worldSettings.width;
        let worldHeight = this.gameEngine.worldSettings.height;

        var orientation = new THREE.Object3D();

        // Scoot camera toward player
        if (this.playerShip) {
            let objId = this.playerShip.id;
            let playerData = this.gameEngine.world.objects[objId];

            var dx = playerData.position.x - this.world_focus_x;
            var dy = playerData.position.y - this.world_focus_y;

            if (Math.abs(dx) > Math.abs(dx + worldWidth)) {
                dx += worldWidth;
            } else if (Math.abs(dx) > Math.abs(dx - worldWidth)) {
                dx -= worldWidth;
            }
            if (Math.abs(dy) > Math.abs(dy + worldHeight)) {
                dy += worldHeight;
            } else if (Math.abs(dy) > Math.abs(dy - worldHeight)) {
                dy -= worldHeight;
            }

            var scoot_x = 0.;
            var scoot_y = 0.;
            if (this.world_free_roam < dx) {
                scoot_x += this.world_focus_scoot_rate * (dx - this.world_free_roam)
            }
            if (dx < -this.world_free_roam) {
                scoot_x += this.world_focus_scoot_rate * (dx + this.world_free_roam)
            }
            if (this.world_free_roam < dy) {
                this.world_focus_y += this.world_focus_scoot_rate * (dy - this.world_free_roam)
            }
            if (dy < -this.world_free_roam) {
                this.world_focus_y += this.world_focus_scoot_rate * (dy + this.world_free_roam)
            }

            this.world_focus_x += scoot_x;
            this.world_focus_y += scoot_y;

            if (this.world_focus_x < 0.)          this.world_focus_x += worldWidth;
            if (worldWidth < this.world_focus_x)  this.world_focus_x -= worldWidth;
            if (this.world_focus_y < 0.)          this.world_focus_y += worldHeight;
            if (worldHeight < this.world_focus_y) this.world_focus_y -= worldHeight;

            // if (scoot_x || scoot_y) {
            //     console.log("Player position:" + playerData.position.x + " " + playerData.position.y)
            //     console.log("Camera position:" + this.world_focus_x + " " + this.world_focus_y)
            //     console.log("Camera delta: " + dx + " " + dy )
            //     console.log("Camera scoot: " + scoot_x + " " + scoot_y )
            // }

            // var right = this.gameCoordsToGlobe(playerData.position.x + 40, playerData.position.y);
            // var up    = this.gameCoordsToGlobe(playerData.position.x     , playerData.position.y + 40);
            // this.rightGoober.position.x = right.x;
            // this.rightGoober.position.y = right.y;
            // this.rightGoober.position.z = right.z;
            // this.upGoober.position.x = up.x;
            // this.upGoober.position.y = up.y;
            // this.upGoober.position.z = up.z;
        }

        // this.world.rotation.y =  (Math.PI / 4) * (this.world_focus_x / this.world_window);
        // this.world.rotation.x =  (Math.PI / 4) * (this.world_focus_y / this.world_window);

        let world_offset_x = Math.trunc(this.world_focus_x / this.world_cell_size) * this.world_cell_size;
        let world_phase_x  = this.world_focus_x - world_offset_x;
        this.world.rotation.y =  (Math.PI / 4) * (world_phase_x / this.world_window);
        let world_offset_y = Math.trunc(this.world_focus_y / this.world_cell_size) * this.world_cell_size;
        let world_phase_y  = this.world_focus_y - world_offset_y;
        this.world.rotation.x = -(Math.PI / 4) * (world_phase_y / this.world_window);

        for (let objId of Object.keys(this.models)) {
            let objData = this.gameEngine.world.objects[objId];
            let model = this.models[objId];

            var coords = this.gameCoordsToGlobe(objData.position.x, objData.position.y, objData.angle * Math.PI / 180.);
            // var x = objData.position.x;
            // var y = objData.position.y;
            // while (x < 0.) {x += this.world_window;}
            // while (y < 0.) {y += this.world_window;}
            // while (this.world_window <= x) {x -= this.world_window;}
            // while (this.world_window <= y) {y -= this.world_window;}
            // var coords = this.gameCoordsToGlobe(x,y);

            if (coords.isVisible) {
                this.scene.add( model );
            }
            if (!coords.isVisible) {
                this.scene.remove( model );
            }

            if (model.type == "Group") {
                model.children[0].rotation.x += 0.01
            }

            // orientation.position.set( coords.x, coords.y, coords.z );
            // orientation.updateMatrix();
            //
            // model.updateMatrix( orientation );

            model.position.x = coords.x;
            model.position.y = coords.y;
            model.position.z = coords.z;
            model.rotation.fromArray([coords.rx, coords.ry, coords.rz]);

            // let healthbar = this.healthbars[objId];
            // if (healthbar) {
            //     if (coords.isVisible) {
            //         healthbar.position.x = coords.x;
            //         healthbar.position.y = coords.y;
            //         healthbar.position.z = coords.z;
            //         healthbar.rotation.fromArray([coords.rx, coords.ry, coords.rz]);
            //         this.scene.add( healthbar );
            //     } else {
            //         this.scene.remove( healthbar );
            //     }
            // }

        }

            //         sprite.y = objData.position.y;

        //     if (objData) {
        //
        //         // if the object requests a "showThrust" then invoke it in the actor
        //         if (sprite.actor && sprite.actor.thrustEmitter) {
        //             sprite.actor.thrustEmitter.emit = !!objData.showThrust;
        //         }
        //
        //         if (objData instanceof Ship && sprite != this.playerShip) {
        //             this.updateOffscreenIndicator(objData);
        //         }
        //
        //         sprite.x = objData.position.x;
        //         sprite.y = objData.position.y;
        //
        //         if (objData instanceof Ship){
        //             sprite.actor.shipContainerSprite.rotation = this.gameEngine.world.objects[objId].angle * Math.PI/180;
        //         } else{
        //             sprite.rotation = this.gameEngine.world.objects[objId].angle * Math.PI/180;
        //         }
        //
        //         // make the wraparound seamless for objects other than the player ship
        //         if (sprite != this.playerShip && viewportSeesLeftBound && objData.position.x > this.viewportWidth - this.camera.x) {
        //             sprite.x = objData.position.x - worldWidth;
        //         }
        //         if (sprite != this.playerShip && viewportSeesRightBound && objData.position.x < -this.camera.x) {
        //             sprite.x = objData.position.x + worldWidth;
        //         }
        //         if (sprite != this.playerShip && viewportSeesTopBound && objData.position.y > this.viewportHeight - this.camera.y) {
        //             sprite.y = objData.position.y - worldHeight;
        //         }
        //         if (sprite != this.playerShip && viewportSeesBottomBound && objData.position.y < -this.camera.y) {
        //             sprite.y = objData.position.y + worldHeight;
        //         }
        //     }
        //
        //     if (sprite) {
        //         // object is either a Pixi sprite or an Actor. Actors have renderSteps
        //         if (sprite.actor && sprite.actor.renderStep) {
        //             sprite.actor.renderStep(now - this.elapsedTime);
        //         }
        //     }
        //
        //     // this.emit("postDraw");
        // }
        //
        // let cameraTarget;
        // if (this.playerShip) {
        //     cameraTarget = this.playerShip;
        //     // this.cameraRoam = false;
        // } else if (!this.gameStarted && !cameraTarget) {
        //
        //     // calculate centroid
        //     cameraTarget = getCentroid(this.gameEngine.world.objects);
        //     this.cameraRoam = true;
        // }
        //
        // if (cameraTarget) {
        //     // let bgOffsetX = -this.bgPhaseX * worldWidth - cameraTarget.x;
        //     // let bgOffsetY = -this.bgPhaseY * worldHeight - cameraTarget.y;
        //
        //     // 'cameraroam' in Utils.getUrlVars()
        //     if (this.cameraRoam) {
        //         let lookingAtDeltaX = cameraTarget.x - this.lookingAt.x;
        //         let lookingAtDeltaY = cameraTarget.y - this.lookingAt.y;
        //         let cameraTempTargetX;
        //         let cameraTempTargetY;
        //
        //         if (lookingAtDeltaX > worldWidth / 2) {
        //             this.bgPhaseX++;
        //             cameraTempTargetX = this.lookingAt.x + worldWidth;
        //         } else if (lookingAtDeltaX < -worldWidth / 2) {
        //             this.bgPhaseX--;
        //             cameraTempTargetX = this.lookingAt.x - worldWidth;
        //         } else {
        //             cameraTempTargetX = this.lookingAt.x + lookingAtDeltaX * 0.02;
        //         }
        //
        //         if (lookingAtDeltaY > worldHeight / 2) {
        //             cameraTempTargetY = this.lookingAt.y + worldHeight;
        //             this.bgPhaseY++;
        //         } else if (lookingAtDeltaY < -worldHeight / 2) {
        //             this.bgPhaseY--;
        //             cameraTempTargetY = this.lookingAt.y - worldHeight;
        //         } else {
        //             cameraTempTargetY = this.lookingAt.y + lookingAtDeltaY * 0.02;
        //         }
        //
        //         this.centerCamera(cameraTempTargetX, cameraTempTargetY);
        //
        //     } else {
        //         this.centerCamera(cameraTarget.x, cameraTarget.y);
        //     }
        // }
        //
        // let bgOffsetX = this.bgPhaseX * worldWidth + this.camera.x;
        // let bgOffsetY = this.bgPhaseY * worldHeight + this.camera.y;
        //
        // this.bg1.tilePosition.x = bgOffsetX * 0.01;
        // this.bg1.tilePosition.y = bgOffsetY * 0.01;
        //
        // this.bg2.tilePosition.x = bgOffsetX * 0.04;
        // this.bg2.tilePosition.y = bgOffsetY * 0.04;
        //
        // this.bg3.tilePosition.x = bgOffsetX * 0.3;
        // this.bg3.tilePosition.y = bgOffsetY * 0.3;
        //
        // this.bg4.tilePosition.x = bgOffsetX * 0.75;
        // this.bg4.tilePosition.y = bgOffsetY * 0.75;
        //
        this.elapsedTime = now;
        //
        // // Render the stage
        // this.renderer.render(this.stage);

        //this.world.rotation.y += 0.005;

        this.renderer3js.render( this.scene, this.camera3js );
    }

    //addPlayerShip(sprite) {
    addPlayerShip(ship) {
        this.playerShip = ship;
        //sprite.actor.shipSprite.tint = 0XFF00FF; // color  player ship
        document.body.classList.remove('lostGame');
        if (!document.body.classList.contains('tutorialDone')){
            document.body.classList.add('tutorial');
        }
        document.body.classList.remove('lostGame');
        document.body.classList.add('gameActive');
        document.querySelector('#tryAgain').disabled = true;
        document.querySelector('#joinGame').disabled = true;
        document.querySelector('#joinGame').style.opacity = 0;

        this.gameStarted = true; // todo state shouldn't be saved in the renderer

        // remove the tutorial if required after a timeout
        setTimeout(() => {
            document.body.classList.remove('tutorial');
        }, 10000);
    }

    /**
     * Centers the viewport on a coordinate in the gameworld
     * @param {Number} targetX
     * @param {Number} targetY
     */
    centerCamera(targetX, targetY) {
        return;

        if (isNaN(targetX) || isNaN(targetY)) return;
        if (!this.lastCameraPosition){
            this.lastCameraPosition = {};
        }

        this.lastCameraPosition.x = this.camera.x;
        this.lastCameraPosition.y = this.camera.y;

        this.camera.x = this.viewportWidth / 2 - targetX;
        this.camera.y = this.viewportHeight / 2 - targetY;
        this.lookingAt.x = targetX;
        this.lookingAt.y = targetY;
    }

    addOffscreenIndicator(objData) {
        let container = document.querySelector('#offscreenIndicatorContainer');
        let indicatorEl = document.createElement('div');
        indicatorEl.setAttribute('id', 'offscreenIndicator' + objData.id);
        indicatorEl.classList.add('offscreenIndicator');
        container.appendChild(indicatorEl);
    }

    updateOffscreenIndicator(objData){

        return;

        // player ship might have been destroyed
        if (!this.playerShip) return;

        let indicatorEl = document.querySelector('#offscreenIndicator' + objData.id);
        if (!indicatorEl) {
            console.error(`No indicatorEl found with id ${objData.id}`);
            return;
        }
        let playerShipObj = this.gameEngine.world.objects[this.playerShip.id];
        let slope = (objData.position.y - playerShipObj.position.y) / (objData.position.x - playerShipObj.position.x);
        let b = this.viewportHeight/ 2;

        let padding = 30;
        let indicatorPos = { x: 0, y: 0 };

        if (objData.position.y < playerShipObj.position.y - this.viewportHeight/2) {
            indicatorPos.x = this.viewportWidth/2 + (padding - b)/slope;
            indicatorPos.y = padding;
        } else if (objData.position.y > playerShipObj.position.y + this.viewportHeight/2) {
            indicatorPos.x = this.viewportWidth/2 + (this.viewportHeight - padding - b)/slope;
            indicatorPos.y = this.viewportHeight - padding;
        }

        if (objData.position.x < playerShipObj.position.x - this.viewportWidth/2) {
            indicatorPos.x = padding;
            indicatorPos.y = slope * (-this.viewportWidth/2 + padding) + b;
        } else if (objData.position.x > playerShipObj.position.x + this.viewportWidth/2) {
            indicatorPos.x = this.viewportWidth - padding;
            indicatorPos.y = slope * (this.viewportWidth/2 - padding) + b;
        }

        if (indicatorPos.x == 0 && indicatorPos.y == 0){
            indicatorEl.style.opacity = 0;
        } else {
            indicatorEl.style.opacity = 1;
            let rotation = Math.atan2(objData.position.y - playerShipObj.position.y, objData.position.x - playerShipObj.position.x);
            rotation = rotation * 180/Math.PI; // rad2deg
            indicatorEl.style.transform = `translateX(${indicatorPos.x}px) translateY(${indicatorPos.y}px) rotate(${rotation}deg) `;
        }
    }

    removeOffscreenIndicator(objData) {
        let indicatorEl = document.querySelector('#offscreenIndicator'+objData.id);
        if (indicatorEl && indicatorEl.parentNode)
            indicatorEl.parentNode.removeChild(indicatorEl);
    }

    updateHUD(data){
        if (data.RTT){ qs('.latencyData').innerHTML = data.RTT;}
        if (data.RTTAverage){ qs('.averageLatencyData').innerHTML = truncateDecimals(data.RTTAverage, 2);}
    }

    updateScore(data){
        // let scoreContainer = qs('.score');
        // let scoreArray = [];
        //
        // // remove score lines with objects that don't exist anymore
        // let scoreEls = scoreContainer.querySelectorAll('.line');
        // for (let x=0; x < scoreEls.length; x++){
        //     if (data[scoreEls[x].dataset.objId] == null){
        //         scoreEls[x].parentNode.removeChild(scoreEls[x]);
        //     }
        // }
        //
        // for (let id of Object.keys(data)){
        //     let scoreEl = scoreContainer.querySelector(`[data-obj-id='${id}']`);
        //     // create score line if it doesn't exist
        //     if (scoreEl == null){
        //         scoreEl = document.createElement('div');
        //         scoreEl.classList.add('line');
        //         if (this.playerShip && this.playerShip.id == parseInt(id)) scoreEl.classList.add('you');
        //         scoreEl.dataset.objId = id;
        //         scoreContainer.appendChild(scoreEl);
        //     }
        //
        //     // stupid string/number conversion
        //     if (this.sprites[parseInt(id)])
        //         this.sprites[parseInt(id)].actor.changeName(data[id].name);
        //
        //     scoreEl.innerHTML = `${data[id].name}: ${data[id].kills}`;
        //
        //     scoreArray.push({
        //         el: scoreEl,
        //         data: data[id]
        //     });
        // }
        //
        // scoreArray.sort((a, b) => {return a.data.kills < b.data.kills;});
        //
        // for (let x=0; x < scoreArray.length; x++){
        //     scoreArray[x].el.style.transform = `translateY(${x}rem)`;
        // }

    }

    onKeyChange(e){
        if (this.playerShip) {
            if (e.keyName === 'up') {
                this.playerShip.actor.thrustEmitter.emit = e.isDown;
            }
        }
    }

    enableFullScreen(){
        let isInFullScreen = (document.fullScreenElement && document.fullScreenElement !== null) ||    // alternative standard method
            (document.mozFullScreen || document.webkitIsFullScreen);

        // iOS fullscreen generates user warnings
        if (isIPhoneIPad()) return;

        let docElm = document.documentElement;
        if (!isInFullScreen) {

            if (docElm.requestFullscreen) {
                docElm.requestFullscreen();
            } else if (docElm.mozRequestFullScreen) {
                docElm.mozRequestFullScreen();
            } else if (docElm.webkitRequestFullScreen) {
                // NOTE: disabled on iOS/Safari, because it generated a
                // phishing warning.
                // docElm.webkitRequestFullScreen();
            }
        }
    }

    /*
     * Takes in game coordinates and translates them into screen coordinates
     * @param obj an object with x and y properties
     */
    gameCoordsToScreen(obj){
        // console.log(obj.x , this.viewportWidth / 2 , this.camera.x)
        return {
            x: obj.position.x + 0,//this.camera.x,
            y: obj.position.y + 0 //this.camera.y
        };
    }

    gameCoordsToGlobe(obj_x,obj_y, heading=0.) {
        let worldWidth = this.gameEngine.worldSettings.width;
        let worldHeight = this.gameEngine.worldSettings.height;

        var x = obj_x - this.world_focus_x;
        var y = obj_y - this.world_focus_y;

        if (Math.abs(x) > Math.abs(x + worldWidth)) {
            x += worldWidth;
        } else if (Math.abs(x) > Math.abs(x - worldWidth)) {
            x -= worldWidth;
        }
        if (Math.abs(y) > Math.abs(y + worldHeight)) {
            y += worldHeight;
        } else if (Math.abs(y) > Math.abs(y - worldHeight)) {
            y -= worldHeight;
        }

        var radius = this.worldRadius * 1.05; // TODO: should add per-object height offset!
        var rx = x / this.world_window;
        var ry = y / this.world_window;

        var visible = true;
        if (Math.abs(rx) > 1.) { visible = false; }
        if (Math.abs(ry) > 1.) { visible = false; }

        var angle = Math.atan2(ry,rx);
        var dist = Math.sqrt(rx*rx + ry*ry);
        if (dist > 1) { visible = false; }

        var edge_angle = dist * Math.PI / 2;

        return {
            x: radius * Math.sin(edge_angle) * Math.cos(angle),
            y: radius * Math.sin(edge_angle) * Math.sin(angle),
            z: -radius * Math.cos(edge_angle), // FIXME: Investigate sign flip
            rx: Math.sin(edge_angle) * Math.sin(angle) * Math.PI / 2.,
            ry: Math.sin(edge_angle) * Math.cos(angle) * Math.PI / 2.,
            rz: heading,
            isVisible: visible
        };
    }

}

function getCentroid(objects) {
    let maxDistance = 500; // max distance to add to the centroid
    let shipCount = 0;
    let centroid = { x: 0, y: 0 };
    let selectedShip = null;

    for (let id of Object.keys(objects)){
        let obj = objects[id];
        if (obj instanceof Ship) {
            if (selectedShip == null)
                selectedShip = obj;

            let objDistance = Math.sqrt( Math.pow((selectedShip.position.x-obj.position.y), 2) + Math.pow((selectedShip.position.y-obj.position.y), 2));
            if (selectedShip == obj || objDistance < maxDistance) {
                centroid.x += obj.position.x;
                centroid.y += obj.position.y;
                shipCount++;
            }
        }
    }

    centroid.x /= shipCount;
    centroid.y /= shipCount;


    return centroid;
}

// convenience function
function qs(selector) { return document.querySelector(selector);}

function truncateDecimals(number, digits) {
    let multiplier = Math.pow(10, digits);
    let adjustedNum = number * multiplier;
    let truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);

    return truncatedNum / multiplier;
};

function isMacintosh() {
    return navigator.platform.indexOf('Mac') > -1;
}

function isWindows() {
    return navigator.platform.indexOf('Win') > -1;
}

function isIPhoneIPad() {
    return navigator.platform.match(/i(Phone|Pod)/i) !== null;
}
