import { BaseTypes, DynamicObject, Renderer } from 'lance-gg';

export default class Missile extends DynamicObject {

    constructor(gameEngine, options, props){
        super(gameEngine, options, props);
        this.damage = 1;
    }

    // this is what allows usage of shadow object with input-created objects (missiles)
    // see https://medium.com/javascript-multiplayer-gamedev/chronicles-of-the-development-of-a-multiplayer-game-part-2-loops-and-leaks-10b453e843e0
    // in the future this will probably be embodied in a component

    static get netScheme() {
        return Object.assign({
            inputId: { type: BaseTypes.TYPES.INT32 }
        }, super.netScheme);
    }

    // position correction if less than world width/height
    get bending() {
        return { position: { max: 500.0 } };
    }

    onAddToWorld(gameEngine) {
        if (Renderer) {
            let renderer = Renderer.getInstance();

            //var geometry = new THREE.SphereGeometry( this.worldRadius, 64, 64 );
            var surfaceMaterial = new THREE.MeshBasicMaterial( {color: 0xffff44} );

            var geometry = new THREE.ConeGeometry( 0.2, .8, 10, 1, false );
            //var surfaceMaterial = new THREE.MeshPhongMaterial( {color: 0xaa0000, specular: 0x000088, shininess: 30, flatShading:true} )

            var model = new THREE.Mesh( geometry, surfaceMaterial );
            model.rotation.fromArray([0., 0., -Math.PI/2.])

            var group = new THREE.Group();
            group.add( model );

            // renderer.scene.add( model );
            renderer.models[this.id] = group;
        }
    }

    onRemoveFromWorld(gameEngine) {
        if (Renderer) {
             let renderer = Renderer.getInstance();
             let model = renderer.models[this.id];
             if (model) {
                 renderer.scene.remove(model);
                 delete renderer.models[this.id];
             }
        }
    }

    syncTo(other) {
        super.syncTo(other);
        this.inputId = other.inputId;
    }
}
