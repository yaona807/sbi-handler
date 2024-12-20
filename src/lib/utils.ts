import type { Order } from '../types/sbi';

export function validateOrder(order: Order): boolean {
	if (typeof order !== 'object') {
		return false;
	}
	if (order.market != null && !['TKY', 'NGY', 'FKO', 'SPR', 'SOR'].includes(order.market)) {
		return false;
	}
	if (!validateStockCode(order.stockCode)) {
		return false;
	}
	if (!['buy', 'sell'].includes(order.tradeType)) {
		return false;
	}
	if (typeof order.quantity !== 'number') {
		return false;
	}
	if (!['limit', 'market', 'stop'].includes(order.orderType)) {
		return false;
	}
	if (
		(order.orderType === 'market' && order.price != null) ||
		(order.orderType !== 'market' && typeof order.price !== 'number')
	) {
		return false;
	}
	if (!['specific', 'general'].includes(order.custodyType)) {
		return false;
	}
	if (order.validity != null && order.validity !== 'dayOnly') {
		return false;
	}
	if (typeof order.tradePassword !== 'string') {
		return false;
	}

	return true;
}

export function validateStockCode(stockCode: string): boolean {
	// 銘柄コードの確認
	// ※厳密な仕様の確認は不要で、英数字4文字かの最低限の判定だけ実施
	if (!/^[!-~]{4}$/.test(stockCode)) {
		return false;
	}

	return true;
}
