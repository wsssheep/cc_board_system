import { ORIENTATION_TYPE } from "../Quad";


//用于设置棋盘点位置的函数


/**
 * 设置棋盘点位置
 * @param x - 棋盘x
 * @param y - 棋盘y
 * @param width - 棋子宽
 * @param height - 棋子高
 * @param type - 棋盘类型
 * @param points - 棋盘输出点
 */
export function setPoints (x, y, width, height, type:ORIENTATION_TYPE, points:cc.Vec2[]):cc.Vec2[]{
    if (points === undefined) {
        points = initPoints(4);
    }

    var halfW = width / 2;
    var halfH = height / 2;

    if (type === ORIENTATION_TYPE.ORTHOGONAL) { // rectangle
        // top-right
        points[0].x = x + halfW;
        points[0].y = y - halfH;
        // bottom-right
        points[1].x = x + halfW;
        points[1].y = y + halfH;
        // bottom-left
        points[2].x = x - halfW;
        points[2].y = y + halfH;
        // top-left
        points[3].x = x - halfW;
        points[3].y = y - halfH;
    } else { // rhombus
        // 0
        points[0].x = x + halfW;
        points[0].y = y;
        // 90
        points[1].x = x;
        points[1].y = y + halfH;
        // 180
        points[2].x = x - halfW;
        points[2].y = y;
        // 270
        points[3].x = x;
        points[3].y = y - halfH;
    }
    return points;
}

/**
 * 棋盘初始化 点坐标
 * @param count 
 */
export function initPoints (count:number):cc.Vec2[]{
    var points = [];
    for (var i = 0; i < count; i++) {
        points.push(cc.v2(0,0));
    }
    return points;
}