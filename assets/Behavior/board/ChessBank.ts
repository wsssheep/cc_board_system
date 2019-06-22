
/**
 * 保存逻辑棋子的 UID库存, 管理棋盘上棋子的添加和移除
 * 必须拥有同一个组件
 */
export  class UIDBank {
    constructor(config?:IChessBankConfig) {
        if(!config)return;
        
        if(typeof config.start === 'number'){
            this.nextId = config.start;
        }

        if(typeof config.uidKey === 'string'){
            this.uidKey = config.uidKey;
        }

        if(typeof config.component === 'string'){
            this.uidKey = config.component;
        }

        if(typeof config.autoRemove === 'boolean'){
            this.autoRemove = config.autoRemove; 
        }
    }

    nextId:number = 1;
    uidKey:string = "_uid";
    componentName:string = "BhvChess";
    autoRemove:boolean = true;
    refs:any = {}; //保存 uid 的引用
    count:number =0;

    static instance:UIDBank  = null;

    add(chessNode:cc.Node, uid?:number|string):number|string {
        let refs = this.refs;
        let uidKey = this.uidKey;

        //已经写入 uid 的棋子不能添加进来
        if (uidKey) {
            let uid = this.getChessUID(chessNode);
            if (uid != null)return;
        }

        //uid 不存在就自动搜索递增到可用空位的 uid
        if (uid == null) {
            do {
                uid = this.nextId;
                this.nextId++;
            } while (refs.hasOwnProperty(uid))
        }

        //uid 未被占用，可以将节点保存进去
        if (!refs.hasOwnProperty(uid)) {
            refs[uid] = chessNode;
            this.count++;
            if (uidKey) {
                chessNode[uidKey] = uid;
            }
            if (this.autoRemove && chessNode.on) {
                //todo 需要添加监听回调，方便自动从ChessBank 中移除uid
                // chessNode.on('destroy', function () {
                //     this.remove(uid);
                // }, this)
            }
        } else {
            uid = null;
        }

        return uid;

    }

    addMultiple(objects:cc.Node[]):number[] {
        let uidArr =[];
        for (let i = 0, cnt = objects.length; i < cnt; i++) {
           let uid = this.add(objects[i]);
           uidArr.push(uid);
        }
        return uidArr;
    }

    /** 获得棋子节点 */
    get(uid:number|string):cc.Node {
        return this.refs[uid];
    }

    /**获得棋子组件 */
    getChess(chessNode:cc.Node):any{
        return chessNode.getComponentInChildren(this.componentName);
    }

    /**获取棋子的UID */
    getChessUID(chessNode:cc.Node){
        let uidKey = this.uidKey;
        let comp = this.getChess(chessNode);
        if(comp == null)return;
        return comp[uidKey];
    }

    has(uid:number|string):boolean {
        return this.refs.hasOwnProperty(uid);
    }

    /**移除ChessBank (返回一个 node,你可以决定回收还是销毁) */
    remove(uid:number|string):cc.Node {
        let refs = this.refs;
        let chessNode:cc.Node;
        if (refs.hasOwnProperty(uid)) {
            if (this.uidKey) {
                chessNode = refs[uid];
                let comp = this.getChess(chessNode);
                if(comp)comp[this.uidKey] = undefined;
            }
            delete refs[uid];
            this.count--;
        }

        return chessNode;
    }

    /**遍历Chess Bank 中的 棋子节点 */
    forEach(callback:Function) {
        let refs = this.refs, chessNode:cc.Node;
        for (let uid in refs) {
            chessNode = refs[uid];
            callback(chessNode, uid);
        }
    }

    /**清理棋子储存 */
    clear() {
        this.forEach( (chessNode,uid)=>{
            this.remove(uid);
        });
    }
}

/**ChessBank 是一个单例，防止出现UID相同的棋子 */
export let ChessBank = new UIDBank({
    uidKey: '_uid',
    component:'BhvChess',
    autoRemove: false, // remove uid manually
});


interface IChessBankConfig {
    start?:number;
    uidKey?:string;
    component?:string;
    /**暂未支持 */
    autoRemove?:boolean;
}