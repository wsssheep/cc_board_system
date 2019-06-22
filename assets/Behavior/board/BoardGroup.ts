import Board from "./Board";
import { BOARD_MIRROR_MODE, BOARD_DIRECTION } from "./utils/convert";
import { IBoardGridConfig, IBoardShape } from "./utils/interface";

// Learn TypeScript:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/typescript.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;


@ccclass
export default class BoardGroup extends cc.Component {


    board: Board;
    mainBoardRef: MainBoardReference = new MainBoardReference();
    lastMainBoardRef: MainBoardReference = new MainBoardReference();
    putTestCallback = undefined;
    face;
    lastTransferResult: any;

    // LIFE-CYCLE CALLBACKS:
    init(grid:IBoardGridConfig) {
        if (this.board == null) {
            let board = this.node.getComponent(Board);
            if (board == null) board = this.node.addComponent(Board);
            this.board = board;
        }
        this.board.init({
            grid: grid,
            infinity: true,
            wrap: false
        });
    }

    // onLoad () {}

    onDestroy() {
        this.board = undefined;
        this.putTestCallback = null;
    }

    setFace(direction) {
        this.face = this.board.grid.directionNormalize(direction);
        return this;
    }

    get mainBoard():Board {
        return this.mainBoardRef.mainBoard;
    }

    get tileX():number {
        return this.mainBoardRef.tileX;
    }

    get tileY():number {
        return this.mainBoardRef.tileY;
    }

    get grid():IBoardShape {
        return this.board.grid;
    }

    get tileXYZMap():object {
        return this.board.boardData.UIDToXYZ; // {uid:{x,y,z}}
    }

    /**设置一个放置检测回调函数，用于检测放置行为是否可行 */
    setPutTestCallback(callback) {
        this.putTestCallback = callback;
    }


    /** 添加棋子到某个位置 (可以选择是否对齐棋盘) */
    addChess(node: cc.Node, tileX: number, tileY: number, tileZ?: number, align?: boolean)
    /** 添加对应uid的棋子到某个位置,如果棋子已经存在 (可以选择是否对齐棋盘) */
    addChess(uid: number | string, tileX: number, tileY: number, tileZ?: number, align?: boolean)
    addChess(chess:any, tileX:number, tileY:number, tileZ?:number) {
        var gird = this.grid;
        gird.saveOrigin();
        gird.setOriginPosition(this.node.x, this.node.y);

        //  添加棋子到棋盘中 / Add chess to borad
        this.board.addChess(chess, tileX, tileY, tileZ, true);
        //  添加棋子到父节点下/ Add chess as child 
        if (typeof chess == 'string' || typeof chess == 'number') {
            chess = this.board.uidToChess(chess);
        }
        this.node.addChild(chess);

        gird.restoreOrigin();
    }

    removeChess(node?: cc.Node, tileX: number = 0, tileY: number = 0, tileZ: number = 0, destroy: boolean = false, fromBoardRemove: boolean = false): cc.Node {
        return this.board.removeChess(node, tileX, tileY, tileZ, destroy);
    }

    removeAllChess(destroy: boolean = false) {
        this.board.removeAllChess(destroy);
    }

    pullOutFromMainBoard() {
        var mainBoard = this.mainBoard;
        if (mainBoard === null) {
            return;
        }

        var tileXYZMap = this.tileXYZMap; // {uid:{x,y,z}}
        for (var uid in tileXYZMap) {
            mainBoard.removeChess(parseInt(uid));
        }
        this.setMainBoard(null);
    }

    canPutOnMainBoard(mainBoard: Board, tileX: number, tileY: number, chessTileXYMap?: object) {
        if (!mainBoard) {
            return false;
        }
        if (chessTileXYMap === undefined) {
            chessTileXYMap = this.tileXYZMap; // {uid:{x,y,z}}
        }

        var chessTileXYZ, mappedTileXY, isOccupied;
        for (var uid in chessTileXYMap) {
            chessTileXYZ = chessTileXYMap[uid];
            mappedTileXY = mainBoard.offset(chessTileXYZ, tileX, tileY, true);
            if (!mainBoard.contains(mappedTileXY.x, mappedTileXY.y)) {
                return false;
            }

            if (this.putTestCallback) {
                // Custom test function
                isOccupied = this.putTestCallback(mappedTileXY.x, mappedTileXY.y, chessTileXYZ.z, mainBoard);
            } else {
                // Default test function
                isOccupied = mainBoard.contains(mappedTileXY.x, mappedTileXY.y, chessTileXYZ.z);
            }
            if (isOccupied) {
                return false;
            }
        }
    }

