import { IBoardShape } from './../utils/interface';
import { Hexagon } from "./Hexagon";


export class HexagonGrid extends Hexagon implements IBoardShape{

    constructor(config){
        super(config);
    }

    allDirections= []
    halfDirections =[]

    cellWidth: number;
    cellHeight: number;
    setDirectionMode?(mode?) {
        throw new Error("Method not implemented.");
    }
    getNeighborTileX(tileX: number, tileY: number, dir: number) {
        throw new Error("Method not implemented.");
    }
    getNeighborTileY(tileX: number, tileY: number, dir: number) {
        throw new Error("Method not implemented.");
    }

    saveOrigin(){
        
    };
    restoreOrigin(){
        
    };
    getNeighborTileXY(){
        
    };
    getNeighborTileDirection(){
        
    };
    getOppositeDirection(tileX, tileY, direction){
        return (direction + 3) % 6;
    };
    offset(){
        
    };
    rotate(){
        
    };
    getDistance(){
        
    };
    directionBetween(){
        
    };
    directionNormalize(){
        
    };
    getGridPoints(){
        
    };
    ringToTileXYArray(){
        
    };
}