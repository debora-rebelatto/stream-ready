Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, { configurable: true, 
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get addCuratedListToUser () {
        return addCuratedListToUser;
    },
    get curatedListsService () {
        return curatedListsService;
    },
    get default () {
        return _default;
    },
    get getCuratedListById () {
        return getCuratedListById;
    },
    get getCuratedLists () {
        return getCuratedLists;
    },
    get loadCuratedListsData () {
        return loadCuratedListsData;
    }
});
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const db = require('./db');
const curatedDataRaw = require('./curatedListsData.json');
function loadCuratedListsData() {
    try {
        const dir = typeof __dirname !== 'undefined' ? __dirname : _path.default.resolve('lib');
        const dataPath = _path.default.join(dir, 'curatedListsData.json');
        if (_fs.default.existsSync(dataPath)) {
            const content = _fs.default.readFileSync(dataPath, 'utf8');
            return JSON.parse(content);
        }
    } catch  {
    // fallback
    }
    return Array.isArray(curatedDataRaw) ? curatedDataRaw : [];
}
function getCuratedLists(userCustomLists) {
    const lists = loadCuratedListsData();
    const existingNames = new Set((userCustomLists || []).map((l)=>(l.name || '').trim().toLowerCase()));
    return lists.map((l)=>({
            ...l,
            itemsCount: l.items ? l.items.length : 0,
            isAdded: existingNames.has((l.name || '').trim().toLowerCase())
        }));
}
function getCuratedListById(id) {
    const lists = loadCuratedListsData();
    return lists.find((l)=>l.id === id) || null;
}
async function addCuratedListToUser(userId, listId, database = db, checkMovieQualityFn) {
    if (!userId) {
        throw new Error('User identifier is required');
    }
    const curated = getCuratedListById(listId);
    if (!curated) {
        throw new Error(`Curated list with ID "${listId}" not found`);
    }
    const userLists = database.getCustomLists(userId) || [];
    let targetList = userLists.find((l)=>(l.name || '').trim().toLowerCase() === curated.name.trim().toLowerCase());
    if (!targetList) {
        targetList = await database.createCustomList(userId, {
            name: curated.name,
            emoji: curated.emoji || ''
        });
    }
    const targetListId = targetList.id;
    let addedMoviesCount = 0;
    let existingMoviesCount = 0;
    const operations = [];
    for (const item of curated.items){
        const existing = database.getItem(item.id, userId);
        if (existing) {
            existingMoviesCount++;
            const currentCustomLists = Array.isArray(existing.customLists) ? [
                ...existing.customLists
            ] : [];
            if (!currentCustomLists.includes(targetListId)) {
                currentCustomLists.push(targetListId);
                operations.push(Promise.resolve(database.updateItem(item.id, {
                    customLists: currentCustomLists
                }, userId)));
            }
        } else {
            addedMoviesCount++;
            const newItem = {
                id: item.id,
                type: 'movie',
                name: item.name,
                year: item.year,
                poster: item.poster,
                banner: item.banner,
                genres: item.genres || [],
                description: item.description || '',
                imdbRating: item.imdbRating ? String(item.imdbRating) : '',
                has1080pPlus: false,
                bestQuality: 'Pending',
                streamCount: 0,
                customLists: [
                    targetListId
                ]
            };
            operations.push(Promise.resolve(database.addItem(newItem, userId)).then(()=>{
                if (typeof checkMovieQualityFn === 'function') {
                    checkMovieQualityFn(item.id, 'movie', item.name).then((q)=>{
                        if (q) {
                            database.updateItem(item.id, {
                                has1080pPlus: q.has1080pPlus,
                                bestQuality: q.bestQuality,
                                streamCount: q.streamCount,
                                lastChecked: q.checkedAt
                            }, userId);
                        }
                    }).catch(()=>{});
                }
            }));
        }
    }
    // Execute all item insertions and updates in parallel for fast response
    if (operations.length > 0) {
        await Promise.all(operations);
    }
    return {
        success: true,
        list: {
            ...targetList,
            itemsCount: (targetList.itemsCount || 0) + addedMoviesCount
        },
        addedMoviesCount,
        existingMoviesCount
    };
}
const curatedListsService = {
    loadCuratedListsData,
    getCuratedLists,
    getCuratedListById,
    addCuratedListToUser
};
const _default = curatedListsService;
