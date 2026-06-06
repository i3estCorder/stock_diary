export interface TradeRecord {
  id: string;          // 고유 ID
  symbol: string;      // 종목명
  type: 'BUY' | 'SELL';// 거래 타입
  price: number;       // 단가
  quantity: number;    // 수량
  date: string;        // 일시 (ISO 8601 포맷: YYYY-MM-DDTHH:mm)
  memo?: string;       // 메모
  brokerage?: string;  // 증권사 정보
  owner?: string;      // 소유주 정보
}

export interface StockSubHolding {
  owner: string;       // 소유주
  brokerage: string;   // 증권사
  quantity: number;    // 수량
  averagePrice: number;// 평단가
  totalCost: number;   // 총 매수 금액
}

export interface StockHolding {
  symbol: string;
  totalQuantity: number;
  averagePrice: number;
  totalCost: number;
  subHoldings?: StockSubHolding[]; // 소유주 및 증권사별 보유 상세 정보
}
