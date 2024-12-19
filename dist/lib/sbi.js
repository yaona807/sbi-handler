"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _SBI_instances, _SBI_browser, _SBI_page, _SBI_isLogin, _SBI_init, _SBI_move, _SBI_clickAnchor;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SBI = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const config_json_1 = __importDefault(require("../config/config.json"));
class SBI {
    constructor(userName, password) {
        _SBI_instances.add(this);
        this.userName = '';
        this.password = '';
        _SBI_browser.set(this, null);
        _SBI_page.set(this, null);
        this.userName = userName;
        this.password = password;
        __classPrivateFieldSet(this, _SBI_browser, null, "f");
        __classPrivateFieldSet(this, _SBI_page, null, "f");
    }
    async getPortfolio() {
        await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_init).call(this);
        if (!__classPrivateFieldGet(this, _SBI_page, "f")) {
            throw new Error('Unexpected error');
        }
        await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_move).call(this, config_json_1.default.url.home);
        await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_clickAnchor).call(this, config_json_1.default.selector.portfolio.button);
        return await __classPrivateFieldGet(this, _SBI_page, "f").evaluate((allTableSelector) => {
            const portfolio = {};
            try {
                document.querySelectorAll(allTableSelector).forEach((table) => {
                    let portfolioSecurity = {};
                    let labels = [];
                    let current = portfolioSecurity;
                    const trs = table.querySelectorAll('tr');
                    trs.forEach((tr, trIndex) => {
                        const tds = tr.querySelectorAll('td');
                        tds.forEach((td, tdIndex) => {
                            if (trIndex === 0 && td.textContent) {
                                // 有価証券の種類
                                portfolio[td.textContent] = portfolioSecurity;
                            }
                            else if (trIndex === 1 && td.textContent) {
                                // テーブルヘッダーのラベル
                                labels.push(td.textContent);
                            }
                            else if (trIndex % 2 === 0 && tdIndex === 0 && td.textContent) {
                                // 有価証券名
                                current = portfolioSecurity[td.textContent] = {};
                            }
                            else if (trIndex % 2 !== 0 && td.textContent && labels[tdIndex]) {
                                // 保有数などの数値
                                current[labels[tdIndex]] = Number(td.textContent.replace(/,/g, ''));
                            }
                        });
                        // 次の有価証券を処理するために1つ上の階層に移動
                        if (trIndex >= 2 && trIndex % 2 !== 0) {
                            current = portfolioSecurity;
                        }
                    });
                });
            }
            catch {
                throw new Error('UI structure has changed');
            }
            return portfolio;
        }, config_json_1.default.selector.portfolio.allTable);
    }
    async getIPO() {
        await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_init).call(this);
        if (!__classPrivateFieldGet(this, _SBI_page, "f")) {
            throw new Error('Unexpected error');
        }
        await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_move).call(this, config_json_1.default.url.home);
        await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_clickAnchor).call(this, config_json_1.default.selector.ipo.ipoAnchor);
        return await __classPrivateFieldGet(this, _SBI_page, "f").evaluate((header) => {
            const [ipoHeaderElem, poHeaderElem] = document.querySelectorAll(header);
            // IPOヘッダーとPOヘッダーの間にある要素を取得
            const targetElems = [];
            let nextElem = ipoHeaderElem?.nextElementSibling;
            while (nextElem && nextElem !== poHeaderElem) {
                targetElems.push(nextElem);
                nextElem = nextElem.nextElementSibling;
            }
            // 不要な要素を除外して、テキストを抽出
            const th_list = targetElems
                .map((targetElem) => Array.from(targetElem.querySelectorAll('th')).map((th) => th.textContent))
                .flat()
                .filter((text) => !/目論見書/.test(text || ''));
            const td_list = targetElems
                .map((targetElem) => Array.from(targetElem.querySelectorAll('th + td')).map((td) => td.textContent))
                .flat();
            const ipoInfo = {};
            const total = th_list.length - td_list.length;
            const th_num = td_list.length / total;
            let current = {};
            th_list.forEach((th, th_index) => {
                if (!th) {
                    return;
                }
                // 企業名の場合は初期化
                if (th_index % (th_num + 1) === 0) {
                    ipoInfo[th] = {};
                    current = ipoInfo[th];
                    return;
                }
                if (Object.keys(current).length < th_num) {
                    current[th] = td_list.shift() || '';
                }
                else {
                    ipoInfo[th] = {};
                    current = ipoInfo[th];
                }
            });
            // 算出した合計値と異なる場合はUIが変更された可能性あり
            if (Object.keys(ipoInfo).length !== total) {
                throw new Error('UI structure has changed');
            }
            return ipoInfo;
        }, config_json_1.default.selector.ipo.header);
    }
    async getStockData(stockCode) {
        // 銘柄コードの確認
        // ※厳密な仕様の確認は不要で、英数字4文字かの最低限の判定だけ実施
        if (!/^[!-~]{4}$/.test(stockCode)) {
            throw new Error('Invalid stockCode');
        }
        await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_init).call(this);
        if (!__classPrivateFieldGet(this, _SBI_page, "f")) {
            throw new Error('Unexpected error');
        }
        await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_move).call(this, config_json_1.default.url.home);
        // 銘柄検索
        await __classPrivateFieldGet(this, _SBI_page, "f").type(config_json_1.default.selector.stock.searchInput, stockCode);
        await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_clickAnchor).call(this, config_json_1.default.selector.stock.searchButton);
        // 株価情報の抽出
        return await __classPrivateFieldGet(this, _SBI_page, "f").evaluate((stockDataSelector) => {
            const stockName = document.querySelector(stockDataSelector.name)?.textContent?.trim();
            const currentValue = document
                .querySelector(stockDataSelector.status)
                ?.textContent?.trim()
                .split('\n')[1]
                ?.trim()
                ?.replace(',', '')
                ?.match(/\d{0,}\.*\d{0,}/)
                ?.shift();
            const stockDataList = document
                .querySelector(stockDataSelector.stockDataTable)
                ?.textContent?.trim()
                .split('\n')
                .filter((d) => !!d);
            if (typeof stockName !== 'string' ||
                typeof currentValue !== 'string' ||
                !(stockDataList instanceof Array) ||
                stockDataList.length === 0) {
                throw new Error('UI structure has changed');
            }
            const stockData = {
                現在値: currentValue,
            };
            for (let i = 0; i < stockDataList.length; i += 2) {
                const key = stockDataList[i];
                const value = stockDataList[i + 1];
                if (key == null || value == null) {
                    continue;
                }
                // valueから先頭の数値部分のみを抽出
                stockData[key] = value.replace(/\s*\((\d{0,}|:|\/)*\)/g, '');
            }
            // 数値文字列をNumber型へ変換
            Object.keys(stockData).forEach((key) => {
                if (typeof stockData[key] !== 'string') {
                    return;
                }
                stockData[key] = Number(stockData[key]
                    .replace(/,/g, '')
                    .replace(/\s*\(千円\)/, '000')
                    .replace(/\s*\(万円\)/, '0000'));
            });
            // 数値情報以外を追加
            stockData['銘柄名'] = stockName;
            return stockData;
        }, config_json_1.default.selector.stock.stockData);
    }
    async close() {
        if (!__classPrivateFieldGet(this, _SBI_browser, "f")) {
            return;
        }
        await __classPrivateFieldGet(this, _SBI_browser, "f").close();
    }
}
exports.SBI = SBI;
_SBI_browser = new WeakMap(), _SBI_page = new WeakMap(), _SBI_instances = new WeakSet(), _SBI_isLogin = async function _SBI_isLogin() {
    if (!__classPrivateFieldGet(this, _SBI_page, "f")) {
        return false;
    }
    return await Promise.all([
        __classPrivateFieldGet(this, _SBI_page, "f").$(config_json_1.default.selector.login.userName),
        __classPrivateFieldGet(this, _SBI_page, "f").$(config_json_1.default.selector.login.password),
    ]).then((elems) => elems.filter((elem) => elem).length === 0);
}, _SBI_init = async function _SBI_init() {
    __classPrivateFieldSet(this, _SBI_browser, __classPrivateFieldGet(this, _SBI_browser, "f") || (await puppeteer_1.default.launch({ headless: 'shell' })), "f");
    __classPrivateFieldSet(this, _SBI_page, __classPrivateFieldGet(this, _SBI_page, "f") || (await __classPrivateFieldGet(this, _SBI_browser, "f").newPage()), "f");
    await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_move).call(this, config_json_1.default.url.home);
    if (await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_isLogin).call(this)) {
        return;
    }
    await __classPrivateFieldGet(this, _SBI_page, "f").setViewport({ width: config_json_1.default.viewport.width, height: config_json_1.default.viewport.height });
    await __classPrivateFieldGet(this, _SBI_page, "f").type(config_json_1.default.selector.login.userName, this.userName);
    await __classPrivateFieldGet(this, _SBI_page, "f").type(config_json_1.default.selector.login.password, this.password);
    await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_clickAnchor).call(this, config_json_1.default.selector.login.loginButton);
    if (!(await __classPrivateFieldGet(this, _SBI_instances, "m", _SBI_isLogin).call(this))) {
        throw new Error('Invalid userName or password');
    }
    return;
}, _SBI_move = async function _SBI_move(url) {
    if (!__classPrivateFieldGet(this, _SBI_page, "f")) {
        return;
    }
    await __classPrivateFieldGet(this, _SBI_page, "f").goto(url, {
        waitUntil: ['load', 'networkidle0'],
    });
    return;
}, _SBI_clickAnchor = async function _SBI_clickAnchor(selector) {
    if (!__classPrivateFieldGet(this, _SBI_page, "f")) {
        throw new Error('Unexpected error');
    }
    await Promise.all([
        __classPrivateFieldGet(this, _SBI_page, "f").waitForNavigation({ waitUntil: ['load', 'networkidle0'] }),
        __classPrivateFieldGet(this, _SBI_page, "f").locator(selector).click(),
    ]);
    return;
};
