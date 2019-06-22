import { IsometricMap, StaggeredMap, QUAD_DIR_MODE } from './../utils/convert';
import { IBoardShape } from './../utils/interface';

import Quad from "./Quad";
import { initPoints, setPoints } from "../utils/points";
import { OrthogonalMap } from '../utils/convert';

const ALL_DIR4 = [0, 1, 2, 3];
const ALL_DIR8 = [0, 1, 2, 3, 4, 5, 6, 7];
const HALF_DIR4 = [0, 1];
const HALF_DIR8 = [0, 1, 4, 5];

const OppositeDirectionMap = {
    0: 2, // Left
    1: 3, // Down
    2: 0, // Right
    3: 1, // Up
    4: 6, // Left-down
    5: 7, // Down-right
    6: 4, // Right-up
    7: 5 // Up-left
}

const Wrap = function (value, min, max)
{
    let range = max - min;
    return (min + ((((value - min) % range) + range) % range));
};



export default class QuadGrid extends Quad implements IBoardShape {
    constructor(config){
        super(config);
    }

    directions:QUAD_DIR_MODE = QUAD_DIR_MODE.DIR4;

    // 获取邻接位置的所有可用方向
    get allDirections() {
        return (this.directions === 4) ? ALL_DIR4 : ALL_DIR8;
    }

    // 棋盘匹配
    get halfDirections() {
        return (this.directions === 4) ? HALF_DIR4 : HALF_DIR8;
    }

    private _savedOriginPos:cc.Vec2 = cc.v2();
    globPoints:cc.Vec2[] = initPoints(4);

    saveOrigin(){
        this._savedOriginPos.x= this.x;
        this._savedOriginPos.y = this.y;
    }

    restoreOrigin(){
        this.x = this._savedOriginPos.x;
        this.y = this._savedOriginPos.y;
    }

    getNeighborTileX(tileX:number, tileY:number, dir:number):number{
        switch (this.mode) {
            case 0: // orthogonal
                tileX += OrthogonalMap[dir][0];
                break;
            case 1: // isometric
                tileX += IsometricMap[dir][0];
                break;
            case 2: // staggered
                tileX += StaggeredMap[tileY & 1][dir][0];
                break;
        }
        return tileX;
    }

    getNeighborTileY(tileX:number, tileY:number, dir:number):number{
        switch (this.mode) {
            case 0: // orthogonal
                tileY += OrthogonalMap[dir][1];
                break;
            case 1: // isometric
                tileY += IsometricMap[dir][1];
                break;
            case 2: // staggered
                tileY += StaggeredMap[tileY & 1][dir][1];
                break;
        }
        return tileX;
    }
    
    getNeighborTileDirection(srcTileXY:cc.Vec2, neighborTileXY:cc.Vec2){
        let deltaTileXYToDirMap
        switch (this.mode) {
            case 0: // orthogonal
                deltaTileXYToDirMap = OrthogonalMap;
                break;
            case 1: // isometric
                deltaTileXYToDirMap = IsometricMap;
                break;
            case 2: // staggered
                deltaTileXYToDirMap = StaggeredMap[srcTileXY.y & 1];
                break;
        }
    
        let deltaTileX = neighborTileXY.x - srcTileXY.x;
        let deltaTileY = neighborTileXY.y - srcTileXY.y;    
        if (deltaTileXYToDirMap.hasOwnProperty(deltaTileX)) {
            let xEntry = deltaTileXYToDirMap[deltaTileX]
            if (xEntry.hasOwnProperty(deltaTileY)) {
                return xEntry[deltaTileY];
            }
        }
        return null;
    }

    getOppositeDirection(tileX:number, tileY:number, direction){
        return OppositeDirectionMap[direction];
    }

    offset(srcTile:cc.Vec2, offsetTileX:number, offsetTileY:number, out?:any):cc.Vec2{
        if (out === undefined||out === null) {
            out =  cc.v2();
        } else if (out === true) {
            out = this._globTileXY;
        }
    
        let newTileX = srcTile.x + offsetTileX;
        let newTileY = srcTile.y + offsetTileY;
        // TODO: staggered?
        out.x = newTileX;
        out.y = newTileY;
        return out;
    }

    rotate(src:cc.Vec2, dir:number, out?:any){
        if (out === undefined||out === null) {
            out = cc.v2();
        } else if (out === true) {
            out = this._globTileXY;
        }
    
        dir = Wrap(dir, 0, 3);
        let newTileX;
        let newTileY;
        switch (dir) {
            case 1:
                newTileX = -src.y;
                newTileY = src.x;
                break;
            case 2:
                newTileX = -src.x;
                newTileY = -src.y;
                break;
            case 3:
                newTileX = src.y;
                newTileY = -src.x;
                break;
            default:
                newTileX = src.x;
                newTileY = src.y;
                break;
        }
        // TODO: staggered?
        out.x = newTileX;
        out.y = newTileY;
        return out;
    }

    getDistance(tileA:cc.Vec2, tileB:cc.Vec2, roughMode:boolean = false){
        let dx = tileB.x - tileA.x;
        let dy = tileB.y - tileA.y;
        let dist;
        if (roughMode) {
            dist = Math.abs(dx) + Math.abs(dy);
        } else {
            dist = Math.sqrt(dx * dx + dy * dy);
        }
        return dist;
    }

    directionBetween(tileA:cc.Vec2, tileB:cc.Vec2){
        let direction;
        switch (this.mode) {
            case 0: // orthogonal
            case 1: // isometric
                if (tileA.y === tileB.y) {
                    direction = (tileB.x >= tileA.x) ? 0 : 2;
                } else if (tileA.x === tileB.x) {
                    direction = (tileB.y >= tileA.y) ? 1 : 3;
                } else {
                    let angle = cc.misc.degreesToRadians(Math.atan2(tileB.y-tileA.y,tileB.x-tileA.x)); // -180~180
                    if (angle < 0) {
                        angle += 360;
                    }
                    direction = angle / 90;
                }
                break;
            case 2: // staggered
                // TODO
                break;
        }

        return direction;
    }

    directionNormalize(direction){
        return Wrap(direction,0,this.directions); //Wrap
    }

    getGridPoints(tileX:number, tileY:number, points?:any){
        if (points === undefined||points === null) {
            points = initPoints(4);
        } else if (points === true) {
            points = this.globPoints;
        }
    
        if (tileX === undefined) {
            this.globWorldXY.x = 0;
            this.globWorldXY.y = 0;
        } else {
            this.getWorldXY(tileX, tileY, this.globWorldXY);
        }
        let quadType = (this.mode === 0) ? 0 : 1;
        setPoints(this.globWorldXY.x, this.globWorldXY.y, this.width, this.height, quadType, points);
        return points;
    }

    ringToTileXYArray(centerTileXY:cc.Vec2, radius:number, out:any = []){
        let i, j;
        // Top-right to bottom-right
        i = radius;
        for (j = -radius; j <= radius; j++) {
            out.push(this.offset(centerTileXY, i, j));
        }
        // Bottom-right to bottom-left
        j = radius;
        for (i = radius - 1; i >= -radius; i--) {
            out.push(this.offset(centerTileXY, i, j));
        }
        // Bottom-left to top-left
        i = -radius;
        for (j = radius - 1; j <= -radius; j--) {
            out.push(this.offset(centerTileXY, i, j));
        }
        // Top-left to top-right
        j = -radius;
        for (i = -radius; i <= radius - 1; i++) {
            out.push(this.offset(centerTileXY, i, j));
        }
    
        return out;
    }


}
