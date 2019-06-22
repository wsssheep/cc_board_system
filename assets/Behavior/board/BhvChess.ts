import Board from "./Board";
import { BOARD_DIRECTION } from "./utils/convert";

// Learn TypeScript:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/typescript.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = cc._decorator;

let BlockerSelect = cc.Class({
    name:'BlockerSelect',
    properties:{
        LEFT:false,
        DOWN:false,
        RIGHT:false,
        UP:false,
        LEFT_DOWN:false,
        DOWN_RIGHT:false,
        Right_UP:false,
        UP_LEFT:false   
    }
})

/**引用缓存 */
const globTileXY = cc.v2();

@ccclass
export default class BhvChess extends cc.Component {

    
    private _uid:number;//禁止修改  
    private uidKey:string = '_uid';

    @property({
        tooltip:'是否设置为障碍'
    })
    public blocker:boolean = false;

    @property({
        type:BlockerSelect,
        tooltip:'障碍边界方向',
        serializable:true
    })
    public blockerEdges:object = null;

    public get uid() : number {
        return this._uid;
    }
    public board:Board;

    //手动调用初始化
    init(board:Board,uid:number|string,blocker:boolean = false){
        this.board = board;
        this.board.bank.add(this.node, uid); // uid is stored in `this.$uid`
        this.blocker = blocker;
    }

    start () {

    }

    /**设置棋子所属的棋盘 */
    setBoard(board:Board){
        this.board = board;
    }

    onLoad() {

    }

    onDestroy() {
        if (this.board) {
            this.board.removeChess(this[this.uidKey]);
        }
        this.board.bank.remove(this[this.uidKey]);

        //this.parent = undefined;
        this.board = null;
    }

    get tileXYZ():cc.Vec3 {
        if (this.board == null) {
            return null;
        }
        return this.board.chessToTileXYZ(this[this.uidKey]);
    }

    get tileXY():cc.Vec2 {
        if (this.board == null) {
            return null;
        }
        let XYZ = this.board.chessToTileXYZ(this[this.uidKey]);
        return cc.v2(XYZ.x,XYZ.y);
    }

    /**棋子的棋盘-Z层级 */
    set tileZ(tileZ:number) {
        if (this.board == null)return;
        let tileXYZ = this.tileXYZ;
        this.board.addChess(this._uid, tileXYZ.x, tileXYZ.y, tileZ, false);
    }

    setBlocker(value:boolean = true) {
        this.blocker = value;
    }

    setBlockEdge(direction, value:boolean = true) {
        if (this.blockerEdges === null) {
            this.blockerEdges = {};
        }

        if (typeof direction === 'object') {
            var blockEdges = direction;
            for (direction in blockEdges) {
                this.blockerEdges[direction] = blockEdges[direction];
            }
        } else if(typeof direction === 'number'||typeof direction === 'string') {
            this.blockerEdges[direction] = value;
        }

    }

    getBlockEdge(direction) {
        var blocker = this.blocker;
        if (blocker === false) {
            return false;
        }

        if (!blocker.hasOwnProperty(direction)) {
            return false;
        } else {
            return blocker[direction];
        }
    }

    getTileDirection(tileX,tileY):BOARD_DIRECTION{
        if(this.board == null)return null;
        return this.board.getNeighborTileDirection(cc.v2(this.tileXYZ.x,this.tileXYZ.y),globTileXY);
    }


    // update (dt) {}
}
