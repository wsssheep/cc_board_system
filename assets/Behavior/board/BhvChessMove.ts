import { BOARD_DIRECTION } from "./utils/convert";
import BhvChess from "./BhvChess";
import Board from "./Board";

const {ccclass, property} = cc._decorator;

//优化缓存对象
const globChessArray = [];
const globDirections = [];
const globTileXYZ = new cc.Vec3();
const globTileXY = cc.v2();
const globChessInfo = [];

//打乱数组
const Shuffle = function (array)
{
    for (let i = array.length - 1; i > 0; i--)
    {
        let j = Math.floor(Math.random() * (i + 1));
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    return array;
};


/**
 * 控制棋子进行一些移动
 */
@ccclass
export default class BhvChessMove extends cc.Component {

    @property
    speed:number = 400;

    @property({
        tooltip:"判断棋子移动时 位置是否占用 或者出棋盘界"
    })
    occupiedTest:boolean = false;

    @property({
        tooltip:"判断是否为 blocker，决定能不能移动棋子"
    })
    blockerTest:boolean = false;
    
    @property({
        tooltip:"判断是否为 edgeBlocker，决定能不能移动棋子"
    })
    edgeBlockerTest:boolean = false;

    @property({
        tooltip:"设置为true以允许在目标瓦片位置被占用时 临时更改 tileZ值。它会在目标平铺位置未被占用时修改回来。"
    })
    sneak:boolean = false;

    chessData:BhvChess;
    tileZSave: any;

    //myTileXYZ, globTileXYZ, board
    public moveableTestCallback:(tileXYZ:cc.Vec3,globTileXYZ:cc.Vec3,direction:BOARD_DIRECTION,board:Board)=>boolean; 
    lastMoveResult: boolean;
    destinationTileX: number;
    destinationTileY: number;
    destinationDirection: BOARD_DIRECTION;
    private targetTileXY:cc.Vec2 =cc.v2();
    isRun: boolean;

    onLoad(){
        this.chessData = this.getComponent(BhvChess);
    }

    start () {
        
    }

    /** 能否移动 */
    canMoveTo(tileX:number,tileY:number,direction?:BOARD_DIRECTION):boolean{
        let board = this.chessData.board;
        // 棋子不在棋盘上
        if (board == null) return false;
        let myTileXYZ = this.chessData.tileXYZ;
        let myTileX = myTileXYZ.x,
            myTileY = myTileXYZ.y,
            myTileZ = myTileXYZ.z;
        // 移动到当前的坐标
        if ((tileX === myTileX) && (tileY === myTileY)) {
            return true;
        }

        // 目标不在范围内
        if (!board.contains(tileX, tileY)) {
            return false;
        }
    
        //未确定方向(自动判断获取方向)
        if (direction === undefined) {
            direction = this.chessData.getTileDirection(tileX, tileY);
        }
    
        //sneak模式
        if (this.sneak) {
            if (this.tileZSave === undefined) {
                if (board.contains(tileX, tileY, myTileZ)) {
                    // Sneak
                    this.tileZSave = myTileZ;
                    let sneakTileZ = this.getSneakTileZ(this.tileZSave);
                    board.moveChess(this.node, tileX, tileY, sneakTileZ, false);
                    myTileZ = sneakTileZ;
                }
            } else {
                if (board.contains(tileX, tileY, this.tileZSave)) {
                    // Sneak
                    let sneakTileZ = this.getSneakTileZ(this.tileZSave);
                    board.moveChess(this.node, tileX, tileY, sneakTileZ, false);
                    myTileZ = sneakTileZ;
                } else {
                    // Go back
                    board.moveChess(this.node, tileX, tileY, this.tileZSave, false);
                    myTileZ = this.tileZSave;
                    this.tileZSave = undefined;
                }
            }
        }
    
        // 出界检测 / Occupied test
        if (this.occupiedTest && !this.sneak) {
            if (board.contains(tileX, tileY, myTileZ)) {
                return false;
            }
        }
    
        //  障碍检测 / Blocker test
        if (this.blockerTest) {
            if (board.hasBlocker(tileX, tileY)) {
                return false;
            }
        }
    
        //  边界障碍检测/ Edge-blocker test
        if (this.edgeBlockerTest) {
            let chess = this.chessData.board.tileXYToChessArray(myTileX, myTileY, globChessArray);
            if (chess.length > 1) {
                for (let i = 0, cnt = chess.length; i < cnt; i++) {
                    if (chess[i] === this.node) {
                        continue;
                    }
                    if (board.hasEdgeBlocker(myTileX, myTileY, this.chessData.board.chessToTileXYZ(chess[i]).z, direction)) {
                        globChessArray.length = 0;
                        return false;
                    }
                }
            }
            globChessArray.length = 0;
    
            // TODO
        }
    
        //  自定义函数检测移动 / Custom moveable test
        if (this.moveableTestCallback) {
            globTileXYZ.x = tileX;
            globTileXYZ.y = tileY;
            let moveable = this.moveableTestCallback(myTileXYZ, globTileXYZ,direction, board);
            if (!moveable) {
                return false;
            }
        }
    
    }

    private getSneakTileZ(originTileZ:number):any{
        let board = this.chessData.board;
        let myTileXYZ = this.chessData.tileXYZ;
        let myTileX = myTileXYZ.x,
            myTileY = myTileXYZ.y;
        let sneakTileZ = originTileZ.toString();
        do {
            sneakTileZ += '.';
        } while (board.contains(myTileX, myTileY, sneakTileZ))
        return sneakTileZ;
    }

    /**移动到某处 */
    moveTo(config:{x?:number,y?:number,direction?:BOARD_DIRECTION})
    moveTo(tileX:number,tileY?:number,direction?:BOARD_DIRECTION)
    moveTo(tileX?:any,tileY?:number,direction?:BOARD_DIRECTION){
        let board = this.chessData.board;
        if (board === null) { // chess is not in a board
            this.lastMoveResult = false;
            return;
        }
        
        //按配置文件读取
        if ((tileX != null) && (typeof (tileX) !== 'number')) {
            let config = tileX;
            tileX = config.x;
            tileY = config.y;
            direction = config.direction;
        }

        let myTileXYZ = this.chessData.tileXYZ;
        if ((direction !== undefined) &&
            (tileX == null) || (tileY == null)) {
            // Get neighbor tile position if direction is not undefined
            let targetTileXY = board.getNeighborTileXY(cc.v2(myTileXYZ.x,myTileXYZ.y), direction, true);
            if (targetTileXY !== null) {
                tileX = targetTileXY.x;
                tileY = targetTileXY.y;
            } else {
                tileX = null;
                tileY = null;
            }
        }
    
        // invalid tile position
        if ((tileX == null) || (tileY == null)) {
            this.lastMoveResult = false;
            return;
        }
        if (direction === undefined) {
            globTileXYZ.x = tileX;
            globTileXYZ.y = tileY
            direction = board.getNeighborTileDirection(cc.v2(myTileXYZ.x,myTileXYZ.y), globTileXY);
        }
        if (!this.canMoveTo(tileX, tileY, direction)) {
            this.lastMoveResult = false;
            return;
        }
        this.destinationTileX = tileX;
        this.destinationTileY = tileY;
        this.destinationDirection = direction;
    
        if (board.wrapMode && (direction !== null)) {
            let originNeighborTileX = board.grid.getNeighborTileX(myTileXYZ.x, myTileXYZ.y, direction);
            let originNeighborTileY = board.grid.getNeighborTileY(myTileXYZ.x, myTileXYZ.y, direction);
            // wrap mode && neighbor
            if ((originNeighborTileX === tileX) && (originNeighborTileY === tileY)) {
                // not a wrapped neighbor
                let out = board.tileXYToWorldXY(tileX, tileY, true);
                this.moveAlongLine(undefined, undefined, out.x, out.y);
            } else {
                // wrapped neighbor
                // line 0
                let out = board.tileXYToWorldXY(originNeighborTileX, originNeighborTileY, true);
                let originNeighborWorldX = out.x;
                let originNeighborWorldY = out.y;
                out = board.tileXYToWorldXY(myTileXYZ.x, myTileXYZ.y, true);
                let startX = out.x;
                let startY = out.y;
                let endX = (startX + originNeighborWorldX) / 2;
                let endY = (startY + originNeighborWorldY) / 2;
                this.moveAlongLine(null, null, endX, endY);
                // line 1
                let oppositeDirection = board.getOppositeDirection(tileX, tileY, direction);
                originNeighborTileX = board.grid.getNeighborTileX(tileX, tileY, oppositeDirection);
                originNeighborTileY = board.grid.getNeighborTileY(tileX, tileY, oppositeDirection);
                out = board.tileXYToWorldXY(originNeighborTileX, originNeighborTileY, true);
                originNeighborWorldX = out.x;
                originNeighborWorldY = out.y;
                out = board.tileXYToWorldXY(tileX, tileY, true);
                endX = out.x;
                endY = out.y;
                startX = (originNeighborWorldX + endX) / 2;
                startY = (originNeighborWorldY + endY) / 2;
                this.addMoveLine(startX, startY, endX, endY);
            }
        } else {
            let out = board.tileXYToWorldXY(tileX, tileY, true);
            this.moveAlongLine(null, null, out.x, out.y);
        }
        board.moveChess(this.node, tileX, tileY, undefined, false);
    
        this.isRun = true;
        this.lastMoveResult = true;
        return;
    }

    /**朝向某个方向移动 */
    moveToward(direction){
        this.moveTo(undefined, undefined, direction);
    }

    /**随机移动到邻接的格子 */
    moveToRandomNeighbor(){
        let board = this.chessData.board;
        if (board === null) { // chess is not in a board
            this.lastMoveResult = false;
            return this;
        }
    
        let directions = board.grid.allDirections;
        if (globDirections.length !== directions.length) {
            globDirections.length =0;
            directions.forEach(v=>{
                globDirections.push(v);
            })
        }

        Shuffle(globDirections);
        for (let i = 0, cnt = globDirections.length; i < cnt; i++) {
            this.moveToward(globDirections[i]);
            if (this.lastMoveResult) {
                return;
            }
        }
    }

    moveAway(config:{x?:number,y?:number,moveAwayMode?:boolean})
    moveAway(tileX:number,tileY:number,moveAwayMode?)
    moveAway(tileX?:any, tileY?:any, moveAwayMode:boolean = true){
        let board = this.chessData.board;
        if (board === null) { // chess is not in a board
            this.lastMoveResult = false;
            return this;
        }

        if (typeof (tileX) !== 'number') {
            let config = tileX;
            tileX = config.x;
            tileY = config.y;
        }

        this.targetTileXY.x = tileX;
        this.targetTileXY.y = tileY;

        let myTileXYZ = this.chessData.tileXYZ,
            chessInfo, direction;
        let directions = board.grid.allDirections;
        
        //初始化每个邻接棋子的信息，和当前棋子的坐标
        // Initial chess info of each neighbor and current tile position
        if (globChessInfo.length !== (directions.length + 1)) {
            globChessInfo.length = 0;
            // Neighbors
            for (let i = 0, cnt = directions.length; i < cnt; i++) {
                globChessInfo.push({
                    direction: i
                });
            }
            // current tile position
            globChessInfo.push({
                direction: null
            });
        }

        // 获取 棋盘坐标xy 和 对每个邻接棋子的距离，以及当前的坐标
        // Get tileXY and distance of each neighbor and current tile position
        let out;
        for (let i = 0, cnt = globChessInfo.length; i < cnt; i++) {
            chessInfo = globChessInfo[i];
            direction = chessInfo.direction;
            if (direction === null) { // Current tile position
                chessInfo.x = myTileXYZ.x;
                chessInfo.y = myTileXYZ.y;
            } else { // Neighobrs
                out = board.getNeighborTileXY(cc.v2(myTileXYZ.x,myTileXYZ.y), direction, chessInfo);
                if (out === null) { // Invalid neighbor tile position
                    chessInfo.x = null;
                    chessInfo.y = null;
                    chessInfo.distance = null;
                    continue;
                }
            }
            chessInfo.distance = board.getDistance(chessInfo, this.targetTileXY, true);
        }

        //之前的方向
        let previousDirection = this.destinationDirection;

        // 排序棋子的信息
        globChessInfo.sort(function (infoA, infoB) {
            // Invalid tile position
            if (infoA.distance === null)return 1;
            if (infoB.distance === null)return -1;

            if (infoA.distance > infoB.distance) return (moveAwayMode) ? -1 : 1;
            if (infoA.distance < infoB.distance) return (moveAwayMode) ? 1 : -1;

            // Equal-to case
            // Diagonal
            if (infoA.direction === previousDirection) return 1;
            if (infoB.direction === previousDirection) return -1;
            // Current tile position
            if (infoA.direction === null) return 1
            if (infoB.direction === null) return -1;
            return 0;
        });
        // 尝试移动到邻接棋子位置，或者当前坐标
        for (let i = 0, cnt = globChessInfo.length; i < cnt; i++) {
            chessInfo = globChessInfo[i];
            if (chessInfo.distance === null) { // Invalid tile position
                return;
            }

            this.moveTo(chessInfo);

            if (this.lastMoveResult) {
                return;
            }

        }
    }

    moveCloser(tileX, tileY){
        this.moveAway(tileX, tileY, false);
    }

    // base
    private moveAlongLine(startX, startY, endX, endY){
        // if (startX !== undefined) {
        //     this.gameObject.x = startX;
        // }
        // if (startY !== undefined) {
        //     this.gameObject.y = startY;
        // }
        // this.moveToTask.moveTo(endX, endY);
    }

    private addMoveLine(startX, startY, endX, endY){
        // if (!this.moveToTask.hasOwnProperty('nextlines')) {
        //     this.moveToTask.nextlines = [];
        // }
        // this.moveToTask.nextlines.push(
        //     [startX, startY, endX, endY]
        // );
    }

    private moveNextLine() {
        // let nextlines = this.moveToTask.nextlines;
        // if (!nextlines) {
        //     return false;
        // }
        // if (nextlines.length === 0) {
        //     return false;
        // }
        // // has next line
        // this.moveAlongLine.apply(this, nextlines[0]);
        // nextlines.length = 0;
        // return true;
    }

    update(dt) {
        // if ((!this.isRunning) || (!this.enable)) {
        //     return this;
        // }

        // let moveToTask = this.moveToTask;
        // moveToTask.update(time, delta);
        // if (!moveToTask.isRunning) {
        //     if (!this.moveNextLine()) {
        //         this.complete();
        //     }
        //     return this;
        // }
        // return this;
    }



    // update (dt) {}
}
