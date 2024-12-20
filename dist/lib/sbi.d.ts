import type { Portfolio, StockData, Order } from '../types/sbi';
export declare class SBI {
    #private;
    userName: string;
    password: string;
    constructor(userName: string, password: string);
    getPortfolio(): Promise<Portfolio>;
    getIPO(): Promise<Object>;
    getStockData(stockCode: string): Promise<StockData>;
    orderStock(order: Order): Promise<void>;
    close(): Promise<void>;
}
