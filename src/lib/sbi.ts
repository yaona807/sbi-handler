import puppeteer, { Browser, Page } from 'puppeteer';
import config from '../config/config.json';

type PortfolioSecurity = {
    [K: string]: {
        [K: string]: number;
    };
};
type Portfolio = {
    [K: string]: PortfolioSecurity;
};

type IpoInfo = {
    [K: string]: {
        [K: string]: string;
    }
};

export class SBI {
    userName: string = '';
    password: string = '';
    #browser: Browser | null = null;
    #page: Page | null = null;

    constructor(userName: string, password: string) {
        this.userName = userName;
        this.password = password;
        this.#browser = null;
        this.#page = null;
    }
    async #isLogin(): Promise<boolean> {
        if (!this.#page) {
            return false;
        }

        return await Promise.all([
            this.#page.$(config.selector.login.userName),
            this.#page.$(config.selector.login.password)
        ]).then(elems => elems.filter(elem => elem).length === 0);
    }
    async #init(): Promise<void> {
        this.#browser = this.#browser || await puppeteer.launch({headless: 'shell'});
        this.#page = this.#page || await this.#browser.newPage();

        await this.#move(config.url.home);

        if (await this.#isLogin()) {
            return;
        }

        await this.#page.setViewport({width: config.viewport.width, height: config.viewport.height});

        await this.#page.type(config.selector.login.userName, this.userName);
        await this.#page.type(config.selector.login.password, this.password);

        await this.#clickAnchor(config.selector.login.loginButton);

        if (!(await this.#isLogin())) {
            throw new Error('Invalid userName or password');
        }

        return;
    }
    async #move(url: string): Promise<void> {
        if (!this.#page) {
            return;
        }

        await this.#page.goto(url, {
            waitUntil: ['load', 'networkidle0'],
        });
        return;
    }
    async #clickAnchor(selector: string): Promise<void> {
        if (!this.#page) {
            throw new Error('Unexpected error');
        }

        await Promise.all([
            this.#page.waitForNavigation({waitUntil: ['load', 'networkidle0']}),
            this.#page.locator(selector).click()
        ]);

        return;
    }
    async getPortfolio(): Promise<Portfolio> {
        await this.#init();

        if (!this.#page) {
            throw new Error('Unexpected error');
        }

        await this.#move(config.url.home);

        await this.#clickAnchor(config.selector.portfolio.button);

        return await this.#page.evaluate(allTableSelector => {
            const portfolio: Portfolio = {};

            try {
                document.querySelectorAll(allTableSelector).forEach(table => {
                    let portfolioSecurity: PortfolioSecurity = {};
                    let labels: string[] = [];
                    let current: PortfolioSecurity | PortfolioSecurity[string] = portfolioSecurity;

                    const trs = table.querySelectorAll("tr");
                    trs.forEach((tr, trIndex) => {
                        const tds = tr.querySelectorAll("td");

                        tds.forEach((td, tdIndex) => {
                            if (trIndex === 0 && td.textContent) {
                                // 有価証券の種類
                                portfolio[td.textContent] = portfolioSecurity;
                            } else if (trIndex === 1 && td.textContent) {
                                // テーブルヘッダーのラベル
                                labels.push(td.textContent);
                            } else if (trIndex % 2 === 0 && tdIndex === 0 && td.textContent) {
                                // 有価証券名
                                current = portfolioSecurity[td.textContent] = {};
                            } else if (trIndex % 2 !== 0 && td.textContent && labels[tdIndex]) {
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
            } catch {
                throw new Error('UI structure has changed');
            }

            return portfolio;
        }, config.selector.portfolio.allTable);
    }
    async getIPO(): Promise<Object> {
        await this.#init();

        if (!this.#page) {
            throw new Error('Unexpected error');
        }

        await this.#move(config.url.home);

        await this.#clickAnchor(config.selector.ipo.ipoAnchor);

        return await this.#page.evaluate((header) => {
            const [ipoHeaderElem, poHeaderElem] = document.querySelectorAll(header);

            // IPOヘッダーとPOヘッダーの間にある要素を取得
            const targetElems = [];
            let nextElem = ipoHeaderElem?.nextElementSibling;
            while (nextElem && nextElem !== poHeaderElem) {
                targetElems.push(nextElem);
                nextElem = nextElem.nextElementSibling;
            }

            // 不要な要素を除外して、テキストを抽出
            const th_list = targetElems.map(targetElem => 
                Array.from(targetElem.querySelectorAll('th'))
                    .map(th => th.textContent))
                    .flat()
                    .filter(text => !/目論見書/.test(text || '')
            );
            const td_list = targetElems.map(targetElem => 
                Array.from(targetElem.querySelectorAll('th + td'))
                    .map(td => td.textContent))
                    .flat();

            const ipoInfo: IpoInfo = {};
            const total = th_list.length - td_list.length;
            const th_num = td_list.length / total;

            let current: IpoInfo | IpoInfo[string] = {};
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
                } else {
                    ipoInfo[th] = {};
                    current = ipoInfo[th];
                }
            });

            // 算出した合計値と異なる場合はUIが変更された可能性あり
            if (Object.keys(ipoInfo).length !== total) {
                throw new Error('UI structure has changed');
            }

            return ipoInfo;
        }, config.selector.ipo.header);
    }
    async close(): Promise<void> {
        if (!this.#browser) {
            return;
        }

        await this.#browser.close();
    }
}