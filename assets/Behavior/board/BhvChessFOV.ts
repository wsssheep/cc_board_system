import BhvChess from "./BhvChess";
import { BOARD_DIRECTION } from "./utils/convert";


const {ccclass, property} = cc._decorator;

/**视线模式 */
enum CONE_MODE {
    DIRECTION,
    ANGLE,
};

// special cost
const BLOCKER =  null;
// special moving point
const INFINITY = Infinity;
//线段偏移值
const LINE_OFFSET = 0.001;

//缓存使用数组
const globTileXYArray0 = [];
const globTileXYArray1 = [];
const globRing = [];

/**
 * FieldOfView 视野行为 
 */
@ccclass
export default class BhvChessFOV extends cc.Component {

    coneMode:CONE_MODE = 0;
    occupiedTest:boolean = false;
    blockerTest:boolean = false;
    edgeBlockerTest:boolean = false;
    costCallback:((curTileXY:cc.Vec2,FOV:BhvChessFOV)=>number)|number;
    debugLog:boolean = false;
    debugGraphics:cc.Graphics = null;

    @property
    debugVisibleLineColor:cc.Color = cc.color(0,255,0);

    @property
    debugInvisibleLineColor:cc.Color = cc.color(255,0,0);

    chessData:BhvChess;

    faceAngle: any;

    onLoad(){
        this.chessData = this.getComponent(BhvChess);
    }

    onDestroy() {
        this.chessData = undefined;
    }

    _face:BOARD_DIRECTION = 0;
    get face():BOARD_DIRECTION {
        return this._face;
    }
    set face(direction:BOARD_DIRECTION) {
        direction = this.board.grid.directionNormalize(direction);
        this._face = direction;
        if (this.coneMode === 0) { // Direction
            // Do nothing
        } else { // Angle
            let angle = this.board.angleToward(cc.v2(this.chessData.tileXYZ.x,this.chessData.tileXYZ.y), direction); // -PI~PI
            angle = angle % (2 * Math.PI);
            if(angle<0)angle+= 2*Math.PI;
            this.faceAngle = angle; // 0~2PI
        }
    }

    setFace(direction) {
        this.face = direction;
        return this;
    }

    _cone =0;
    halfConeRad = 0;
    get cone() {
        return this._cone;
    }

    set cone(value) {
        this._cone = value;

        if (value !== undefined) {
            if (this.coneMode === 0) { // Direction
                this.halfConeRad = value / 2;
            } else { // Angle
                this.halfConeRad = cc.misc.degreesToRadians(value / 2);
            }
        }
    }

    setCostFunction(callback) {
        this.costCallback = callback;
    }

    clearDebugGraphics() {
        if (this.debugGraphics) {
            this.debugGraphics.clear();
        }
        return this;
    }

    get BLOCKER() {
        return BLOCKER;
    }

    get INFINITY() {
        return INFINITY;
    }

    get board() {
        return this.chessData.board;
    }

    /**
     * 获取当前的棋子位置的消费点数
     * @param curTileXY 
     */
    public getCost(curTileXY:cc.Vec2):number{
        //  出界检测 / Occupied test
        if (this.occupiedTest) {
            if (this.board.contains(curTileXY.x, curTileXY.y, this.chessData.tileXYZ.z)) {
                return BLOCKER;
            }
        }
        //  可通行检测/Blocker test
        if (this.blockerTest) {
            if (this.board.hasBlocker(curTileXY.x, curTileXY.y)) {
                return BLOCKER;
            }
        }
        // 通行方向检测 /  Edge-blocker test
        if (this.edgeBlockerTest) {
            // TODO 暂不支持边界判定
            // if(this.board.hasEdgeBlocker(curTileXY.x,curTileXY.y))
        }

        if (typeof (this.costCallback) === 'number') {
            return this.costCallback;
        }else{
            return this.costCallback(curTileXY,this);
        }
   
    }


    public isInCone(targetTileXY:cc.Vec2){
        if (this.cone === undefined) {
            return true;
        }
        let board = this.board;
        let myTileXY = this.chessData.tileXY; //myTileXYZ
        if (this.coneMode === 0) { // Direction
            let grid = board.grid;
            let targetDirection = grid.directionBetween(myTileXY, targetTileXY);
            let deltaDirection = Math.abs(targetDirection - this.face);
            deltaDirection = Math.min(deltaDirection, grid.directions - deltaDirection);
            return (deltaDirection <= this.halfConeRad);
        } else { // Angle
            let targetAngle = board.angleBetween(myTileXY, targetTileXY); // -PI~PI
            targetAngle = targetAngle % (2 * Math.PI); // 0~2PI
            if(targetAngle<0)targetAngle += 2*Math.PI;
            let deltaAngle = Math.abs(targetAngle - this.faceAngle);
            deltaAngle = Math.min(deltaAngle, Math.PI*2 - deltaAngle);

            return Math.abs(deltaAngle -this.halfConeRad)<=0.0001 || (deltaAngle < this.halfConeRad);
        }
    }

   
    /**
     * 判断路径是否可视,
     * @param tileXYArray - 路径是否可见
     * @param visiblePoints -  可以设置0 或者 Infinity,可视点数 
     */
    public isPathVisible(tileXYArray:cc.Vec2[], visiblePoints:number){
        let myTileXY = this.chessData.tileXY;//tileXYZ
        let tileXY, cost;
        for (let i = 1, cnt = tileXYArray.length; i < cnt; i++) {
            tileXY = tileXYArray[i];
            if (myTileXY.equals(tileXY)) {
                continue;
            }

            cost = this.getCost(tileXY);
            if (cost === BLOCKER) {
                return false;
            }

            if (visiblePoints !== INFINITY) {
                visiblePoints -= cost;
                if (visiblePoints < 0) {
                    return false;
                }
            }
        }
        return true;
    }