    putOnMainBoard(mainBoard: Board, tileX: number, tileY: number, align) {
        if (!mainBoard) {
            return;
        }

        if (tileX === undefined) {
            var out = mainBoard.worldXYToTileXY(this.node.x, this.node.y, true);
            tileX = out.x;
            tileY = out.y;
        }
        if (align === undefined) {
            align = true;
        }

        this.pullOutFromMainBoard();
        if (!this.canPutOnMainBoard(mainBoard, tileX, tileY)) {
            return this;
        }

        this.setMainBoard(mainBoard, tileX, tileY);
        var tileXYZMap = this.tileXYZMap; // {uid:{x,y,z}}
        var chessTileXYZ, mappedTileXY;
        for (var uid in tileXYZMap) {
            chessTileXYZ = tileXYZMap[uid];
            let uidInt = parseInt(uid);
            mappedTileXY = mainBoard.offset(chessTileXYZ, tileX, tileY, true);
            mainBoard.addChess(uidInt, mappedTileXY.x, mappedTileXY.y, chessTileXYZ.z, false);
        }
        if (align) {
            this.alignToMainBoard(mainBoard, tileX, tileY);
        }
    }

    putBack() {
        var mainBoard = this.lastMainBoardRef.mainBoard;
        var tileX = this.lastMainBoardRef.tileX;
        var tileY = this.lastMainBoardRef.tileY;
        this.putOnMainBoard(mainBoard, tileX, tileY, false);
    }

    isOverlapping(mainBoard: Board, tileZ?: number) {
        if (!mainBoard) {
            return false;
        }

        var chessNode;
        for (var uid in this.tileXYZMap) {
            chessNode = this.board.uidToChess(uid);
            if (mainBoard.isOverlappingPoint(chessNode.x, chessNode.y, tileZ)) {
                return true;
            }
        }
    }

    alignToMainBoard(mainBoard: Board, tileX: number, tileY: number) {
        if (!mainBoard) {
            return this;
        }

        if (tileX === undefined) {
            var out = mainBoard.worldXYToTileXY(this.node.x, this.node.y, true);
            tileX = out.x;
            tileY = out.y;
        }
        mainBoard.gridAlign(this, tileX, tileY);
    }

    setInteractive() {
        //todo 使用组件化功能添加拖拽
    }
    setDragEnable() {
        //todo 使用组件化功能添加拖拽
    }
    dragEnd() {
        //todo 使用组件化功能添加拖拽
    }

    setMainBoard(mainBoard?: Board, tileX?: number, tileY?: number) {
        this.mainBoardRef.set(mainBoard, tileX, tileY);
        if (mainBoard) {
            this.lastMainBoardRef.set(mainBoard, tileX, tileY);
        }
    }
    canMirror(mode): boolean {
        if (this.mainBoard === null) {
            return true;
        }
        var tileX = this.lastMainBoardRef.tileX;
        var tileY = this.lastMainBoardRef.tileY;
        var newTileXYZMap = this.mirrorTransfer(mode);
        return this.canPutOnMainBoard(this.mainBoard, tileX, tileY, newTileXYZMap);
    }
    mirror(mode:BOARD_MIRROR_MODE) {
        var isOnMainBoard = (this.mainBoard != null);
        if (isOnMainBoard) {
            this.pullOutFromMainBoard();
        }

        var newTileXYZMap = this.mirrorTransfer(mode);

        if (isOnMainBoard) {
            var mainBoard = this.lastMainBoardRef.mainBoard;
            var tileX = this.lastMainBoardRef.tileX;
            var tileY = this.lastMainBoardRef.tileY;
            this.lastTransferResult = this.canPutOnMainBoard(mainBoard, tileX, tileY, newTileXYZMap);
            if (this.lastTransferResult) {
                this.resetChessTileXYZ(newTileXYZMap)
            }
            this.putBack();
        } else {
            this.lastTransferResult = true;
            this.resetChessTileXYZ(newTileXYZMap)
        }
    }

