# sbi-handler
SBI証券のサイトをスクレイピングする TypeScript / JavaScript のライブラリです。

## インストール
```bash
npm install https://github.com/yaona807/sbi-handler.git
```

## 使い方
### ポートフォリオの取得

現在保有中の銘柄情報を取得します。

```ts
import SBIHander from "sbi-handler";

async function main() {
    const sbi = new SBIHander('userName', 'password');

    const portfolio = await sbi.getPortfolio();
    console.log(portfolio);
    await sbi.close();
};

main();
// {
//   '株式（現物/特定預り）': {
//     'xxxx XXXXXXXX ': { '保有株数': 10000, '取得単価': 10000, '現在値': 10000, '評価損益': 0 },
//   },
//   '投資信託（金額/特定預り）': {
//     'YYYYYYYYYYY': { '保有口数': 100000, '取得単価': 20000, '基準価額': 20000, '評価損益': 0 },
//   },
//   '投資信託（金額/NISA預り（つみたて投資枠））': {
//     'YYYYYYYYYYY': { '保有口数': 10000, '取得単価': 20000, '基準価額': 20000, '評価損益': 0 },
//   },
// }
```

### IPO情報の取得
IPO・POページに記載のIPO情報を取得します。
```ts
import SBIHander from "sbi-handler";

async function main() {
    const sbi = new SBIHander('userName', 'password');

    const ipoInfo = await sbi.getIPO();
    console.log(ipoInfo);
    await sbi.close();
};

main();
// {
//   '（株）XXXXXXX  （xxxx）X証': {
//     'ブックビル期間': '12/12 0:00～12/18 11:00',
//     '仮条件': 'ストライクプライス・1,980.0～2,070.0円',
//     '申込株数単位': '100株単位',
//     '上場日': '12/27'
//   },
//   'YYYYYYYY（株）  （yyyy）Y証': {
//     'ブックビル期間': '12/10 0:00～12/16 11:00',
//     '発行価格': '690.0円',
//     '申込株数単位': '100株単位',
//     '上場日': '12/26'
//   },
//   '（株）ZZZZZZZZZZ  （zzzz）Z証': {
//     'ブックビル期間': '12/11 0:00～12/17 11:00',
//     '発行価格決定日': '12/18',
//     '申込株数単位': '100株単位',
//     '上場日': '12/26'
//   }
// }
```

### 株価情報の取得
指定された銘柄コードの株価情報を取得します。
```ts
import SBIHander from "sbi-handler";

async function main() {
    const sbi = new SBIHander('userName', 'password');

    const stockData = await sbi.getStockData('xxxx');
    console.log(stockData);
    await sbi.close();
};

main();
// {
//   '現在値': 1050,
//   '始値': 1000,
//   '前日終値': 1010,
//   '高値': 1100,
//   '出来高': 3839210,
//   '安値': 1000,
//   '売買代金': 10000000,
//   '銘柄名': 'XXXXXXXX'
// }
```

### 株式を注文する
指定された注文情報をもとに新規注文を発注します。
```ts
import SBIHander from "sbi-handler";

async function main() {
    const sbi = new SBIHander('userName', 'password');

    const stockData = await sbi.orderStock({
        // 市場
        market: 'SOR', // 'TKY' | 'NGY' | 'FKO' | 'SPR' | 'SOR'
        // 銘柄コード
        stockCode: 'xxxx',
        // 取引
        // ※現物のみ
        tradeType: 'buy', // 'buy' | 'sell'
        // 株数
        quantity: 100,
        // 注文方法
        // ※条件不可
        orderType: 'limit', // 'limit' | 'market' | 'stop'
        // 注文価格
        // ※marketの場合は null | undefined
        price: 1000,
        // 預り区分
        // ※特定預り or 一般預り
        custodyType: 'specific', // 'specific' | 'general'
        // 期間
        // ※dayOnlyのみ
        validity: 'dayOnly',
        // 取引パスワード
        tradePassword: 'xxxxxxxxxxxxxxxx',
    });
    await sbi.close();
};

main();
```