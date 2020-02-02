import { ServerEngine } from 'lance-gg';
import Ship from '../common/Ship';
const nameGenerator = require('./NameGenerator');
const NUM_BOTS = 10;
const NUM_PICKUPS = 10;
const FRIENDLY_RATE = 0.25;

export default class SpaaaceServerEngine extends ServerEngine {

    constructor(io, gameEngine, inputOptions) {
        super(io, gameEngine, inputOptions);
        this.scoreData = {};
    }

    spawnlevel() {
        for (let x = 0; x < NUM_BOTS; x++) this.makeBot();
        for (let y = 0; y < NUM_PICKUPS; y++) this.makePickup();
    }

    // when the game starts, create robot spaceships, and register
    // on missile-hit events
    start() {
        super.start();

        this.spawnlevel();

        this.gameEngine.on('missileHit', e => {
            // Reduce health of hit ship

            // Find out if the hit ship is a player or not
            var hitShip = e.ship;

            let friendly = false;
            // If they're human, see if they got hit by a good bot
            if (!hitShip.isBot) {
                if (!e.missile.fromBot || e.missile.fromGoodBot) {
                    hitShip.health += e.missile.damage;
                    friendly = true;
                }
            }
            else {
                // If the hit ship is a bot, see if they're good and got hit by a human
                if (hitShip.isGoodBot) {
                    if (e.missile.playerId > 0 || (e.missile.fromBot && e.missle.fromGoodBot)) {
                        hitShip.health += e.missile.damage;
                        friendly = true;
                    }
                }
            }
            if (!friendly) {
                hitShip.health -= e.missile.damage;
            }

            if (hitShip.health <= 0) {
                // add kills
                if (this.scoreData[e.missile.ownerId]) this.scoreData[e.missile.ownerId].kills++;

                // remove score data for killed ship
                delete this.scoreData[e.ship.id];
                this.updateScore();

                console.log(`ship killed: ${e.ship.toString()}`);
                this.gameEngine.removeObjectFromWorld(e.ship.id);
                if (hitShip.isBot) {
                    setTimeout(() => this.makeBot(), 5000);
                }
            }
            // else {
            //     if (friendly) {
            //         console.log(`ship healz: ${hitShip.health.toString()}`);    
            //     }
            //     else {
            //         console.log(`ship damage: ${hitShip.health.toString()}`);
            //     }
            // }
        });

        this.gameEngine.on('pickupHit', e => {
            if (!e.ship.isBot || e.ship.isGoodBot) {
                e.ship.applyPickup(e.pickup);
                setTimeout(() => this.makePickup(), e.pickup.duration * 1000.0);
            }
        });
    }

    // a player has connected
    onPlayerConnected(socket) {
        super.onPlayerConnected(socket);

        let makePlayerShip = () => {
            let ship = this.gameEngine.makeShip(socket.playerId);

            this.scoreData[ship.id] = {
                kills: 0,
                name: nameGenerator('general')
            };
            this.updateScore();
        };

        // handle client restart requests
        socket.on('requestRestart', makePlayerShip);
    }

    // a player has disconnected
    onPlayerDisconnected(socketId, playerId) {
        super.onPlayerDisconnected(socketId, playerId);


        // iterate through all objects, delete those that are associated with the player (ship and missiles)
        let playerObjects = this.gameEngine.world.queryObjects({ playerId: playerId });
        playerObjects.forEach( obj => {
            this.gameEngine.removeObjectFromWorld(obj.id);
            // remove score associated with this ship
            delete this.scoreData[obj.id];
        });

        this.updateScore();
    }

    // create a robot spaceship
    makeBot() {
        let bot = this.gameEngine.makeShip(0, Math.random() < FRIENDLY_RATE ? true : false);
        bot.attachAI();

        this.scoreData[bot.id] = {
            kills: 0,
            name: nameGenerator('general') + 'Bot'
        };

        this.updateScore();
    }

    // Create a powerup
    makePickup() {
        var pickup = this.gameEngine.makePickup();
    }

    updateScore() {
        // delay so player socket can catch up
        setTimeout(() => {
            this.io.sockets.emit('scoreUpdate', this.scoreData);
        }, 1000);

    }
}
