import { BOARD_DIRECTION, ORIENTATION_TYPE, GRID_STAGGER_AXIS, GRID_STAGGER_INDEX, QUAD_DIR_MODE, GRID_TYPE } from './utils/convert';
import { IBoard, IBoardShape, IBoardGridConfig } from './utils/interface';
import BoardData from "./BoardData";
import QuadGrid from "./quad/QuadGrid";
import { HexagonGrid } from "./hexagon/HexagonGrid";
import BhvChess from './BhvChess';
import {ChessBank, UIDBank} from './ChessBank';

const RandomBetween = function (min, max)
{
    return Math.floor(Math.random() * (max - min + 1) + min);
};

const Wrap = function (value, min, max)
{
    let range = max - min;
    return (min + ((((value - min) % range) + range) % range));
};

const GetRandomItem = function (array, startIndex?, length?)
{
    if (startIndex === undefined) { startIndex = 0; }
    if (length === undefined) { length = array.length; }
    let randomIndex = startIndex + Math.floor(Math.random() * length);
    return (array[randomIndex] === undefined) ? null : array[randomIndex];
};


const {ccclass, property} = cc._decorator;

//棋盘配置参数
let BoardGridConfig = cc.Class(   {
    name:'BoardGridConfig',
    properties:{
        x:64,
        y:64,
        cellWidth:64,
        cellHeight:64,
        gridType:{
            default:GRID_TYPE.QUAD,
            type:cc.Enum(GRID_TYPE),
            tooltip:'棋盘类型\n QUAD-方形\n HEXAGON- 六边形'
        },
        orientation:{
            default:ORIENTATION_TYPE.ORTHOGONAL,
            type:cc.Enum(ORIENTATION_TYPE),
            tooltip:'棋盘方向\n ORTHOGONAL- 正交\n ISOMETRIC- 斜角\n STAGGERED- 交错(未支持)'
        },
        dir:{
            default:QUAD_DIR_MODE.DIR4,
            type:cc.Enum(QUAD_DIR_MODE),
            tooltip:'棋盘方向限制\n DIR4- 4个方向\n DIR8 - 8个方向',
            visible:function(){return  this.gridType === GRID_TYPE.QUAD }
        },
        staggerAxis:{
            default:GRID_STAGGER_AXIS.X,
            type:cc.Enum(GRID_STAGGER_AXIS),
            visible:function(){return  this.gridType === GRID_TYPE.HEXAGON }
        },
        staggerIndex:{
            default:GRID_STAGGER_INDEX.ODD,
            type:cc.Enum(GRID_STAGGER_INDEX),
            visible:function(){return this.gridType === GRID_TYPE.HEXAGON}
        },
    }
})


@ccclass
export default class Board extends cc.Component{

    boardData:BoardData = new  BoardData();

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    /**棋子库存 */
    bank:UIDBank;

    /**棋盘布局 */
    grid:IBoardShape;

    @property({
        type:BoardGridConfig,
        serializable:true,
    })
    gridConfig = null;
    gridType:GRID_TYPE = GRID_TYPE.QUAD;
    
    /** 循环模式 */
    @property
    wrapMode:boolean = false;

    /** 无限模式 */
    @property
    infinityMode:boolean = false;

    /**棋盘宽度 */
    @property({
        visible:function(){return this.infinityMode === false}
    })
    width:number =0;

    /**棋盘高度 */
    @property({
        visible:function(){return this.infinityMode === false}
    })
    height:number = 0;

    //缓存文件，用于缓存引用 节省性能
    private _globWorldXY =cc.v2();
    private _globTileXY = cc.v2();
    private _defaultOriginTileXY = cc.v2();
    private _globTileXYArray: cc.Vec2[] =[] ;
    private _globNeighborTileXYArray: cc.Vec2[] =[] ;
    private _globTileArray: any[] = [];
    private _globChessArray:any[] = [];

    //初始化配置(脚本中使用)
    init(config:{infinity:boolean,wrap:boolean,grid:IBoardGridConfig}){
        this.infinityMode = config.infinity?true:false;
        this.wrapMode = config.wrap?true:false;
    }

    onLoad() {
        let config = this.gridConfig||{};
        let gridType = config.gridType||0;
        if(gridType === GRID_TYPE.QUAD){
            this.grid = new QuadGrid(config);
        }else{
            this.grid = new HexagonGrid(config);
        }

        this.bank = ChessBank; 

    }

    
    setBoardSize(width, height) {
        this.setBoardWidth(width);
        this.setBoardHeight(height);
    }

    /**棋子是否存在，返回对应UID */
    exists(chess:cc.Node) {
        // game object or uid
        return this.boardData.exists(this.getChessUID(chess));
    }

    get chessCount() {
        return this.boardData.chessCount;
    }

