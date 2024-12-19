import puppeteer, { Browser, Page } from 'puppeteer';
import config from '../config/config.json';
import type { Portfolio, PortfolioSecurity, StockData, IpoInfo } from '../types/sbi';

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
			this.#page.$(config.selector.login.password),
		]).then((elems) => elems.filter((elem) => elem).length === 0);
	}
	async #init(): Promise<void> {
		this.#browser = this.#browser || (await puppeteer.launch({ headless: 'shell' }));
		this.#page = this.#page || (await this.#browser.newPage());

		await this.#move(config.url.home);

		if (await this.#isLogin()) {
			return;
		}

		await this.#page.setViewport({ width: config.viewport.width, height: config.viewport.height });

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
			this.#page.waitForNavigation({ waitUntil: ['load', 'networkidle0'] }),
			this.#page.locator(selector).click(),
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

		return await this.#page.evaluate((allTableSelector) => {
			const portfolio: Portfolio = {};

			try {
				document.querySelectorAll(allTableSelector).forEach((table) => {
					let portfolioSecurity: PortfolioSecurity = {};
					let labels: string[] = [];
					let current: PortfolioSecurity | PortfolioSecurity[string] = portfolioSecurity;

					const trs = table.querySelectorAll('tr');
					trs.forEach((tr, trIndex) => {
						const tds = tr.querySelectorAll('td');

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
			const th_list = targetElems
				.map((targetElem) => Array.from(targetElem.querySelectorAll('th')).map((th) => th.textContent))
				.flat()
				.filter((text) => !/目論見書/.test(text || ''));
			const td_list = targetElems
				.map((targetElem) => Array.from(targetElem.querySelectorAll('th + td')).map((td) => td.textContent))
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
	async getStockData(stockCode: string): Promise<StockData> {
		// 銘柄コードの確認
		// ※厳密な仕様の確認は不要で、英数字4文字かの最低限の判定だけ実施
		if (!/^[!-~]{4}$/.test(stockCode)) {
			throw new Error('Invalid stockCode');
		}

		await this.#init();

		if (!this.#page) {
			throw new Error('Unexpected error');
		}

		await this.#move(config.url.home);

		// 銘柄検索
		await this.#page.type(config.selector.stock.searchInput, stockCode);
		await this.#clickAnchor(config.selector.stock.searchButton);

		// 株価情報の抽出
		return await this.#page.evaluate((stockDataSelector) => {
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
				.filter((d): d is string => !!d);
			if (
				typeof stockName !== 'string' ||
				typeof currentValue !== 'string' ||
				!(stockDataList instanceof Array) ||
				stockDataList.length === 0
			) {
				throw new Error('UI structure has changed');
			}

			const stockData: StockData = {
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

				stockData[key] = Number(
					stockData[key]
						.replace(/,/g, '')
						.replace(/\s*\(千円\)/, '000')
						.replace(/\s*\(万円\)/, '0000')
				);
			});

			// 数値情報以外を追加
			stockData['銘柄名'] = stockName;

			return stockData;
		}, config.selector.stock.stockData);
	}
	async close(): Promise<void> {
		if (!this.#browser) {
			return;
		}

		await this.#browser.close();
	}
}
