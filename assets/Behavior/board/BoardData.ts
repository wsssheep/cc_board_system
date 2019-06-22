

const Clear = function(obj){
    if (Array.isArray(obj)) {
        obj.length = 0;
    } else {
        for (let key in obj) {
            delete obj[key];
        }
    }
}

const IsEmpty = function (source) {
    for (let k in source) {
        return false;
    }
    return true;
};



/**
 * 保存棋盘数据的接口
 */
export default class BoardData {
    constructor() {
        this.XYZToUID = {}; // [x][y][z] : uid
        this.UIDToXYZ = {}; // uid : xyz
        this.reset();
    }

    private _xMax:number = 0;
    private _xMin:number = 0;
    private _yMax:number = 0;
    private _yMin:number = 0;
    XYZToUID:any = {};
    UIDToXYZ:any = {};

    chessCount:number = 0;

    destroy() {
        this.XYZToUID = undefined;
        this.UIDToXYZ = undefined;
    }

    reset() {
        this.removeAll();
    }

    clearBounds() {
        this._xMax = undefined;
        this._xMin = undefined;
        this._yMax = undefined;
        this._yMin = undefined;
    }

    removeAll() {
        Clear(this.UIDToXYZ);
        Clear(this.XYZToUID);
        this.chessCount = 0;
        this.clearBounds();
    }

    addUID(uid, x, y, z) {
        if (!this.XYZToUID.hasOwnProperty(x)) {
            this.XYZToUID[x] = {};
        }
        let tmpx = this.XYZToUID[x];
        if (!tmpx.hasOwnProperty(y)) {
            tmpx[y] = {};
        }
        let tmpy = tmpx[y];
        tmpy[z] = uid;
        this.UIDToXYZ[uid] = {
            x: x,
            y: y,
            z: z
        };

        this.chessCount++;
        this.clearBounds();
    }

    getUID(x, y, z):number;
    getUID(x, y):object;
    /**@returns (x,y,z) -> uid */
    /**@returns (x,y) -> zHash = {z:uid} */
    getUID(x, y,z?):any {
        let tmp = this.XYZToUID[x];
        if (tmp) {
            tmp = tmp[y];
            if (tmp) {
                if (z !== null && z !== undefined) {
                    tmp = tmp[z];
                }
            }
        }
        return tmp;
    }

    removeUID(x, y, z) {
        if (!this.XYZToUID.hasOwnProperty(x)) {
            return;
        }
        let tmpx = this.XYZToUID[x];
        if (!tmpx.hasOwnProperty(y)) {
            return;
        }
        let tmpy = tmpx[y];
        if (!tmpy.hasOwnProperty(z)) {
            return;
        }

        let uid = tmpy[z];
        delete tmpy[z];
        delete this.UIDToXYZ[uid];
        if (IsEmpty(tmpy)) {
            delete tmpx[y];
        }
        if (IsEmpty(tmpx)) {
            delete this.XYZToUID[x];
        }

        this.chessCount--;
        this.clearBounds();
        return;
    }

    exists(uid:number|string):boolean {
        return this.UIDToXYZ.hasOwnProperty(uid);
    }

    /**返回一个当前xy位置的 z hash表 */
    contains(x, y):object 
    /**返回一个 UID */
    contains(x, y, z):number 
    contains(x, y, z?):any {
        return (this.getUID(x, y, z) != null);
    }

    getXYZ(uid:number|string):cc.Vec3 {
        if (this.exists(uid)) {
            return this.UIDToXYZ[uid];
        }
        return null;
    }

    get xMax():number {
        if (this._xMax === undefined) {
            this._xMax = -Infinity;
            let UIDToXYZ = this.UIDToXYZ,
                x;
            for (let uid in UIDToXYZ) {
                x = UIDToXYZ[uid].x;
                if (this._xMax < x) {
                    this._xMax = x;
                }
            }
        }

        return this._xMax;
    }

    get xMin():number {
        if (this._xMin === undefined) {
            this._xMin = Infinity;
            let UIDToXYZ = this.UIDToXYZ,
                x;
            for (let uid in UIDToXYZ) {
                x = UIDToXYZ[uid].x;
                if (this._xMin > x) {
                    this._xMin = x;
                }
            }
        }

        return this._xMin;
    }

    get yMax():number {
        if (this._yMax === undefined) {
            this._yMax = -Infinity;
            let UIDToXYZ = this.UIDToXYZ,
                y;
            for (let uid in UIDToXYZ) {
                y = UIDToXYZ[uid].y;
                if (this._yMax < y) {
                    this._yMax = y;
                }
            }
        }

        return this._yMax;
    }

    get yMin():number {
        if (this._yMin === undefined) {
            this._yMin = Infinity;
            let UIDToXYZ = this.UIDToXYZ,
                y;
            for (let uid in UIDToXYZ) {
                y = UIDToXYZ[uid].y;
                if (this._yMin > y) {
                    this._yMin = y;
                }
            }
        }

        return this._yMin;
    }
}


