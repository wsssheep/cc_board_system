
/**
 *  用于棋盘转换的函数
 */


export const OrthogonalMap = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1]
];
export const IsometricMap = OrthogonalMap;
export const StaggeredMap = [
    [
        [0, 1],
        [-1, 1],
        [-1, -1],
        [0, -1],
        [0, 2],
        [-1, 0],
        [0, -2],
        [1, 0]
    ],
    [
        [1, 1],
        [0, 1],
        [0, -1],
        [1, -1],
        [0, 2],
        [-1, 0],
        [0, -2],
        [1, 0]
    ]
];

//反转地图方向
const ReverseDirMap = function (dirMap) {
    var out = {},
        entry, x, y;
    for (var dir in dirMap) {
        entry = dirMap[dir]; // [x, y]
        x = entry[0];
        y = entry[1];
        if (!out.hasOwnProperty(x)) {
            out[x] = {}
        }
        out[x][y] = parseInt(dir);
    }
    return out;
}

export const OrthogonalMapOut = ReverseDirMap(OrthogonalMap);
export const IsometricMapOut = OrthogonalMapOut;
export const StaggeredMapOut = [
    ReverseDirMap(StaggeredMap[0]),
    ReverseDirMap(StaggeredMap[1])
];




/**
 * 棋盘的方向,只会获得 0~7 范围的整数
 * 如果是QUAD类型棋盘，使用枚举值 BOARD_DIR.QUAD 获取准确方向
 * 如果是HEX 棋盘类型，使用枚举值 BOARD_DIR.HEX_Y 或者 BOARD_DIR.HEX_X 获取准确方向
 */
export type BOARD_DIRECTION = 0|1|2|3|4|5|6|7;



enum BOARD_DIR_QUAD {
    LEFT,
    DOWN,
    RIGHT,
    UP,
    LEFT_DOWN,
    DOWN_RIGHT,
    Right_UP,
    UP_LEFT
}

enum BOARD_DIR_HEX_Y {
    DOWN_RIGHT,
    DOWN,
    DOWN_LEFT,
    UP_LEFT,
    UP,
    UP_RIGHT
}

enum BOARD_DIR_HEX_X {
    RIGHT,
    DOWN_RIGHT,
    DOWN_LEFT,
    LEFT,
    UP_LEFT,
    UP_RIGHT
}



export enum GRID_TYPE {
    QUAD,
    HEXAGON
}


/**棋盘方向确定 */
export let BOARD_DIR ={
    QUAD :BOARD_DIR_QUAD,
    HEX_Y:BOARD_DIR_HEX_Y,
    HEX_X:BOARD_DIR_HEX_X,
}

export enum ORIENTATION_TYPE {
    /**正交类型 */
    ORTHOGONAL,
    /**斜角类型 */
    ISOMETRIC,
    /**交错类型 */
    STAGGERED
};


export enum BOARD_MIRROR_MODE {
    NONE =0,
    X = 1,
    Y = 2,
    XY = 3
}


export enum GRID_STAGGER_AXIS {
    Y,
    X
}

export enum GRID_STAGGER_INDEX {
    ODD,
    EVEN
}


export enum QUAD_DIR_MODE {
    DIR4 =4,
    DIR8 =8
}