    /** 获取棋子组件(数据) */
    getChessComp(node:cc.Node):BhvChess
    getChessComp(node:any):BhvChess{
        let comp = node.getComponentInChildren(BhvChess);
           if(comp==null){
            comp =  node.addComponent(BhvChess);
           }
         return comp;
    }

    /** 获取棋子UID (通过组件获取) */
    getChessUID(node:cc.Node){
        let comp = node.getComponentInChildren(BhvChess);
        return comp?comp.uid:null;
    }

    /**设置棋盘宽度 */
    setBoardWidth(width:number){
        if (this.infinityMode)return;
        if ((this.width === undefined) || (this.width <= width)) {
            this.width = width;
            return this;
        }
    
        // this.width > width : collapse
        let tileX, tileY, tileZ, tileZToUIDs;
        for (tileX = width; tileX < this.width; tileX++) {
            for (tileY = 0; tileY < this.height; tileY++) {
                tileZToUIDs = this.boardData.getUID(tileX, tileY);
                for (tileZ in tileZToUIDs) {
                    this.removeChess(null, tileX, tileY, tileZ);
                }
            }
        }
    
        this.width = width;
    }

    /**设置棋盘高度 */
    setBoardHeight(height:number){
        if ((this.height === undefined) || (this.height <= height)) {
            this.height = height;
            return this;
        }
    
        // this.height > height : collapse
        let tileX, tileY, tileZ, tileZToUIDs;
        for (tileY = height; tileY < this.height; tileY++) {
            for (tileX = 0; tileX < this.width; tileX++) {
                tileZToUIDs = this.boardData.getUID(tileX, tileY);
                for (tileZ in tileZToUIDs) {
                    this.removeChess(null, tileX, tileY, tileZ);
                }
            }
        }
    
        this.height = height;
    }

    ///////////////////////////////////////////////////////////////////////////
    //////*   基本属性
    ///////////////////////////////////////////////////////////////////////////

    /**将棋子坐标转换为世界坐标 */
    tileXYToWorldXY(tileX:number, tileY:number, out?:any):cc.Vec2{
        return this.grid.getWorldXY(tileX, tileY, out);
    }

    /**将世界坐标转换为棋子坐标 */
    worldXYToTileXY(worldX:number, worldY:number, out?:any):cc.Vec2{
        return this.grid.getTileXY(worldX, worldY, out);
    }

    /**将世界坐标对齐到棋盘上 */
    worldXYSnapToGrid(worldX:number, worldY:number, out?:any):cc.Vec2{
        if (out === undefined) {
            out = cc.v2();
        } else if (out === true) {
            out = this._globWorldXY;
        }
    
        this.worldXYToTileXY(worldX, worldY, out);
        this.tileXYToWorldXY(out.x, out.y, out);
        return out;
    }

    /** 判断两个棋子之间的角度 */
    angleBetween(tileA:cc.Vec2, tileB:cc.Vec2):number{
        let out = this.tileXYToWorldXY(tileA.x, tileA.y, true);
        let x0 = out.x;
        let y0 = out.y;
        out = this.tileXYToWorldXY(tileB.x, tileB.y, true);
        let x1 = out.x;
        let y1 = out.y;
        return  Math.atan2(y1-y0,x1-x0); // -PI
    }

    /** 判断棋子在棋盘上对应方向的 角度朝向 */
    angleToward(tileXY:cc.Vec2, direction:BOARD_DIRECTION):number{
        // Save wrapMode, infinityMode and clear them
        let wrapModeSave = this.wrapMode;
        let infinityModeSave = this.infinityMode;
        this.wrapMode = false;
        this.infinityMode = true;

        // Get neighborTileXY
        let neighborTileXY = this.getNeighborTileXY(tileXY, direction, true);

        // Restore wrapMode, infinityMode and clear them
        this.wrapMode = wrapModeSave;
        this.infinityMode = infinityModeSave;
        return this.angleBetween(tileXY, neighborTileXY);
    }

    /** 是否和某个点重叠了 */
    isOverlappingPoint(worldX:number, worldY:number, tileZ:number):boolean{
        if (this.infinityMode && (tileZ === undefined)) {
            return true;
        }
    
        let out = this.worldXYToTileXY(worldX, worldY, true);
        return this.contains(out.x, out.y, tileZ);
    }

    gridAlign(node, tileX?, tileY?){

        if (node === undefined) {
            let chess = this.getAllChess();
            for (let i = 0, cnt = chess.length; i < cnt; i++) {
                this.gridAlign(chess[i]);
            }
        } else {
            let comp = node.getComponentInChildren(BhvChess);
            if (typeof(node) === "string" || typeof(node)=== "number") {
                comp = this.uidToChess(node);
            }
            if (tileX === undefined) {
                let tileXYZ:cc.Vec3 = this.chessToTileXYZ(node);
                tileX = tileXYZ.x;
                tileY = tileXYZ.y;
            }
    
            this.tileXYToWorldXY(tileX, tileY, comp);
        }

    }

