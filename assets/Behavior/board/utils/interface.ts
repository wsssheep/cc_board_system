import { ORIENTATION_TYPE, GRID_TYPE, QUAD_DIR_MODE, GRID_STAGGER_AXIS, GRID_STAGGER_INDEX } from "./convert";



/**
 * 棋盘 Grid接口,  一个类型的棋盘必须实现的接口类型
 */
export interface IBoardShape extends IBoardShapeBase {
    cellWidth:number;
    cellHeight:number;
    directions?;//拥有的方向(4方向还是8方向?
    setDirectionMode?(dirMode);//todo 设置棋盘方向
    allDirections:number[];
    halfDirections:number[];
    saveOrigin();
    restoreOrigin();
    getNeighborTileX(tileX:number, tileY:number, dir:number);
    getNeighborTileY(tileX:number, tileY:number, dir:number);
    getNeighborTileDirection(srcTileXY:cc.Vec2, neighborTileXY:cc.Vec2);
    getOppositeDirection(tileX, tileY, direction);
    offset(srcTile:cc.Vec2, offsetTileXY:number, offsetTileY:number, out:any);
    rotate(srcTile:cc.Vec2, direction:number, out:any);
    getDistance(tileA:cc.Vec2, tileB:cc.Vec2, roughMode:boolean);
    directionBetween(tileA:cc.Vec2, tileB:cc.Vec2);
    directionNormalize(direction);
    getGridPoints(tileX:number, tileY:number, points:any);
    ringToTileXYArray(centerTileXY:cc.Vec2, radius:number, out:any);
    getWorldXY(tileX:number, tileY:number, out:any);
    getTileXY(worldX:number, worldY:number, out:any);

}

/**
 * 棋盘 Grid 的配置参数
 */
export interface IBoardGridConfig {
    x:number
    y:number
    cellWidth:number
    cellHeight:number
    gridType:GRID_TYPE;
    orientation:ORIENTATION_TYPE
    dir?:QUAD_DIR_MODE
    staggerAxis?:GRID_STAGGER_AXIS
    staggerIndex?:GRID_STAGGER_INDEX
}

/**
 * 棋盘形状的基础接口
 */
export interface IBoardShapeBase{
    x:number;
    y:number;
    mode:ORIENTATION_TYPE;
    setOriginPosition(x, y)
    setCellSize(width, height)
    height:number;
    width:number;
    cellWidth:number;
    cellHeight:number;
    setType(type);
    getWorldXY(tileX:number, tileY:number, out):cc.Vec2
    getTileXY(worldX:number, worldY:number, out):cc.Vec2
}

/**
 * 棋盘Board 接口
 */
export interface IBoard {
    getChessData()
    getChessUID()

    setBoardWidth()
    setBoardHeight()


    tileXYToWorldXY()
    worldXYToTileXY()

    worldXYSnapToGrid()
    angleBetween()
    angleToward()
    isOverlappingPoint()
    gridAlign()
    lineToTileXYArray()

    uidToChess()
    addChess()
    removeChess()
    removeAllChess()
    swapChess()
    moveChess()
    getAllChess()

    contains()
    forEachTileXY()
    getWrapTileX()
    getWrapTileY()
    tileXYZToChess()
    tileXYToChessArray()
    tileZToChessArray()
    tileXYArrayToChess()
    chessToTileXYZ()
    offset()
    rotate()
    getOppositeDirection()
    getDistance()
    directionBetween()
    fit()

    getEmptyTileXYArray()
    getRandomEmptyTileXY()
    getNeighborTileXY()
    getNeighborChess()
    getNeighborTileDirection()
    getNeighborChessDirection()
    areNeighbors()

    ringToTileXYArray()

    hasBlocker()
    hasEdgeBlocker()

    setInteractive()

    getGridPoints()
}