    public isInLOS(node:cc.Node, visiblePoints:number):boolean
    public isInLOS(uid:string|number, visiblePoints:number):boolean
    public isInLOS(chess:any, visiblePoints:number):boolean{
            // chess: chess object or tileXY
            if ((visiblePoints !== INFINITY) && (visiblePoints <= 0)) {
                return false;
            }

            let board = this.board;
            let targetTileXY = board.chessToTileXY(chess);
            if (!this.isInCone(targetTileXY)) {
                return false;
            }

            let myTileXYZ = this.chessData.tileXYZ;
            if (this.debugLog) {
                console.log('Visible test from (' + myTileXYZ.x + ',' + myTileXYZ.y + ') to (' + targetTileXY.x + ',' + targetTileXY.y + ')');
            }

            let start = board.tileXYToWorldXY(myTileXYZ.x, myTileXYZ.y, true);
            let startX = start.x,
                startY = start.y;

            let end = board.tileXYToWorldXY(targetTileXY.x, targetTileXY.y, true);
            let endX = end.x,
                endY = end.y;

            let lineAngle = Math.atan2(endY - startY, endX-startX),
                offsetX, offsetY, isVisible;

            // Shift a small distance
            lineAngle += (Math.PI / 2);
            offsetX = LINE_OFFSET * Math.cos(lineAngle);
            offsetY = LINE_OFFSET * Math.sin(lineAngle);
            let x0 = startX + offsetX,
                y0 = startY + offsetY,
                x1 = endX + offsetX,
                y1 = endY + offsetY;
            board.lineToTileXYArray(cc.v2(x0, y0), cc.v2(x1, y1), globTileXYArray0);
            if (this.debugLog) {
                console.log('Line 0: ' + JSON.stringify(globTileXYArray0));
            }
            isVisible = this.isPathVisible(globTileXYArray0, visiblePoints);
            if (isVisible) {
                globTileXYArray0.length = 0;
                if (this.debugGraphics) {
                    this.debugGraphics.lineWidth =1;
                    this.debugGraphics.strokeColor = this.debugVisibleLineColor;
                    this.debugGraphics.moveTo(startX,startY);
                    this.debugGraphics.lineTo(endX,endY);
                }
                return true;
            }

            // Shift a small distance
            lineAngle += Math.PI;
            offsetX = LINE_OFFSET * Math.cos(lineAngle);
            offsetY = LINE_OFFSET * Math.sin(lineAngle);
                x0 = startX + offsetX,
                y0 = startY + offsetY,
                x1 = endX + offsetX,
                y1 = endY + offsetY;
            board.lineToTileXYArray(cc.v2(x0, y0,),cc.v2(x1, y1), globTileXYArray1);
            if (this.debugLog) {
                console.log('Line 1: ' + JSON.stringify(globTileXYArray1));
                this.debugGraphics.moveTo(x0, y0);
                this.debugGraphics.lineTo(x1, y1);
            }
            // No need do visible checking if path is the same as previous one
            if (!this.areTileXYArrayEqual(globTileXYArray0, globTileXYArray1)) {
                isVisible = this.isPathVisible(globTileXYArray1, visiblePoints);
            }
            globTileXYArray0.length = 0;
            globTileXYArray1.length = 0;
            if (this.debugGraphics) {
                let color = (isVisible) ? this.debugVisibleLineColor : this.debugInvisibleLineColor;
                this.debugGraphics.lineWidth =1;
                this.debugGraphics.strokeColor = color;
                this.debugGraphics.moveTo(startX,startY);
                this.debugGraphics.lineTo(endX,endY);
            }
            return isVisible;
    }

    /**两个tile 数组是否相等 */
    private areTileXYArrayEqual(tileArrayA:cc.Vec2[], tileArrayB:cc.Vec2[]) {
        if (tileArrayA.length !== tileArrayB.length) {
            return false;
        } else {
            for (let i = 0, cnt = tileArrayA.length; i < cnt; i++) {
                if (tileArrayA[i].x === tileArrayB[i].x && tileArrayA[i].y === tileArrayB[i].y) {
                    return false;
                }
            }
            return true;
        }
    }

    public LOS(nodeArray:cc.Node[], visiblePoints:number, out?)
    public LOS(uidArray:number[]|string[], visiblePoints:number, out?)
    public LOS(node:cc.Node, visiblePoints:number, out?)
    public LOS(uid:number|string, visiblePoints:number, out?)
    public LOS(chessArray:any, visiblePoints:number, out =[]):any{
    // chessArray: array of chess object or tileXY
    if (!Array.isArray(chessArray)) {
        let chess = chessArray;
        return this.isInLOS(chess, visiblePoints);
    } else {
        let chess;
        for (let i = 0, cnt = chessArray.length; i < cnt; i++) {
            chess = chessArray[i];
            //不在视线范围内，跳过
            if (!this.isInLOS(chess, visiblePoints)) {
                continue;
            }
            out.push(chess)
        }
        return out;
    }
    }

    public findFOV(visiblePoints:number, out = []):cc.Vec2[]{

        let board = this.board;
        let myTileXY = this.chessData.tileXY;
        let isAnyVisible, radius = 0,
            targetTileXY;
            
        do {
            isAnyVisible = false;
            radius++;
            board.ringToTileXYArray(myTileXY, radius, globRing);
            for (let i = 0, cnt = globRing.length; i < cnt; i++) {
                targetTileXY = globRing[i];
                if (this.isInLOS(targetTileXY, visiblePoints)) {
                    isAnyVisible = true;
                    out.push(targetTileXY);
                }
            }
            globRing.length = 0;
        } while (isAnyVisible)
    
        return out;
    }


}