    //使用两点间的直线来匹配棋盘上的棋子
    lineToTileXYArray(startPos:cc.Vec2, endPos:cc.Vec2, out?:cc.Vec2[]){
        if (out === undefined) {
            out = [];
        }

        const Linear = (p0,p1,t)=>{(p1 - p0) * t + p0;};
    
        let totalDistance = startPos.sub(endPos).mag();
        let gridSize = Math.min(this.grid.cellWidth, this.grid.cellHeight);
        let quantity = Math.ceil(totalDistance / (gridSize / 4)),
            t;
        let worldX, worldY;
        let preTileXY:cc.Vec2, tileXY:cc.Vec2;
        for (let i = 0; i <= quantity; i++) {
            t = i / quantity;
            worldX = Linear(startPos.x, endPos.x, t);  
            worldY = Linear(startPos.y, endPos.y, t);
            tileXY = this.worldXYToTileXY(worldX, worldY);
            if (!this.contains(tileXY.x, tileXY.y)) {
                continue;
            }

            if (preTileXY &&  preTileXY.equals(tileXY)) {
                continue;
            }
    
            out.push(tileXY);
            preTileXY = tileXY;
        }
        return out;
    }

    ///////////////////////////////////////////////////////////////////////////
    //////*   棋子管理
    ///////////////////////////////////////////////////////////////////////////


    uidToChess(uid:number|string):cc.Node{
        if (uid == null) {
            return null;
        } else {
            // single uid
            if (!this.boardData.exists(uid)) {
                return null;
            }
            return this.bank.get(uid);
        }
    }

    /** 添加棋子到某个位置 (可以选择是否对齐棋盘) */
    addChess(node:cc.Node, tileX:number, tileY:number, tileZ?:number, align?:boolean)
    /** 添加对应uid的棋子到某个位置,如果棋子已经存在 (可以选择是否对齐棋盘) */
    addChess(uid:number|string, tileX:number, tileY:number, tileZ?:number, align?:boolean)
    addChess(node:any, tileX:number, tileY:number, tileZ?:number, align:boolean = true){
        if (!this.contains(tileX, tileY))return;
    
        let curTileXYZ = this.chessToTileXYZ(node);
        if (tileZ === null) {
            if (curTileXYZ) {
                tileZ = curTileXYZ.z;
            } else {
                tileZ = 0;
            }
        }

        if (curTileXYZ &&(curTileXYZ.x === tileX) && (curTileXYZ.y === tileY) && (curTileXYZ.z === tileZ)) {
            // Move to current position
            return;
        }

        let occupiedChess = this.tileXYZToChess(tileX, tileY, tileZ);
        if (occupiedChess) {
            this.node.emit('board-kick-out', node, occupiedChess, curTileXYZ);
            // 发送消息通知处理
        }
    
        this.removeChess(node);

        if (occupiedChess) {
            this.removeChess(occupiedChess, tileX, tileY, tileZ);
        }
        this.boardData.addUID(this.getChessUID(node), tileX, tileY, tileZ);
        this.getChessComp(node).setBoard(this);
    
        if (align) {
            this.gridAlign(node, tileX, tileY);
        }

    }

    /** 移除棋子，可以按node 移除，也可以按棋盘位置移除 */
    removeChess(node:cc.Node, tileX?:number, tileY?:number, tileZ?:number, destroy?:boolean, fromBoardRemove?:boolean):cc.Node;
    removeChess(uid:string|number, tileX?:number, tileY?:number, tileZ?:number, destroy?:boolean, fromBoardRemove?:boolean):cc.Node
    removeChess(chess?:any, tileX:number =0, tileY:number =0, tileZ:number = 0, destroy:boolean = false, fromBoardRemove:boolean = false):cc.Node{
        if (chess) {
            let tileXYZ = this.chessToTileXYZ(chess);
            if (tileXYZ) {
                tileX = tileXYZ.x;
                tileY = tileXYZ.y;
                tileZ = tileXYZ.z;
                chess = this.tileXYZToChess(tileX, tileY, tileZ);
            } else {
                // chess is not in this board
                return;
            }
        } else {
            chess = this.tileXYZToChess(tileX, tileY, tileZ);
             // chess is not in this board
            if (!chess)return;
        }
    
        if (!fromBoardRemove) {
            this.boardData.removeUID(tileX, tileY, tileZ);
        }
        this.getChessComp(chess).setBoard(null);
    
        if (destroy) {
            if(chess.destroy)chess.destroy();
            return null;
        }else{
            return chess;
        }
    
    }

    /** 移除所有棋子 */
    removeAllChess(destroy:boolean = false, fromBoardRemove:boolean = false){
        let chess = this.getAllChess();
        for (let i = 0, cnt = chess.length; i < cnt; i++) {
            this.removeChess(chess[i], null, null, null, destroy, fromBoardRemove);
        }
    }

