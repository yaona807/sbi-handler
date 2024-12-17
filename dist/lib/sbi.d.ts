type PortfolioSecurity = {
    [K: string]: {
        [K: string]: number;
    };
};
type Portfolio = {
    [K: string]: PortfolioSecurity;
};
export declare class SBI {
    #private;
    userName: string;
    password: string;
    constructor(userName: string, password: string);
    getPortfolio(): Promise<Portfolio>;
    getIPO(): Promise<Object>;
    close(): Promise<void>;
}
export {};
