import { BaseTypes, DynamicObject, Renderer } from 'lance-gg';
import ShipActor from '../client/ShipActor';
import Weapon from './Weapon';
import Utils from './Utils';

export default class Ship extends DynamicObject {

    constructor(gameEngine, options, props) {
        super(gameEngine, options, props);
        this.showThrust = 0;
        this._maxHealth = (options && options["maxhealth"]) || 100;
        this._health = this._maxHealth;
        this.weapons = {
                    // 1 shotRate
                    // 2 missilesPerShot
                    // 3 missileDamage
                    // 4 missileLife
                    // 5 missileSpeed
                    // 6 accuracy
                    // 7 lateral spacing
                    // 8 scale
                    // 9 color
                    //10 spread
                    // ship   name                    1       2   3   4     5   6      7     8       9
            'RT': new Weapon(this, "standby",         0.25,   1,  20, 50,   10, 1,     0.0                   ),
            'LT': new Weapon(this, "repeater",        0.05,   1,  7,  30,   15, 0.85,  0.0,  0.7,    0xcdcd22),
            'RB': new Weapon(this, "shotty",          0.8,    16, 4,  20,   15, 0.7,   3,    1.5,    0x010101),
            'LB': new Weapon(this, "rocky",           0.5,    2,  80, 45,   30, 0.8,   5,    3.5,    0xff1212),
            'LS': new Weapon(this, "twin_railgun",    1,      2,  20, 50,   30, 1,     30.0, 1.6,    0x3311ff),
            'RS': new Weapon(this, "panic_mode",      0.1,    16, 10, 10,   8,  0.0,   0.1,   0.1,   0xffffff, 180)
        };
        //this.weapon = Math.trunc(Math.random() * this.weapons.length);
        this.lastWeaponChange = new Date();
    }

    get health() { return this._health; }
    set health(h) {
        this._health = h;
        if (this._health > this._maxHealth) {
            this._health = this._maxHealth;
        }
        this.refreshHealthBar(); }

    get maxSpeed() { return 7.0; }

    buttonWeapon(button) {
        return this.weapons[button];
    }

    onAddToWorld(gameEngine) {
        this.color = 0xff0011;
        if (gameEngine.isOwnedByPlayer(this)) this.color = 0x44aa44;
        else if (!this.isBot) this.color = 0x22ffff;

        if (this.isGoodBot) this.color = 0x1100ff;


        if (Renderer) {
            let renderer = Renderer.getInstance();
            let shipActor = new ShipActor(renderer);

            if (this.isCarrier) {
                var geometry = new THREE.DodecahedronGeometry( 1.9, 0. );
            } else {
                var geometry = new THREE.ConeGeometry( 0.5, 2.0, 10, 1, false );
            }
            var surfaceMaterial = new THREE.MeshPhongMaterial( {color: this.color, specular: 0xaaaaff, shininess: 50, flatShading:true} )

            var model = new THREE.Mesh( geometry, surfaceMaterial );
            model.rotation.fromArray([0., 0., -Math.PI/2.])

            var group = new THREE.Group();
            group.add( model );

            // renderer.scene.add( model );
            renderer.models[this.id] = group;
            this.model = group;

            this.refreshHealthBar();

            // let sprite = shipActor.sprite;
            // renderer.sprites[this.id] = sprite;
            // sprite.id = this.id;
            // sprite.position.set(this.position.x, this.position.y);
            // renderer.layer2.addChild(sprite);

            if (gameEngine.isOwnedByPlayer(this)) {
                //renderer.addPlayerShip(sprite);
                renderer.addPlayerShip(this);
            } else {
                renderer.addOffscreenIndicator(this);
            }
        }
    }

    refreshHealthBar() {
        if (Renderer) {
            if (this.healthbar) {
                this.model.remove(this.healthbar);
            }

            if (!this.model) return; // Not done constructing object yet!

            var hb_radius = 2.;
            var hb_width = .3;

            var points = []
            points.push( new THREE.Vector2( hb_radius, 0. ) );
            points.push( new THREE.Vector2( hb_radius + hb_width, 0.) );

            // var points = [ new THREE.Vector2( hb_radius, 0. ), new THREE.Vector2( hb_radius + hb_width, 0.) ];
            var healthpct = this._health / this._maxHealth;

            // let r = 0xff * (1. - healthpct);
            // let g = 0xff * (     healthpct);
            // let b = 0; //0xff * (0.25 - Math.abs(0.25 - 0.5 * healthpct));
            // let color = (r << 16) + (g << 8) + b;

            var healthbarGeom = new THREE.LatheBufferGeometry( points, 64, -Math.PI*7/4, healthpct * Math.PI*3/2 );
            var healthbarMaterial = new THREE.MeshBasicMaterial( {color: this.color} );
            var healthbar = new THREE.Mesh( healthbarGeom, healthbarMaterial );
            healthbar.rotation.fromArray([0., -Math.PI/2., -Math.PI/2.]);
            this.healthbar = healthbar;

            this.model.add( healthbar );
        }
    }