    canRotate(direction:BOARD_DIRECTION) {
        if (this.mainBoard === null) {
            return true;
        }
        var tileX = this.lastMainBoardRef.tileX;
        var tileY = this.lastMainBoardRef.tileY;
        var newTileXYZMap = this.rotateTransfer(direction);
        return this.canPutOnMainBoard(this.mainBoard, tileX, tileY, newTileXYZMap);
    }

    rotate(direction:BOARD_DIRECTION) {
        var isOnMainBoard = (this.mainBoard != null);
        if (isOnMainBoard) {
            this.pullOutFromMainBoard();
        }
    
        var newTileXYZMap = this.rotateTransfer(direction);
    
        if (isOnMainBoard) {
            var mainBoard = this.lastMainBoardRef.mainBoard;
            var tileX = this.lastMainBoardRef.tileX;
            var tileY = this.lastMainBoardRef.tileY;
            this.lastTransferResult = this.canPutOnMainBoard(mainBoard, tileX, tileY, newTileXYZMap);
            if (this.lastTransferResult) {
                this.resetChessTileXYZ(newTileXYZMap);
            }
            this.putBack();
        } else {
            this.lastTransferResult = true;
            this.resetChessTileXYZ(newTileXYZMap);
        }
    
        if (this.lastTransferResult) {
            this.setFace(this.face + direction);
        }
    }

    canRotateTo(direction:BOARD_DIRECTION) {
        direction -= this.face;
        return this.canRotate(direction as BOARD_DIRECTION);
    }

    rotateTo(direction:BOARD_DIRECTION) {
        direction -= this.face;
        this.rotate(direction as BOARD_DIRECTION);
    }

    /**返回的类型为 chessTileXYZMap，记录XYZ位置的 对象结构 */
    private mirrorTransfer(mode: BOARD_MIRROR_MODE = 1, chessTileXYZMap?: object, out: object = {}): object {
        if (chessTileXYZMap === null || chessTileXYZ === undefined) {
            chessTileXYZMap = this.tileXYZMap; // {uid:{x,y,z}}
        }
        var chessTileXYZ;
        for (var uid in chessTileXYZMap) {
            chessTileXYZ = chessTileXYZMap[uid];
            out[uid] = {
                x: (mode === 1) ? -chessTileXYZ.x : chessTileXYZ.x,
                y: (mode === 2) ? -chessTileXYZ.y : chessTileXYZ.y,
                z: chessTileXYZ.z
            };
        }
        return out; // {uid:{x,y,z}}
    }

    private resetChessTileXYZ(newTileXYZMap: object) {
        this.removeAllChess();
        var newTileXYZ;
        for (var uid in newTileXYZMap) {
            newTileXYZ = newTileXYZMap[uid];
            var uidInt = parseInt(uid);
            this.addChess(uidInt, newTileXYZ.x, newTileXYZ.y, newTileXYZ.z, false);
        }
    }

    private rotateTransfer(direction, chessTileXYZMap?: object, out = {}) {
        if (direction === undefined) {
            direction = 0;
        }
        if (chessTileXYZMap === undefined) {
            chessTileXYZMap = this.tileXYZMap; // {uid:{x,y,z}}
        }
        if (out === undefined) {
            out = {};
        }
        var chessTileXYZ, newTileXYZ;
        for (var uid in chessTileXYZMap) {
            chessTileXYZ = chessTileXYZMap[uid];
            newTileXYZ = this.board.rotate(chessTileXYZ, direction, undefined);
            newTileXYZ.z = chessTileXYZ.z;
            out[uid] = newTileXYZ;
        }
        return out; // {uid:{x,y,z}}
    }

    // update (dt) {}
}




class MainBoardReference {
    constructor(miniBoard?) {
        this.miniBoard = miniBoard;
        this.set(null);
    }
    miniBoard;
    mainBoard;
    tileX: number;
    tileY: number;
    set(mainBoard?, tileX?: number, tileY?: number) {
        if (!mainBoard) {
            mainBoard = null;
            tileX = null;
            tileY = null;
        }
        this.mainBoard = mainBoard;
        this.tileX = tileX;
        this.tileY = tileY;
    }
}