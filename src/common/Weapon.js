//import { BaseTypes, DynamicObject, Renderer } from 'lance-gg';
import Ship from './Ship'
import Missile from './Missile'

export default class Weapon  {

    // Seconds between shots, how many missiles per shot, how accurate is it overall
    constructor(ship, name, shotRate, missilesPerShot, missileDamage, missileLife, missileSpeed, accuracy, lateral, 
        scale = 1.0, color = 0xffff44){
        this.ship = ship;
        this.name = name;
        this.shotRate = shotRate;
        this.missilesPerShot = missilesPerShot;
        this.missileDamage = missileDamage;
        this.missileLife = missileLife;
        this.missileSpeed = missileSpeed;
        this.accuracy = accuracy;
        this.lateral = lateral;
        this.scale = scale;
        this.color = color;

        this.lastFired = new Date();
    }

    // static get netScheme() {
    //     return Object.assign({
    //         inputId: { type: BaseTypes.TYPES.INT32 }
    //     }, super.netScheme);
    // }

    // onAddToWorld(gameEngine) {
    //     if (Renderer) {
    //         let renderer = Renderer.getInstance();

    //         //var geometry = new THREE.SphereGeometry( this.worldRadius, 64, 64 );
    //         var surfaceMaterial = new THREE.MeshBasicMaterial( {color: 0xffff44} );

    //         var geometry = new THREE.ConeGeometry( 0.2, .8, 10, 1, false );
    //         //var surfaceMaterial = new THREE.MeshPhongMaterial( {color: 0xaa0000, specular: 0x000088, shininess: 30, flatShading:true} )

    //         var model = new THREE.Mesh( geometry, surfaceMaterial );
    //         model.rotation.fromArray([0., 0., -Math.PI/2.])

    //         var group = new THREE.Group();
    //         group.add( model );

    //         // renderer.scene.add( model );
    //         renderer.models[this.id] = group;
    //     }
    // }

    // onRemoveFromWorld(gameEngine) {
    //     if (Renderer) {
    //          let renderer = Renderer.getInstance();
    //          let model = renderer.models[this.id];
    //          if (model) {
    //              renderer.scene.remove(model);
    //              delete renderer.models[this.id];
    //          }
    //     }
    // }

    // syncTo(other) {
    //     super.syncTo(other);
    //     this.inputId = other.inputId;
    // }
}
