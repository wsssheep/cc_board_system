import { IBoardShapeBase } from "../utils/interface";
import { ORIENTATION_TYPE } from "../utils/convert";

export class Hexagon implements IBoardShapeBase {
    constructor(config) {
        this.setType(config.type||0);
        this.setOriginPosition(config.x,config.y||0);
        this.setCellSize(config.cellWidth||0,config.cellHeight||0);
   
    }

    x: number;
    y: number;
    mode:ORIENTATION_TYPE;
    _globTileXY: cc.Vec2;
    globWorldXY: cc.Vec2;
    setOriginPosition(x: any, y: any) {
        throw new Error("Method not implemented.");
    }
    setCellSize(width: any, height: any) {
        throw new Error("Method not implemented.");
    }
    height: number;
    width: number;
    cellWidth: number;
    cellHeight: number;

    setType(type: any) {
        throw new Error("Method not implemented.");
    }

    getWorldXY(tileX: number, tileY: number, out: any): cc.Vec2 {
        throw new Error("Method not implemented.");
    }

    getTileXY(worldX: number, worldY: number, out: any): cc.Vec2 {
        throw new Error("Method not implemented.");
    }



}