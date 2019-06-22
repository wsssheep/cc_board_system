import Board from "./Board";
import { BOARD_DIRECTION } from "./utils/convert";

var globTileXY = {
    x: 0,
    y: 0
};


//todo 可以弄成插件形式
export default class BoardMatch {
    constructor(config) {
        this.setConfig(config);
    }

    public board:Board;
    private symbols = []; // tileX+(tileY*board.width) 记录符号的数组
    private dirMask = {}; //方向屏蔽，会屏蔽对应方向的匹配结果
    private wildcard;
    /**上次匹配 结果的缓存 */
    private _matchAtDirTemp:IBoardMatchRes =  {
        tileXY: [],
        direction: undefined,
        pattern: undefined
    };;

    setConfig(o) {
        this.setBoard( o.board||undefined);
        this.setWildcard(o.wildcard||undefined);

        let dirMask = o.dirMask||undefined;
        if (dirMask !== undefined) {
            this.setDirMask(dirMask);
        }
    }


    destroy() {
        this.board = undefined;
        this.symbols = undefined;
        this.dirMask = undefined;
    }

    setBoard(board:Board) {
        this.board = board;
        if (board) {
            this.clearSymbols();
        }
    }


    setDirMask(dir:number, value:number) 
    setDirMask(dir:object, value?) 
    setDirMask(dir:any, value?) {
        if (typeof dir === 'object') {
            let dirMask = dir;
            for (let d in dirMask) {
                this.dirMask[d] = dirMask[d];
            }
        } else {
            this.dirMask[dir] = value;
        }
    }

    /** 设置棋盘的方向 */
    setDirectionMode(mode) {
        this.board.grid.setDirectionMode(mode);
    }

    /**清空所有的符号 */
    clearSymbols() {
        this.refreshSymbols(null);
    }

    /**设置符号，接收一个字符串*/
    setSymbol(tileX:number, tileY:number, symbol:string) 
    /**设置符号， 设置一个函数返回字符串 */
    setSymbol(tileX:number, tileY:number, callback:(tileXY?:cc.Vec2,board?:Board)=>string) 
    setSymbol(tileX:number, tileY:number, callback:any) {
        let board = this.board;
        if (!board.contains(tileX, tileY)) {
            return;
        }
        let symbol;
        if (callback && typeof callback === 'function') {
            globTileXY.x = tileX;
            globTileXY.y = tileY;
            symbol = callback(globTileXY, board);
        } else {
            symbol = callback;
        }

        this.symbols[this.tileXYToKey(tileX, tileY)] = symbol;
    }

    /**获取棋盘位置上的符号 */
    getSymbol(tileX:number, tileY:number):string {
        return this.symbols[this.tileXYToKey(tileX, tileY)];
    }

    /**遍历所有符号 和 所对应的棋盘位置 */
    dumpSymbols(callback:(tileXY?:cc.Vec2,symbol?:string,board?:Board)=>void) {
        let board = this.board;
        let tileXY, symbol;
        for (let i = 0, cnt = this.symbols.length; i < cnt; i++) {
            symbol = this.symbols[i];
            tileXY = this.keyToTileXY(i);
            callback(tileXY, symbol, board);
        }
        return this;
    }


    /**刷新符号，接收一个字符串 */
    refreshSymbols(fillSymbol:string) 
    /**刷新符号，接收回调函数返回字符串 */
    refreshSymbols(callback:(tileXY?:cc.Vec2,board?:Board)=>string) 
    refreshSymbols(callback:any) {
        let board = this.board;
        let width = board.width,
            height = board.height;
        this.symbols.length = width * height;
        let symbol;
        if (callback && typeof callback === 'function') {
            // Get symbol by callback
            let tileXY;
            for (let i = 0, cnt = this.symbols.length; i < cnt; i++) {
                tileXY = this.keyToTileXY(i);
                symbol = callback(tileXY, board);
                this.symbols[i] = symbol;
            }

        } else {
            // Fill a given symbol
            symbol = callback;
            for (let i = 0, cnt = this.symbols.length; i < cnt; i++) {
                this.symbols[i] = symbol;
            }
        }

    }

    setWildcard(symbol:string) {
        this.wildcard = symbol;
        return this;
    }

    /**将棋盘坐标转换为 匹配符号的 key */
    tileXYToKey(tileX, tileY) {
        return tileX + (tileY * this.board.width);
    }

    /**将 匹配符号的 key 转换为棋盘的坐标 */
    keyToTileXY(key, out?:any):cc.Vec2 {
        if (out === undefined||out=== null) {
            out = cc.v2();
        }
        let width = this.board.width;
        out.x = key % width;
        out.y = Math.floor(key / width);
        return out;
    }

    /** 匹配任意一个图案 */
    anyMatch(pattern) {
        return this.match(pattern, null, true);
    }


    match(pattern, callback?:(result,board:Board)=>void, getFirst?:true)
    match(pattern, callback?:(result,board:Board)=>void, getFirst?:boolean) {
        // pattern: pattern list or repeat count
        let board = this.board,
            grid = board.grid;
        let directions = grid.halfDirections,
            dir,
            dirMask = this.dirMask;
        let width = board.width,
            height = board.height;
        let result;

        for (let i = 0, cnt = directions.length; i < cnt; i++) {
            dir = directions[i];
            if (dirMask[dir] === false) continue;
            for (let tileY = 0; tileY < height; tileY++) {
                for (let tileX = 0; tileX < width; tileX++) {
                    result = this.matchAtDir(pattern, tileX, tileY, dir);
                    if (result === false) continue;
                    if (callback) callback(result, board);
                    if (getFirst)  return result;
                }
            }
        }
    }

    matchAtDir(patternCount:number, startTileX:number, startTileY:number, direction:BOARD_DIRECTION) 
    matchAtDir(patternList:any[], startTileX:number, startTileY:number, direction:BOARD_DIRECTION)
    matchAtDir(pattern:any, startTileX:number, startTileY:number, direction:BOARD_DIRECTION) {
        //结果
        let result = this._matchAtDirTemp;

        // pattern: pattern list or repeat count
        let matchNMode = typeof (pattern) === 'number';
        let patternLength;
        if (matchNMode) {
            patternLength = pattern;
            pattern = null;
        } else {
            patternLength = pattern.length;
        }
    
        let symbol, wildcard = this.wildcard;
        let curTileXY;
        let board = this.board;
        let matchedTileXY = result.tileXY;
        matchedTileXY.length = 0;
        for (let i = 0; i < patternLength; i++) {
            if (curTileXY === undefined) {
                curTileXY = cc.v2(startTileX,startTileY)
            } else {
                // get next tileXY 
                curTileXY = board.getNeighborTileXY(curTileXY, direction, curTileXY);
                if (curTileXY === null) {
                    return false;
                }
            }
    
            symbol = this.getSymbol(curTileXY.x, curTileXY.y);
            if (symbol == null) {
                return false;
            }
            if (symbol !== wildcard) {
                if (matchNMode) {
                    if (pattern === null) {
                        pattern = symbol;
                    } else if (pattern !== symbol) {
                        return false;
                    }
                } else if (pattern[i] !== symbol) { // pattern list mode
                    return false;
                }
            }
    
            matchedTileXY.push(cc.v2(curTileXY.x,curTileXY.y));
        }
    
        result.direction = direction;
        result.pattern = pattern;
        return result;
    };
    
 

}


interface IBoardMatchRes {
    tileXY: cc.Vec2[],
    direction: BOARD_DIRECTION,
    pattern:any
}