    onRemoveFromWorld(gameEngine) {

        if (this.fireLoop) {
            this.fireLoop.destroy();
        }

        if (this.onPreStep){
            this.gameEngine.removeListener('preStep', this.onPreStep);
            this.onPreStep = null;
        }

        if (Renderer) {
            let renderer = Renderer.getInstance();
            if (gameEngine.isOwnedByPlayer(this)) {
                renderer.playerShip = null;
            } else {
                renderer.removeOffscreenIndicator(this);
            }

            let model = renderer.models[this.id];
            if (model) {
                renderer.scene.remove(model);
                delete renderer.models[this.id];
            }
            // let healthbar = renderer.healthbars[this.id];
            // if (healthbar) {
            //     renderer.scene.remove(healthbar);
            //     delete renderer.healthbars[this.id];
            // }

            // let sprite = renderer.sprites[this.id];
            // if (sprite) {
            //     if (sprite.actor) {
            //         // removal "takes time"
            //         sprite.actor.destroy().then(()=>{
            //             delete renderer.sprites[this.id];
            //         });
            //     } else {
            //         sprite.destroy();
            //         delete renderer.sprites[this.id];
            //     }
            // }
        }
    }

    // no bending corrections on angle needed, angle is deterministic
    // position correction if less than world width/height
    get bending() {
        return { angleLocal: { percent: 0.0 }, position: { max: 500.0 } };
    }

    static get netScheme() {
        return Object.assign({
            showThrust: { type: BaseTypes.TYPES.INT32 },
            health: {type: BaseTypes.TYPES.INT32 },
            weapon: {type: BaseTypes.TYPES.INT32 },
            isBot: {type:BaseTypes.TYPES.INT8},
            isGoodBot: {type:BaseTypes.TYPES.INT8},
            isCarrier: {type:BaseTypes.TYPES.INT8},
        }, super.netScheme);
    }

    toString() {
        return `${this.isBot?'Bot':'Player'}::Ship::${super.toString()}`;
    }

    syncTo(other) {
        super.syncTo(other);
        this.showThrust = other.showThrust;
        this.health = other.health;
        this.weapon = other.weapon;
        this.isBot = other.isBot;
        this.isGoodBot = other.isGoodBot;
        this.isCarrier = other.isCarrier;
    }


    destroy() {
    }

    attachAI() {
        this.onPreStep = () => {
            this.steer();
        };


        var shipWeapons = this.weapons;


        this.gameEngine.on('preStep', this.onPreStep);

        if (!this.isCarrier) {
            let fireLoopTime = Math.round(25);

            this.fireLoop = this.gameEngine.timer.loop(fireLoopTime, () => {
                if (this.target && this.distanceToTargetSquared(this.target) < 160000) {
                    let choices = Object.keys(shipWeapons);
                    //console.log(choices);
                    var randButton = choices[Utils.randInt(0, choices.length)];
                    //console.log("firing " + randButton);
                    var weapon = shipWeapons[randButton];
                    let nowish = new Date();
                    var secDiff = (nowish - weapon.lastFired) / 1000.0;
                    if (secDiff >= weapon.shotRate) {
                        this.gameEngine.makeMissile(this, null, weapon);
                        weapon.lastFired = nowish;
                    }
                }
            });
        } else {
            let fireLoopTime = 500;

            this.fireLoop = this.gameEngine.timer.loop(fireLoopTime, () => {
                this.gameEngine.makeShip(0, false, this.position).attachAI();
            });
        }
    }

    shortestVector(p1, p2, wrapDist) {
        let d = Math.abs(p2 - p1);
        if (d > Math.abs(p2 + wrapDist - p1)) p2 += wrapDist;
        else if (d > Math.abs(p1 + wrapDist - p2)) p1 += wrapDist;
        return p2 - p1;
    }

    distanceToTargetSquared(target) {
        let dx = this.shortestVector(this.position.x, target.position.x, this.gameEngine.worldSettings.width);
        let dy = this.shortestVector(this.position.y, target.position.y, this.gameEngine.worldSettings.height);
        return dx * dx + dy * dy;
    }

    steer() {
        let closestTarget = null;
        let closestDistance2 = Infinity;
        for (let objId of Object.keys(this.gameEngine.world.objects)) {
            let obj = this.gameEngine.world.objects[objId];
            if (obj != this) {
                let distance2 = Infinity;
                // If it's a good bot, steer towards the closest target of
                // either players or bad bots - just not other good bots
                if (this.isGoodBot && obj.isGoodBot == false) {
                    distance2 = this.distanceToTargetSquared(obj);
                }
                // If it's not a good bot, steer towards closest player or
                // good bot
                else if (obj.playerId > 0 || obj.isGoodBot) {
                    distance2 = this.distanceToTargetSquared(obj);
                }
                if (distance2 < closestDistance2) {
                    closestTarget = obj;
                    closestDistance2 = distance2;
                }
            }
        }

        this.target = closestTarget;

        if (this.target) {

            let newVX = this.shortestVector(this.position.x, this.target.position.x, this.gameEngine.worldSettings.width);
            let newVY = this.shortestVector(this.position.y, this.target.position.y, this.gameEngine.worldSettings.height);
            let angleToTarget = Math.atan2(newVX, newVY)/Math.PI* 180;
            angleToTarget *= -1;
            angleToTarget += 90; // game uses zero angle on the right, clockwise
            if (angleToTarget < 0) angleToTarget += 360;
            let turnRight = this.shortestVector(this.angle, angleToTarget, 360);

            if (turnRight > 4) {
                this.turnRight(2.5);
            } else if (turnRight < -4) {
                this.turnLeft(2.5);
            } else {
                this.accelerate(0.05);
                this.showThrust = 5;
            }

        }
    }
}
