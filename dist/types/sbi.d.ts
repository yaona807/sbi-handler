export type PortfolioSecurity = {
    [K: string]: {
        [K: string]: number;
    };
};
export type Portfolio = {
    [K: string]: PortfolioSecurity;
};
export type IpoInfo = {
    [K: string]: {
        [K: string]: string;
    };
};
export type StockData = {
    [K: string]: string | number;
};
export type Order = {
    market?: 'TKY' | 'NGY' | 'FKO' | 'SPR' | 'SOR';
    stockCode: string;
    tradeType: 'buy' | 'sell';
    quantity: number;
    orderType: 'limit' | 'market' | 'stop';
    price?: number | null;
    custodyType: 'specific' | 'general';
    validity?: 'dayOnly';
    tradePassword: string;
};