    /** 交换棋子 */
    swapChess(nodeA:cc.Node, nodeB:cc.Node, align:boolean = true){  
        let tileXYZA = this.chessToTileXYZ(nodeA);
        let tileXYZB = this.chessToTileXYZ(nodeB);
        if ((tileXYZA == null) || (tileXYZB == null))return;
        this.removeChess(nodeA);
        this.removeChess(nodeB);
        this.addChess(nodeA, tileXYZB.x, tileXYZB.y, tileXYZB.z, align);
        this.addChess(nodeB, tileXYZA.x, tileXYZA.y, tileXYZA.z, align);
    }

    /** 移动棋子 */
    moveChess(node:cc.Node, tileX:number, tileY:number, tileZ?:number, align:boolean = true){
        this.addChess(node,tileX,tileY,tileZ,align);
    }

    /**查询所有棋子 */
    getAllChess(out:cc.Node[] = []):cc.Node[]{
        let uids = this.boardData.UIDToXYZ;
        for (let uid in uids) {
            out.push(this.uidToChess(uid));
        }
        return out;
    }


    ///////////////////////////////////////////////////////////////////////////
    //////*   坐标转换
    ///////////////////////////////////////////////////////////////////////////

    /**包含在棋盘范围内吗? */

    contains(tileX:number, tileY:number, tileZ?:string)
    contains(tileX:number, tileY:number, tileZ?:number)
    contains(tileX:number, tileY:number, tileZ?:any){
        let result;
        if (this.infinityMode) {
            result = true;
        } else {
            result = (tileX >= 0) && (tileX < this.width) && (tileY >= 0) && (tileY < this.height);
        }

        if (result && (tileZ !== null&& tileZ !== undefined)) {
            result = this.boardData.contains(tileX, tileY, tileZ);
        }

        return result;
    }

    /**
     * 遍历棋盘内的每一个瓦片
     * @param callback 
     * @param order - 0-(-x+,y+)  1-( x-,y+) 2-( y+,x+)
     */
    forEachTileXY(callback:(tile:cc.Vec2,BOARD:Board)=>void, order:number = 0){
        switch (order) {
            case 0: // x+,y+
                for (let tileY = 0; tileY < this.height; tileY++) {
                    for (let tileX = 0; tileX < this.width; tileX++) {
                        this._globTileXY.x = tileX;
                        this._globTileXY.y = tileY;
                         callback(this._globTileXY, this);
                    }
                }
                break;
            case 1: // x-,y+
                for (let tileY = 0; tileY < this.height; tileY++) {
                    for (let tileX = this.width - 1; tileX >= 0; tileX--) {
                        this._globTileXY.x = tileX;
                        this._globTileXY.y = tileY;
                        callback(this._globTileXY, this);
                    }
                }
                break;
            case 2: // y+,x+
                for (let tileX = 0; tileX < this.width; tileX++) {
                    for (let tileY = 0; tileY < this.height; tileY++) {
                        this._globTileXY.x = tileX;
                        this._globTileXY.y = tileY;
                        callback(this._globTileXY, this);
                    }
                }
                break;
            case 3: // y-,x+
                for (let tileX = 0; tileX < this.width; tileX++) {
                    for (let tileY = this.height - 1; tileY >= 0; tileY--) {
                        this._globTileXY.x = tileX;
                        this._globTileXY.y = tileY;
                        callback(this._globTileXY, this);
                    }
                }
        }
    }

    /**
     * 得到 wrap 后的 tile x 坐标
     * @param tileX 
     */
    getWrapTileX(tileX,tileY):number{
        if (this.wrapMode) {
            tileX = Wrap(tileX, 0, this.width);
        } else if ((!this.infinityMode) && ((tileX < 0) || (tileX >= this.width))) {
            tileX = null;
        }
        return tileX;
    }

    /**
     * 得到wrap 后 的 title y 坐标
     * @param tileY 
     */
    getWrapTileY(tileX,tileY):number{
        if (this.wrapMode) {
            tileY = Wrap(tileY, 0, this.height);
        } else if ((!this.infinityMode) &&
            ((tileY < 0) || (tileY >= this.height))) {
            tileY = null;
        }
        return tileY;
    }

    /** 找到对应棋盘 XYZ 的 节点*/
    tileXYZToChess(tileX:number, tileY:number, tileZ:number):cc.Node{
        let uid = this.boardData.getUID(tileX, tileY, tileZ);
        return this.uidToChess(uid);
    }

    /** 找到对应棋盘XY 的所有节点(Z层不同) */
    tileXYToChessArray(tileX:number, tileY:number, out:cc.Node[] =[]):cc.Node[]{
        let tileZToUIDs = this.boardData.getUID(tileX, tileY);
        if (tileZToUIDs == null) {
            return out;
        }
    
        for (let tileZ in tileZToUIDs) {
            out.push(this.uidToChess(tileZToUIDs[tileZ]));
        }
        return out;
    }

