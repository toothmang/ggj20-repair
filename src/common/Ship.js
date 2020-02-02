import { BaseTypes, DynamicObject, Renderer } from 'lance-gg';
import ShipActor from '../client/ShipActor';

export default class Ship extends DynamicObject {

    constructor(gameEngine, options, props) {
        super(gameEngine, options, props);
        this.showThrust = 0;
    }

    get maxSpeed() { return 7.0; }

    onAddToWorld(gameEngine) {
        if (Renderer) {
            let renderer = Renderer.getInstance();
            let shipActor = new ShipActor(renderer);

            var color = 0xff4444;
            if (gameEngine.isOwnedByPlayer(this)) color = 0x44aa44;
            else if (this.playerId > 0) color = 0x22ffff;

            //var geometry = new THREE.SphereGeometry( this.worldRadius, 64, 64 );
            var surfaceMaterial = new THREE.MeshBasicMaterial( {color: color} );

            var geometry = new THREE.ConeGeometry( 0.5, 2.0, 10, 1, false );
            //var surfaceMaterial = new THREE.MeshPhongMaterial( {color: 0xaa0000, specular: 0x000088, shininess: 30, flatShading:true} )

            var model = new THREE.Mesh( geometry, surfaceMaterial );
            model.rotation.fromArray([0., 0., -Math.PI/2.])



            var hb_radius = 2.;
            var hb_width = .3;

            var points = []
            points.push( new THREE.Vector2( hb_radius, 0. ) );
            points.push( new THREE.Vector2( hb_radius + hb_width, 0.) );

            // var points = [ new THREE.Vector2( hb_radius, 0. ), new THREE.Vector2( hb_radius + hb_width, 0.) ];
            var healthbarGeom = new THREE.LatheBufferGeometry( points, 64, -Math.PI*7/4, Math.PI*3/2 );
            var healthbarMaterial = new THREE.MeshBasicMaterial( {color: 0xff0000} );
            var healthbar = new THREE.Mesh( healthbarGeom, healthbarMaterial );
            healthbar.rotation.fromArray([0., -Math.PI/2., -Math.PI/2.]);

            // renderer.healthbars[this.id] = healthbar



            var group = new THREE.Group();
            group.add( model );
            group.add( healthbar );
            // renderer.scene.add( model );
            renderer.models[this.id] = group;



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
            showThrust: { type: BaseTypes.TYPES.INT32 }
        }, super.netScheme);
    }

    toString() {
        return `${this.isBot?'Bot':'Player'}::Ship::${super.toString()}`;
    }

    syncTo(other) {
        super.syncTo(other);
        this.showThrust = other.showThrust;
    }


    destroy() {
    }

    attachAI() {
        this.isBot = true;

        this.onPreStep = () => {
            this.steer();
        };

        this.gameEngine.on('preStep', this.onPreStep);

        let fireLoopTime = Math.round(250 + Math.random() * 100);
        this.fireLoop = this.gameEngine.timer.loop(fireLoopTime, () => {
            if (this.target && this.distanceToTargetSquared(this.target) < 160000) {
                this.gameEngine.makeMissile(this);
            }
        });
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
                let distance2 = this.distanceToTargetSquared(obj);
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
