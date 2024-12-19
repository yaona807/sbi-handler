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