    /** 找到一个 Z 层级的所有棋子 */
    tileXYArrayToChess(tileXYArray:cc.Vec2[], tileZ:number[], out:cc.Node[]):cc.Node[];
    tileXYArrayToChess(tileXYArray:cc.Vec2[], tileZ:number, out:cc.Node[]):cc.Node[];
    tileXYArrayToChess(tileXYArray:cc.Vec2[], tileZ?:any, out:cc.Node[] = []):cc.Node[]{
        if (Array.isArray(tileZ)) {
            out = tileZ;
            tileZ = undefined;
        }

        if (out === undefined ||out === null) {
            out = [];
        }

        let tileZMode = (tileZ != null);
        let tileXY;
        for (let i = 0, cnt = tileXYArray.length; i < cnt; i++) {
            tileXY = tileXYArray[i];
            if (tileZMode) {
                out.push(this.tileXYZToChess(tileXY.x, tileXY.y, tileZ));
            } else {
                this.tileXYToChessArray(tileXY.x, tileXY.y, out);
            }
        }
        return out;
    }
    
    tileZToChessArray(tileZ:number, out:cc.Node[] = []){
        let uids = this.boardData.UIDToXYZ;
        let tileXYZ;
        for (let uid in uids) {
            tileXYZ = uids[uid];
            if (tileXYZ.z !== tileZ) {
                continue;
            }
            out.push(this.uidToChess(uid));
        }
        return out;
    }

