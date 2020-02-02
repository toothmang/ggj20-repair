import { SimplePhysicsEngine, GameEngine, TwoVector } from 'lance-gg';
import Ship from './Ship';
import Missile from './Missile';
import Weapon from './Weapon';
import Utils from './Utils';

export default class SpaaaceGameEngine extends GameEngine {

    constructor(options) {
        super(options);
        this.physicsEngine = new SimplePhysicsEngine({
            gameEngine: this,
            collisions: {
                type: 'brute',
                collisionDistance: 28
            }
        });
    }

    registerClasses(serializer){
        serializer.registerClass(Ship);
        serializer.registerClass(Missile);
    }

    initWorld(){
        super.initWorld({
            worldWrap: true,
            width: 3000,
            height: 3000
        });
    }

    start() {
        super.start();

        this.on('collisionStart', e => {
            let collisionObjects = Object.keys(e).map(k => e[k]);
            let ship = collisionObjects.find(o => o instanceof Ship);
            let missile = collisionObjects.find(o => o instanceof Missile);

            if (!ship || !missile)
                return;

            // make sure not to process the collision between a missile and the ship that fired it
            if (missile.playerId !== ship.playerId) {
                //ship.health -= missile.damage;
                this.destroyMissile(missile.id);
                this.trace.info(() => `missile by ship=${missile.playerId} hit ship=${ship.id}, health=${ship.health}`);
                this.emit('missileHit', { missile, ship });
            }
        });

        this.on('postStep', this.reduceVisibleThrust.bind(this));
    };

    processInput(inputData, playerId, isServer) {

        super.processInput(inputData, playerId);

        // get the player ship tied to the player socket
        let playerShip = this.world.queryObject({
            playerId: playerId,
            instanceType: Ship
        });

        if (playerShip) {
            if (inputData.input == 'up') {
                playerShip.accelerate(0.05);
                playerShip.showThrust = 5; // show thrust for next steps.
            } else if (inputData.input == 'right') {
                playerShip.turnRight(2.5);
            } else if (inputData.input == 'left') {
                playerShip.turnLeft(2.5);
            } else if (inputData.input == 'space') {
                this.makeMissile(playerShip, inputData.messageIndex);
                this.emit('fireMissile');
            }

            if (inputData.input == 'move') {

                var vel = new TwoVector(parseFloat(inputData.options.x), parseFloat(inputData.options.y));
                playerShip.velocity.add(vel);
            }

            if (inputData.input == 'steer') {

                var dir = new TwoVector(parseFloat(inputData.options.x), parseFloat(inputData.options.y));
                var dirWeight = dir.length();
                dir.normalize();

                var radAngle = Math.atan2(dir.y, dir.x);
                var desiredAngle = (180.0 / Math.PI) * radAngle;

                //var newAngle = (playerShip.angle * (1.0 - dirWeight)) + (desiredAngle * dirWeight);

                // TODO: currently this assigns a ship angle between -180 and 180.
                // It seems to be working fine in-game, but that could be an issue
                // later on. If something goes wonky in the sphere merge, come and
                //check this out.
                playerShip.angle = desiredAngle;
            }

            if (inputData.input == 'fire') {
                var buttonType = inputData.options.weapon;
                var weapon = playerShip.buttonWeapon(buttonType);
                let nowish = new Date();
                var secDiff = (nowish - weapon.lastFired) / 1000.0;
                if (secDiff >= weapon.shotRate) {
                    this.makeMissile(playerShip, inputData.messageIndex, weapon);
                    this.emit('fireMissile');
                    weapon.lastFired = nowish;
                }
            }

        } else {
            // mashing buttons, but no player ship...
            if (this.renderer && this.renderer.clientEngine.isIdle) { // ONLY ON THE CLIENT...
                if (inputData.input == 'space' || inputData.input == 'fire' || inputData.input == 'weapon_change') {
                    this.renderer.clientEngine.socket.emit('requestRestart');
                    this.renderer.clientEngine.isIdle = false;
                }
            }
        }
    };

