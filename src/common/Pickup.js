import { BaseTypes, DynamicObject, Renderer } from 'lance-gg';

export const PickupType = {
    Health: 0x10dd01,
    Weapon: 0xcccc1f
}

export default class Pickup extends DynamicObject {

    constructor(gameEngine, options, props){
        super(gameEngine, options, props);
        this.duration = 10.0;
        this.type = PickupType[PickupType.Health];
        this.scale = 1.0;
    }

    // this is what allows usage of shadow object with input-created objects (missiles)
    // see https://medium.com/javascript-multiplayer-gamedev/chronicles-of-the-development-of-a-multiplayer-game-part-2-loops-and-leaks-10b453e843e0
    // in the future this will probably be embodied in a component

    static get netScheme() {
        return Object.assign({
            inputId: { type: BaseTypes.TYPES.INT32 },
            duration: {type: BaseTypes.TYPES.FLOAT32},
            type: {type: BaseTypes.TYPES.INT32},
            scale: {type: BaseTypes.TYPES.FLOAT32 }
        }, super.netScheme);
    }

    
    syncTo(other) {
        super.syncTo(other);
        this.inputId = other.inputId;
        this.duration = other.duration;
        this.type = other.type;
        this.scale = other.scale;
    }

    // position correction if less than world width/height
    get bending() {
        return { velocity: {percent: 0.0} }; 
    }

    onAddToWorld(gameEngine) {
        if (Renderer) {
            let renderer = Renderer.getInstance();

            var geometry = new THREE.DodecahedronGeometry( );
            var surfaceMaterial = new THREE.MeshPhongMaterial( {color: this.type, specular: 0x000088, shininess: 30,    flatShading:true} );

            var model = new THREE.Mesh( geometry, surfaceMaterial );
            model.rotation.fromArray([0., 0., -Math.PI/2.])
            model.scale.set(this.scale, this.scale, this.scale);


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

}