    /** 根据棋子获取 XYZ 坐标 */
    chessToTileXYZ(node:cc.Node):cc.Vec3;
    chessToTileXYZ(uid:string|number):cc.Vec3
    chessToTileXYZ(chess:any):cc.Vec3{
        // chess: chess object, UID, to tileXYZ
        if(chess ==null)return;
        if (typeof chess === 'number' || typeof chess === 'string') { // UID
            let uid = chess;
            return this.boardData.getXYZ(uid);
        }else {
            let comp = chess.getComponentInChildren(BhvChess);
            if (comp) { // chess
                if (comp.board === this) {
                    return comp.tileXYZ;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
    }

    /** 根据棋子获取 XY 坐标 */
    chessToTileXY(node:cc.Node):cc.Vec2;
    chessToTileXY(uid:string|number):cc.Vec2
    chessToTileXY(chess:any):cc.Vec2{
        let XYZ = this.chessToTileXYZ(chess);
        this._globTileXY.x = XYZ.x;
        this._globTileXY.y = XYZ.y;
        return this._globTileXY;
    }

    offset(tileXY:cc.Vec2, OffsetTileX:number, OffsetTileY:number, out:any)
    offset(tileXY:cc.Vec2, OffsetTileX:number =0, OffsetTileY:number =0, out:any){
        if (out === undefined||out === null) {
            out = {};
        } else if (out === true) {
            out = this._globTileXY;
        }
    
        if ((OffsetTileX === 0) && (OffsetTileY === 0)) {
            out.x = tileXY.x;
            out.y = tileXY.y;
        } else {
            this.grid.offset(tileXY, OffsetTileX, OffsetTileY, out);
        }
        return out;
    }

    rotate(tileXY:cc.Vec2, direction, originTileXY?:cc.Vec2, out?:any){
        if (originTileXY === null||originTileXY === undefined) {
            originTileXY = this._defaultOriginTileXY;
        }

        if (out === undefined) {
            out = cc.v2();
        } else if (out === true) {
            out = this._globTileXY;
        }
    
        this.offset(tileXY, -originTileXY.x, -originTileXY.y, out);
        this.grid.rotate(out, direction, out);
        this.offset(out, originTileXY.x, originTileXY.y, out);
        return out;
    }

    getOppositeDirection(tileX:number, tileY:number, direction:BOARD_DIRECTION){
        return this.grid.getOppositeDirection(tileX, tileY, direction);
    }

    getDistance(tileA:cc.Vec2,tileB:cc.Vec2,roughMode:boolean = false){
        return this.grid.getDistance(tileA, tileB, roughMode);
    }

    directionBetween(tileA:cc.Vec2, tileB:cc.Vec2){
        return this.grid.directionBetween(tileA, tileB);
    }

    /** Offset tileXYArray to (0,0), and set board size to fit tileXYArray  */
    fit(tileXYArray:cc.Vec2[]){
        // Get minimum tileX, tileY
        let minX = Infinity;
        let minY = Infinity;
        let tileXY;
        for (let i in tileXYArray) {
            tileXY = tileXYArray[i];
            minX = Math.min(minX, tileXY.x);
            minY = Math.min(minY, tileXY.y);
        }
        // Offset tileXYArray to (0,0)
        if ((minX !== 0) || (minY !== 0)) {
            for (let i in tileXYArray) {
                tileXY = tileXYArray[i];
                this.offset(tileXY, -minX, -minY, tileXY);
            }
        }

        // Get maximun tileX, tileY
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let i in tileXYArray) {
            tileXY = tileXYArray[i];
            maxX = Math.max(maxX, tileXY.x);
            maxY = Math.max(maxY, tileXY.y);
        }
        // Set board size
        this.setBoardWidth(maxX);
        this.setBoardHeight(maxY);
        return tileXYArray;
    }


    ///////////////////////////////////////////////////////////////////////////
    //////*    图块获取
    ///////////////////////////////////////////////////////////////////////////

    /** 获取为空图块的坐标数组 */
    getEmptyTileXYArray(tileZ = 0, out?:any):cc.Vec2[]{
        if (out === undefined||out === null) {
            out = [];
        }

        for (let tileY = 0; tileY < this.height; tileY++) {
            for (let tileX = 0; tileX < this.width; tileX++) {
                if (this.tileXYZToChess(tileX, tileY, tileZ) === null) {
                    out.push(cc.v2(tileX,tileY));
                }
            }
        }
        return out;
    }

    /** 随机获取为空图块的位置 */
    getRandomEmptyTileXY(tileZ = 0, out?:any){
        if (out === undefined||out === null) {
            out = cc.v2();
        } else if (out === true) {
            out = this._globTileXY;
        }
    
        let tileX, tileY;
        let isOccupied = true;
        let tryCount = 20;

        //优化，尝试随机放置数量20，看看能不能找到
        while (isOccupied && (tryCount > 0)) {
            tileX = RandomBetween(0, this.width - 1);
            tileY = RandomBetween(0, this.height - 1);
            isOccupied = (this.tileXYZToChess(tileX, tileY, tileZ) !== null);
            tryCount--;
        }
    
        //如果找不到再尝试遍历放置一个空数组
        if (!isOccupied) {
            out.x = tileX;
            out.y = tileY;
            return out;
        } else {
            this._globTileXYArray = this.getEmptyTileXYArray(tileZ, this._globTileXYArray);
            if (this._globTileXYArray.length === 0) {
                return null;
            } else {
                let tileXY = GetRandomItem(this._globTileXYArray);
                out.x = tileXY.x;
                out.y = tileXY.y;
                this._globTileXYArray.length = 0;
                return out;
            }
        }
    }


    getNeighborTileXY(srcTileXY:cc.Vec2, direction:number = 0, out?:any):cc.Vec2{
        let dir = direction;
        if (out === undefined||out === null) {
            out = cc.v2();
        } else if (out === true) {
            out = this._globTileXY;
        }

        let tileX = this.grid.getNeighborTileX(srcTileXY.x, srcTileXY.y, dir);
        let tileY = this.grid.getNeighborTileY(srcTileXY.x, srcTileXY.y, dir);
        let wrapTileX = this.getWrapTileX(tileX, tileY);
        let wrapTileY = this.getWrapTileY(tileX, tileY);
        if ((wrapTileX == null) || (wrapTileY == null)) {
            out = null;
        } else {
            out.x = wrapTileX;
            out.y = wrapTileY;
        }
        return out;
    }

    getNeighborTilesXY(srcTileXY:cc.Vec2, directions:number[], out?:any):cc.Vec2[];
    getNeighborTilesXY(srcTileXY:cc.Vec2, directions?:any, out?:any):any{
            let dir:number, neighborTileXY:cc.Vec2;
            // directions array
            if (directions == null)directions = this.grid.allDirections;
            if (out === undefined||out === null) out = [];
            for (let i = 0, cnt = directions.length; i < cnt; i++) {
                dir = directions[i];
                neighborTileXY = this.getNeighborTileXY(srcTileXY, dir);
                if (neighborTileXY === null) {
                    continue;
                }
                out.push(neighborTileXY);
            }
            return out;

    }

    getNeighborChess(node:cc.Node, direction:number, neighborTileZ?):cc.Node;
    getNeighborChess(uid:string|number, direction:number, neighborTileZ?):cc.Node;
    getNeighborChess(chess:any, directions:number, neighborTileZ?):any{
            let tileXYZ = this.chessToTileXYZ(chess);
            if (tileXYZ === null)return;
            if (neighborTileZ == null)neighborTileZ = tileXYZ.z;
            // 1 direction
            let dir = directions;
            let neighborTileXY = this.getNeighborTileXY(tileXYZ as any, dir, true);
            if (neighborTileXY === null) {
                return null;
            }
            return this.tileXYZToChess(neighborTileXY.x, neighborTileXY.y, neighborTileZ);
    }

    getNeighborChesses(node:cc.Node, directions:number[], neighborTileZ?, out?:any):cc.Node[];
    getNeighborChesses(uid:string|number, directions:number[], neighborTileZ?, out?:any):cc.Node[];
    getNeighborChesses(chess:any, directions?:number[], neighborTileZ?, out?:any):any{
        let tileXYZ = this.chessToTileXYZ(chess);
        if (tileXYZ === null)return;
        if (neighborTileZ == null)neighborTileZ = tileXYZ.z;
        if (out === undefined||out === null)out = [];
        this.getNeighborTilesXY(tileXYZ as any, directions,  this._globTileXYArray);
        let neighborChess;
        for (let i = 0, cnt =  this._globTileXYArray.length; i < cnt; i++) {
            neighborChess = this.tileXYZToChess( this._globTileXYArray[i].x,  this._globTileXYArray[i].y, neighborTileZ);
            if (neighborChess == null) {
                continue;
            }
            out.push(neighborChess);
        }
        this._globTileXYArray.length = 0;
        return out;
    }

    getNeighborTileDirection(srcTileXY:cc.Vec2, neighborTileXY:cc.Vec2):BOARD_DIRECTION{
        if ((srcTileXY === null) || (neighborTileXY === null)) return null;
        if (srcTileXY.equals(neighborTileXY) )  return null;
        
        let direction = this.grid.getNeighborTileDirection(srcTileXY, neighborTileXY);
        if (this.wrapMode && (direction === null)) {
            this._globNeighborTileXYArray = this.getNeighborTilesXY(srcTileXY, null, this._globNeighborTileXYArray);
            for (let i = 0, cnt = this._globNeighborTileXYArray.length; i < cnt; i++) {
                if (neighborTileXY.equals(this._globNeighborTileXYArray[i]) ) {
                    direction = i;
                    break;
                }
            }
            this._globNeighborTileXYArray.length = 0;
        }
        return direction;
    }

    getNeighborChessDirection(node:cc.Node, neighborNode:cc.Node):BOARD_DIRECTION
    getNeighborChessDirection(uid:number|string, neighborUid:number|string):BOARD_DIRECTION
    getNeighborChessDirection(chess:any, neighborChess:any):BOARD_DIRECTION{
        let srcTileXYZ = this.chessToTileXYZ(chess);
        let neighborTileXYZ = this.chessToTileXYZ(neighborChess);
        return this.getNeighborTileDirection(cc.v2(srcTileXYZ.x,srcTileXYZ.y), cc.v2(neighborTileXYZ.x,neighborTileXYZ.y));
    }

    areNeighbors(nodeA:cc.Node, nodeB:cc.Node):boolean
    areNeighbors(uidA:number|string, uidB:number|string):boolean
    areNeighbors(chessA:any, chessB:any):boolean{
        return (this.getNeighborChessDirection(chessA, chessB) !== null);
    }

    ringToTileXYArray(centerTileXY:cc.Vec2, radius:number, out:any = []){    
        this.grid.ringToTileXYArray(centerTileXY, radius, this._globTileArray);
        let tileXY;
        for (let i = 0, cnt = this._globTileArray.length; i < cnt; i++) {
            tileXY = this._globTileArray[i];
            if (this.contains(tileXY.x, tileXY.y)) {
                out.push(tileXY);
            }
        }
        this._globTileArray.length = 0;
        return out;
    }

    hasBlocker(tileX:number, tileY:number, tileZ?:number){
        let chess, blocker;
        if (tileZ === undefined||tileZ === null) {
            // any chess at (tileX, tileY) has blocker
            chess = this.tileXYToChessArray(tileX, tileY, this._globChessArray);
            for (let i = 0, cnt = chess.length; i < cnt; i++) {
                blocker = this.getChessComp(chess[i]).blocker;
                if (blocker === true) {
                    this._globChessArray.length = 0;
                    return true;
                }
            }
            this._globChessArray.length = 0;
            return false;
    
        } else {
            // chess at (tileX, tileY, tileZ) has blocker
            let chess = this.tileXYZToChess(tileX, tileY, tileZ);
            if (chess === null) return false;

            blocker = this.getChessComp(chess).blocker;
            return (blocker === true);
    
        }   
    }

    hasEdgeBlocker(tileX:number, tileY:number, tileZ?:number, direction?:number){
        let chess;
        if (tileZ === undefined||tileZ === null) {
            // any chess at (tileX, tileY) has blocker
            chess = this.tileXYToChessArray(tileX, tileY, this._globChessArray);
            for (let i = 0, cnt = chess.length; i < cnt; i++) {
                if (this.getChessComp(chess[i]).blockerEdges[direction] === true) {
                    this._globChessArray.length = 0;
                    return true;
                }
            }
            this._globChessArray.length = 0;
            return false;
    
        } else {
            // chess at (tileX, tileY, tileZ) has blocker
            let chess = this.tileXYZToChess(tileX, tileY, tileZ);
            if (chess === null)  return false;
            return this.getChessComp(chess).blockerEdges[direction] === true;
        }

    }

    ////////////////////////////////////////////////////////////////
    //** 设置棋盘的触摸事件 */
    ////////////////////////////////////////////////////////////////

    setInteractive(enable:boolean = true){
        if(enable){
            this.node.on(cc.Node.EventType.TOUCH_START,this.onTouchStart,this);
            this.node.on(cc.Node.EventType.TOUCH_MOVE,this.onTouchMove,this);
            this.node.on(cc.Node.EventType.TOUCH_END,this.onTouchEnd,this);
        }else{
            this.node.off(cc.Node.EventType.TOUCH_START,this.onTouchStart,this);
            this.node.off(cc.Node.EventType.TOUCH_MOVE,this.onTouchMove,this);
            this.node.off(cc.Node.EventType.TOUCH_END,this.onTouchEnd,this);
        }
    }

    onEnable(){
        this.setInteractive(true);
    }

    onDisable(){
        this.setInteractive(false);
    }

    private input = {
        enable:false,
        isDown:false,
        touchId:null,
        tilePosition:cc.v2()
    }

    //todo 查看这部分 有没有把 触摸方法写正确

    onTouchStart(e:cc.Event.EventTouch){
        if (!this.input.enable)return;
        if (this.input.isDown===true)return;

        this.input.isDown = true;
        if (this.input.touchId === null) { // Catch new touch pointer
            this.input.touchId = e.getID();
        }

        // Get touched tileX, tileY
        let out = this.worldXYToTileXY(e.getLocationX(), e.getLocationY(), true);
        let tileX = out.x,
            tileY = out.y;
        this.input.tilePosition.x = tileX;
        this.input.tilePosition.y = tileY;
        if (!this.contains(tileX, tileY)) {
            return;
        }
        this.node.emit('board-tile-down', e, this.input.tilePosition);
    
        // Get touched chess
        this._globChessArray.length = 0;
        let nodes = this.tileXYToChessArray(tileX, tileY, this._globChessArray);

        // Fire events
        let node;
        for (let i = 0, cnt = nodes.length; i < cnt; i++) {
            node = nodes[i];
            if (node.emit) {
                node.emit('board.pointerdown', e);
            }
            this.node.emit('gameobjectdown', e, node);
        }
        this._globChessArray.length = 0;
    }

    onTouchEnd(e:cc.Event.EventTouch) {
        if (!this.input.enable)return;
        // Get touched tileX, tileY
        let out = this.worldXYToTileXY(e.getLocationX(), e.getLocationY(), true);
        let tileX = out.x,
            tileY = out.y;
        this.input.tilePosition.x = tileX;
        this.input.tilePosition.y = tileY;
        if (!this.contains(tileX, tileY)) {
            return;
        }
        this.node.emit('board-tile-up', e, this.input.tilePosition);
    
        // Get touched chess
        this._globChessArray.length = 0;
        let nodes = this.tileXYToChessArray(tileX, tileY, this._globChessArray);
        // Fire events
        let node;
        for (let i = 0, cnt = nodes.length; i < cnt; i++) {
            node = nodes[i];
            if (node.emit) {
                node.emit('board.pointerup', e);
            }
            this.node.emit('gameobjectup', e, node);
        }
        this._globChessArray.length = 0;
    
        if (this.input.touchId === e.getID()) { // Release touch pointer
            this.input.touchId = null;
        }
    };

    onTouchMove(e:cc.Event.EventTouch) {
        if (!this.input.enable) {
            return;
        }
    
        // Get touched tileX, tileY
        let out = this.worldXYToTileXY(e.getLocationX(), e.getLocationY(), true);
        let tileX = out.x,
            tileY = out.y;
        if ((this.input.tilePosition.x === tileX) && (this.input.tilePosition.y === tileY)) {
            // Tile position dose not change
            return;
        }
        this.input.tilePosition.x = tileX;
        this.input.tilePosition.y = tileY;
        if (!this.contains(tileX, tileY)) {
            // Move outside
            if (this.input.touchId === e.getID()) { // Release touch pointer
                this.input.touchId = null;
            }
            return;
        }
        if (this.input.touchId === null) { // Catch new touch pointer
            this.input.touchId = e.getID();
        }
        this.node.emit('grid-tile-move', e, this.input.tilePosition);
    
        // Get touched chess
        this._globChessArray.length = 0;
        let nodes = this.tileXYToChessArray(tileX, tileY,  this._globChessArray);
        // Fire events
        let node;
        for (let i = 0, cnt = nodes.length; i < cnt; i++) {
            node = nodes[i];
            if (node.emit) {
                node.emit('board.pointermove', e);
            }
            this.node.emit('gameobjectmove', e, node);
        }
        this._globChessArray.length = 0;
    };

    /** 将棋盘坐标 转化为世界坐标 */
    getGridPoints(tileX:number, tileY:number, points?:any):cc.Vec2[]{
        return this.grid.getGridPoints(tileX, tileY, points);
    }


    
}
