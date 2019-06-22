import Board from "./Board";
import { BOARD_DIRECTION } from "./utils/convert";
import BhvChess from "./BhvChess";


const {ccclass, property} = cc._decorator;

enum PATH_MODE {
    FORWARD,
    RANDOM
}

type BLOCKER = null;
type STOP = -1;

const BLOCKER:BLOCKER = null;
const STOP:STOP = -1;

const GetRandom = function (array:any[], startIndex = 0 , length = array.length)
{
    let randomIndex = startIndex + Math.floor(Math.random() * length);
    return (array[randomIndex] === undefined) ? null : array[randomIndex];
};


@ccclass
export default class BhvChessMonopoly extends cc.Component {

    chessData:BhvChess;
    pathTileZ:number = 0;
    preTileXY:TileData;
    pickMode:PATH_MODE = PATH_MODE.FORWARD;
    costCallback:((curTileXY?)=>number)|number =1;

    _face:BOARD_DIRECTION = 0;
    set face(direction:BOARD_DIRECTION) {
        direction = this.board.grid.directionNormalize(direction);
        this._face = direction;
    }
    get face():BOARD_DIRECTION {
        return this._face;
    }

    onLoad(){
        this.chessData = this.node.getComponent(BhvChess);
    }

    setCostFunction(callback) {
        this.costCallback = callback;
    }


    get BLOCKER():BLOCKER {
        return BLOCKER;
    }

    get STOP():STOP {
        return STOP;
    }

    get board():Board {
        return this.chessData.board;
    }

    /**
     * 
     * @param movingPoints 移动点数(移动力的点数)
     * @param out 输出路径
     */
    getPath(movingPoints:number, out:TileData[] = []):TileData[]{
        if (this.board === null) { // chess is not in board
            return out;
        }
        let curTileXYZ = this.chessData.tileXYZ,
            curTileData = new TileData(curTileXYZ.x, curTileXYZ.y, this.face),
            nextTileData;
        let cost;
        while (movingPoints > 0) {
            nextTileData = this.getNextTile(curTileData, this.preTileXY);
            if (nextTileData === null) {
                break;
            }
            cost = this.getCost(nextTileData);
            if (cost === STOP) {
                cost = movingPoints;
            }
            nextTileData.cost = cost;
            if (movingPoints >= cost) {
                out.push(nextTileData);
            }
            movingPoints -= cost;
    
            this.preTileXY = curTileData;
            curTileData = nextTileData;
        }
    
        // remove cost = 0 at tail
        for (let i = out.length - 1; i >= 0; i--) {
            if (out[i].cost === 0) {
                out.length = i;
            } else {
                break;
            }
        }
        return out;
    }

    /**获取当前瓦片消费的移动力 */
    getCost(curTileXY?:cc.Vec2):number{
        if (typeof (this.costCallback) === 'number') {
            return this.costCallback;
        }
   
        return this.costCallback(curTileXY);
    }

    /** 获取下一个瓦片数据 */
    getNextTile(curTileData:TileData, preTileData?:TileData):TileData{
        let board = this.board;
        let directions = board.grid.allDirections;
        let forwardTileData = null,
            backwardTileData = null;
        let neighborTileXArray = []; // forward and other neighbors, exclude backward
        let neighborTileXY, neighborTileData = null;
        for (let i = 0, cnt = directions.length; i < cnt; i++) {
            neighborTileXY = board.getNeighborTileXY(cc.v2(curTileData.x,curTileData.y), directions[i], true);
            if (neighborTileXY === null) {
                continue;
            }
            if (!board.contains(neighborTileXY.x, neighborTileXY.y, this.pathTileZ)) {
                continue;
            }
            neighborTileData = new TileData(neighborTileXY.x, neighborTileXY.y, directions[i]);
    
            if (directions[i] === curTileData.direction) {
                forwardTileData = neighborTileData;
            }
            if ((preTileData !== undefined) && (neighborTileXY.x === preTileData.x&&neighborTileXY.y === preTileData.y ) ) {
                backwardTileData = neighborTileData;
            } else {
                neighborTileXArray.push(neighborTileData);
            }
        }
    
        let nextTileData;
        if ((backwardTileData === null) && (neighborTileXArray.length === 0)) {
            // no valid neighbor
            nextTileData = null;
        } else if ((backwardTileData === null) && (neighborTileXArray.length === 1)) {
            // 1 neighbor
            nextTileData = neighborTileXArray[0];
        } else if ((backwardTileData !== null) && (neighborTileXArray.length === 0)) {
            // 1 backward neighbor
            nextTileData = backwardTileData;
        } else {
            // 2 or more neighobrs
            switch (this.pickMode) {
                case PATH_MODE.RANDOM: // random all
                    if (backwardTileData !== null) {
                        neighborTileXArray.push(backwardTileData);
                    }
                    nextTileData = GetRandom(neighborTileXArray);
                    break;
    
                default: // case 0: forward first
                    if (forwardTileData !== null) {
                        nextTileData = forwardTileData;
                    } else {
                        nextTileData = GetRandom(neighborTileXArray);
                    }
                    break;
            }
        }
    
        return nextTileData;
    }

}

class TileData {
    constructor(x, y, direction) {
        this.setTo(x, y, direction);
    }
    x:number =0;
    y:number =0;
    cost:number =0;/**标记用 */
    direction:BOARD_DIRECTION =0;
    get tileXY():cc.Vec2{
        return cc.v2(this.x,this.y);
    }
    setTo(x, y, direction) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        return this;
    }
}