    // Makes a new ship, places it randomly and adds it to the game world
    makeShip(playerId, goodBot = false, position) {
        if (!position) {
            let newShipX = Math.floor(Math.random()*(this.worldSettings.width-200)) + 100;
            let newShipY = Math.floor(Math.random()*(this.worldSettings.height-200)) + 100;

            var pos = new TwoVector(newShipX, newShipY);
        } else {
            var pos = new TwoVector(position.x, position.y);
        }

        var promote = Math.random() < (1./20.) && !goodBot;

        let ship = new Ship(this, null, {
            position: pos,
            maxhealth: promote ? 1000 : undefined
        });

        ship.playerId = playerId;
        if (ship.playerId == 0) {
            ship.isBot = true;
            ship.isGoodBot = goodBot;
            ship.isCarrier = promote;
        } else {
            ship.isBot = ship.isGoodBot = ship.isCarrier = false;
        }
        this.addObjectToWorld(ship);
        console.log(`ship added: ${ship.toString()}`);

        return ship;
    };

    makeMissile(playerShip, inputId, weapon) {
        if (!weapon) {
            weapon = playerShip.weapons[Object.keys(playerShip.weapons)[0]];
        }

        let missiles = [];
        var offset = -weapon.lateral * (weapon.missilesPerShot-1) / 2;
        let lateral_vector = new TwoVector(-Math.sin(playerShip.angle), Math.cos(playerShip.angle));
        for(var i = 0; i < weapon.missilesPerShot; i++) {
            let missile = new Missile(this);
            missile.setStyle(weapon.scale, weapon.color);

            // we want the missile location and velocity to correspond to that of the ship firing it
            //missile.position.copy(playerShip.position);
            missile.position = new TwoVector(playerShip.position.x + (offset * lateral_vector.x),
                                             playerShip.position.y + (offset * lateral_vector.y) );
            missile.velocity.copy(playerShip.velocity);

            // Control accuracy through weapon, quadratic style
            // Assume 0 accuracy is +/- 90 degrees away from angle,
            // so 50% accuracy could be +/- 45 degrees away
            let accuracy = Utils.lerp(weapon.accuracy, 1.0, Math.random());
            let accuracyPenalty = (1.0 - accuracy) * weapon.spread * Utils.randSign();
            missile.angle = playerShip.angle + accuracyPenalty;
            missile.playerId = playerShip.playerId;
            missile.ownerId = playerShip.id;
            missile.fromBot = playerShip.isBot;
            missile.fromGoodBot = playerShip.isGoodBot;
            missile.inputId = inputId; // this enables usage of the missile shadow object
            missile.velocity.x += Math.cos(missile.angle * (Math.PI / 180)) * weapon.missileSpeed;
            missile.velocity.y += Math.sin(missile.angle * (Math.PI / 180)) * weapon.missileSpeed;
            missile.damage = weapon.missileDamage;

            missiles.push(missile);

            this.trace.trace(() => `missile[${missile.id}] created vel=${missile.velocity}`);

            let obj = this.addObjectToWorld(missile);

            // if the object was added successfully to the game world, destroy the missile after some game ticks
            if (obj)
                this.timer.add(weapon.missileLife, this.destroyMissile, this, [obj.id]);

            offset += weapon.lateral;
        }

        return missiles;
    }

    // destroy the missile if it still exists
    destroyMissile(missileId) {
        if (this.world.objects[missileId]) {
            this.trace.trace(() => `missile[${missileId}] destroyed`);
            this.removeObjectFromWorld(missileId);
        }
    }

    // at the end of the step, reduce the thrust for all objects
    reduceVisibleThrust(postStepEv) {
        if (postStepEv.isReenact)
            return;

        let ships = this.world.queryObjects({
            instanceType: Ship
        });

        ships.forEach(ship => {
            if (Number.isInteger(ship.showThrust) && ship.showThrust >= 1)
                ship.showThrust--;
        });
    }
}
