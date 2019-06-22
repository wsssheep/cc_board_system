import { IBoardShapeBase } from './../utils/interface';
import { ORIENTATION_TYPE } from "../utils/convert";


export default class Quad implements IBoardShapeBase {
    constructor(config) {
        this.setType(config.type||0);
        this.setOriginPosition(config.x,config.y||0);
        this.setCellSize(config.cellWidth||0,config.cellHeight||0);
   
    }

    x:number = 0;
    y:number = 0;
    mode:ORIENTATION_TYPE = ORIENTATION_TYPE.ISOMETRIC;

    public _globTileXY:cc.Vec2 =cc.v2();
    public globWorldXY:cc.Vec2 =cc.v2();

    setOriginPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    private _width:number = 0;
    private _halfWidth:number = 0;
    get width() {
        return this._width;
    }
    set width(value) {
        this._width = value;
        this._halfWidth = value / 2;
    }

    private _height:number = 0;
    private _halfHeight:number = 0;
    get height() {
        return this._height;
    }
    set height(value) {
        this._height = value;
        this._halfHeight = value / 2;
    }

    setCellSize(width, height) {
        this.width = width;
        this.height = height;
        return this;
    }

    get cellWidth() {
        return this.width;
    }

    set cellWidth(value:number) {
        this.width = value;
    }

    get cellHeight() {
        return this.height;
    }

    set cellHeight(value:number) {
        this.height = value;
    }

    setType(type) {
        if (typeof (type) === 'string') {
            type = ORIENTATION_TYPE[type]
        }
        this.mode = type; // orthogonal, isometric, or staggered
        return this;
    }

    getWorldXY(tileX:number, tileY:number, out):cc.Vec2{
        if (out === undefined) {
            out = cc.v2();
        } else if (out === true) {
            out = this.globWorldXY;
        }
    
        var worldX, worldY;
        switch (this.mode) {
            case 0: // orthogonal
                worldX = tileX * this.width;
                worldY = tileY * this.height;
                break;
            case 1: // isometric
                worldX = (tileX - tileY) * this._halfWidth;
                worldY = (tileX + tileY) * this._halfHeight;
                break;
        }
        worldX += this.x;
        worldY += this.y;
        out.x = worldX;
        out.y = worldY;
        return out;
    }

    getTileXY(worldX:number, worldY:number, out):cc.Vec2{
        if (out === undefined) {
            out = cc.v2();
        } else if (out === true) {
            out = this._globTileXY;
        }
    
        worldX -= this.x;
        worldY -= this.y;
        var tmpx = worldX / this.width;
        var tmpy = worldY / this.height;
        switch (this.mode) {
            case 0: // orthogonal
                out.x = Math.round(tmpx);
                out.y = Math.round(tmpy);
                break;
            case 1: // isometric            
                out.x = Math.round(+tmpx + tmpy);
                out.y = Math.round(-tmpx + tmpy);
                break;
        }
        return out;
    }


}


