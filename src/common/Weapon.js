//import { BaseTypes, DynamicObject, Renderer } from 'lance-gg';
import Ship from './Ship'
import Missile from './Missile'

export default class Weapon  {

    // Seconds between shots, how many missiles per shot, how accurate is it overall
    constructor(ship, name, shotRate, missilesPerShot, missileDamage, missileLife, missileSpeed, accuracy, lateral, 
        scale = 1.0, color = 0xffff44, spread = 90.0){
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
        this.spread = spread;

        this.lastFired = new Date();
    }

    multiply(other)
    {
        var nw = new Weapon(this.ship, this.name, 
            this.shotRate * other.shotRate,
            this.missilesPerShot * other.missilesPerShot,
            this.missileDamage * other.missileDamage,
            this.missileLife * other.missileLife,
            this.missileSpeed * other.missileSpeed,
            this.accuracy * other.accuracy,
            this.lateral * other.lateral,
            this.scale * other.scale,
            this.color,
            this.spread * other.spread
        );

        nw.lastFired = this.lastFired;

        return nw;
    }
}
