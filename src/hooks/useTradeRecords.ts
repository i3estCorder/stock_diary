import { useState, useEffect, useMemo } from 'react';
import type { TradeRecord, StockHolding, StockSubHolding } from '../types/trade';

const LOCAL_STORAGE_KEY = 'stock_diary_records';
const PRICES_STORAGE_KEY = 'stock_diary_current_prices';
const RATE_STORAGE_KEY = 'stock_diary_usd_krw_rate';

// 국내 및 해외 인기 종목에 대한 Yahoo Finance 티커 매핑 사전
const TICKER_MAP: Record<string, string> = {
  '삼성전자': '005930.KS',
  '삼성전자우': '005935.KS',
  '삼성전자우선주': '005935.KS',
  '삼성우': '005935.KS',
  '삼성': '005930.KS',
  'sk하이닉스': '000660.KS',
  'sk하이닉스 주식': '000660.KS',
  '하이닉스': '000660.KS',
  '현대자동차': '005380.KS',
  '현대차': '005380.KS',
  '네이버': '035420.KS',
  'naver': '035420.KS',
  '카카오': '035720.KS',
  'kakao': '035720.KS',
  '에코프로': '086520.KQ',
  '셀트리온': '068270.KS',
  '애플': 'AAPL',
  'apple': 'AAPL',
  '테슬라': 'TSLA',
  'tesla': 'TSLA',
  'tsla': 'TSLA',
  '엔비디아': 'NVDA',
  'nvidia': 'NVDA',
  '마이크로소프트': 'MSFT',
  'msft': 'MSFT',
  '구글': 'GOOGL',
  'google': 'GOOGL',
  '아마존': 'AMZN',
  'amazon': 'AMZN',
};

// 입력받은 한글명/티커명을 Yahoo Finance 포맷 티커로 변환 (공백 제거 적용)
function getTicker(symbol: string): string {
  const clean = symbol.trim().toLowerCase().replace(/\s+/g, '');
  if (TICKER_MAP[clean]) {
    return TICKER_MAP[clean];
  }
  if (/^[a-zA-Z0-9.^=]+$/.test(symbol)) {
    return symbol.toUpperCase();
  }
  return symbol;
}

// 개별 종목의 기준 통화 판별 (KRW 또는 USD)
export function getStockCurrency(symbol: string): 'KRW' | 'USD' {
  const ticker = getTicker(symbol);
  
  // .KS(코스피)나 .KQ(코스닥)로 끝나면 KRW
  if (ticker.endsWith('.KS') || ticker.endsWith('.KQ')) {
    return 'KRW';
  }
  
  // 한국 매핑 사전에 명시되어 있는 한글 기반 매핑이면 KRW
  const clean = symbol.trim().toLowerCase().replace(/\s+/g, '');
  if (TICKER_MAP[clean]) {
    const mapped = TICKER_MAP[clean];
    if (mapped.endsWith('.KS') || mapped.endsWith('.KQ')) {
      return 'KRW';
    }
    return 'USD';
  }

  // 한글 문자가 1개라도 섞여있으면 KRW로 판단
  if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(symbol)) {
    return 'KRW';
  }

  // 그 외 영문 코드로 시작하면 해외 주식(USD)으로 판단
  return 'USD';
}

// allorigins CORS 프록시를 통해 Yahoo Finance 실시간 주가 페칭
const fetchPriceForSymbol = async (symbol: string): Promise<number | null> => {
  try {
    const ticker = getTicker(symbol);
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d&nocache=${Date.now()}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) return null;

    const wrapper = await response.json();
    if (!wrapper || !wrapper.contents) return null;

    const data = JSON.parse(wrapper.contents);
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;

    return price ?? null;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return null;
  }
};

export function useTradeRecords() {
  const [records, setRecords] = useState<TradeRecord[]>([]);
  const [userCurrentPrices, setUserCurrentPrices] = useState<Record<string, number>>({});
  const [usdToKrwRate, setUsdToKrwRate] = useState<number>(1380); // 기본 환율 fallback
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 초기 데이터 로딩
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved records', e);
      }
    } else {
      // 초기 웰컴 데이터 예시 (소유주 및 증권사 추가)
      const mockInitial: TradeRecord[] = [
        {
          id: '1',
          symbol: '삼성전자',
          type: 'BUY',
          price: 72000,
          quantity: 10,
          date: '2026-05-10T09:30',
          brokerage: '키움증권',
          owner: '본인',
          memo: '첫 분할 매수 시작'
        },
        {
          id: '2',
          symbol: '삼성전자',
          type: 'BUY',
          price: 70500,
          quantity: 15,
          date: '2026-05-15T14:20',
          brokerage: '키움증권',
          owner: '본인',
          memo: '지지원 눌림목 추가 매수'
        },
        {
          id: '3',
          symbol: '삼성전자',
          type: 'SELL',
          price: 76000,
          quantity: 10,
          date: '2026-05-28T10:15',
          brokerage: '키움증권',
          owner: '본인',
          memo: '단기 저항선 도달하여 비중 축소'
        },
        {
          id: '4',
          symbol: 'AAPL',
          type: 'BUY',
          price: 172,
          quantity: 5,
          date: '2026-05-20T22:35',
          brokerage: '토스증권',
          owner: '본인',
          memo: '아이폰 발표 기대감 선매수'
        },
        {
          id: '5',
          symbol: 'MRVL',
          type: 'BUY',
          price: 68.5,
          quantity: 12,
          date: '2026-05-25T23:15',
          brokerage: '삼성증권',
          owner: '배우자',
          memo: 'AI 반도체 밸류체인 수혜 기대'
        }
      ];
      setRecords(mockInitial);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockInitial));
    }

    // 저장된 수동 입력 현재가 로드
    const savedPrices = localStorage.getItem(PRICES_STORAGE_KEY);
    if (savedPrices) {
      try {
        setUserCurrentPrices(JSON.parse(savedPrices));
      } catch (e) {
        console.error('Failed to parse saved prices', e);
      }
    }

    // 저장된 환율 로드
    const savedRate = localStorage.getItem(RATE_STORAGE_KEY);
    if (savedRate) {
      const parsedRate = parseFloat(savedRate);
      if (!isNaN(parsedRate)) {
        setUsdToKrwRate(parsedRate);
      }
    }

    setIsLoaded(true);
  }, []);

  // 변경 발생 시 로컬스토리지 저장
  const saveRecords = (newRecords: TradeRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newRecords));
  };

  const addRecord = (record: Omit<TradeRecord, 'id'>) => {
    const newRecord: TradeRecord = {
      ...record,
      id: Math.random().toString(36).substring(2, 9),
    };
    const updated = [...records, newRecord].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    saveRecords(updated);
  };

  const updateRecord = (id: string, updatedFields: Partial<TradeRecord>) => {
    const updated = records.map(rec => rec.id === id ? { ...rec, ...updatedFields } : rec)
                           .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    saveRecords(updated);
  };

  const deleteRecord = (id: string) => {
    const updated = records.filter(rec => rec.id !== id);
    saveRecords(updated);
  };

  // 기존 보유 종목 데이터 기반 초기화 기능 (과거 매매 세부 시간 모를 시 사용)
  const resetWithHoldings = (initialHoldings: { symbol: string; averagePrice: number; totalQuantity: number; brokerage?: string; owner?: string }[]) => {
    const newRecords: TradeRecord[] = initialHoldings.map((h, idx) => ({
      id: `init-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      symbol: h.symbol.trim(),
      type: 'BUY',
      price: h.averagePrice,
      quantity: h.totalQuantity,
      date: '2026-01-01T09:00',
      brokerage: h.brokerage ? h.brokerage.trim() : undefined,
      owner: h.owner ? h.owner.trim() : undefined,
      memo: '기존 보유 종목 일괄 등록 (상세 거래내역 생략)'
    }));
    saveRecords(newRecords);
  };

  // 주식 개별 현재가 수동 업데이트
  const updateCurrentPrice = (symbol: string, price: number) => {
    const updated = { ...userCurrentPrices, [symbol]: price };
    setUserCurrentPrices(updated);
    localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(updated));
  };

  // 보유 종목들의 현재가 실시간 갱신 및 환율 조회 API 호출
  const syncPrices = async (targetHoldings?: StockHolding[]) => {
    const listToSync = targetHoldings || holdings;
    setIsSyncing(true);

    const updatedPrices = { ...userCurrentPrices };
    let hasChanges = false;

    // 1. 실시간 환율 (USD/KRW) 페칭
    const fetchedRate = await fetchPriceForSymbol('USDKRW=X');
    if (fetchedRate !== null) {
      setUsdToKrwRate(fetchedRate);
      localStorage.setItem(RATE_STORAGE_KEY, fetchedRate.toString());
    }

    // 2. 보유 종목 주가 페칭
    if (listToSync.length > 0) {
      const promises = listToSync.map(async (h) => {
        const price = await fetchPriceForSymbol(h.symbol);
        if (price !== null) {
          updatedPrices[h.symbol] = price;
          hasChanges = true;
        }
      });
      await Promise.all(promises);
    }

    if (hasChanges) {
      setUserCurrentPrices(updatedPrices);
      localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(updatedPrices));
    }
    setIsSyncing(false);
  };

  // 보유 종목 및 평단가 실시간 계산 (소유주 및 증권사별 분할 집계 포함)
  const holdings = useMemo(() => {
    // symbol -> Key (owner|||brokerage) -> { quantity, totalCost }
    const holdingMap: Record<string, Record<string, { quantity: number; totalCost: number }>> = {};

    const sortedRecords = [...records].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedRecords.forEach(rec => {
      const symbol = rec.symbol;
      const owner = rec.owner ? rec.owner.trim() : '미지정';
      const brokerage = rec.brokerage ? rec.brokerage.trim() : '미지정';
      const key = `${owner}|||${brokerage}`;

      if (!holdingMap[symbol]) {
        holdingMap[symbol] = {};
      }

      if (!holdingMap[symbol][key]) {
        holdingMap[symbol][key] = { quantity: 0, totalCost: 0 };
      }

      const sub = holdingMap[symbol][key];
      if (rec.type === 'BUY') {
        sub.quantity += rec.quantity;
        sub.totalCost += rec.quantity * rec.price;
      } else {
        // SELL
        const currentAvg = sub.quantity > 0 ? sub.totalCost / sub.quantity : 0;
        sub.quantity = Math.max(0, sub.quantity - rec.quantity);
        sub.totalCost = sub.quantity * currentAvg;
      }
    });

    const list: StockHolding[] = [];
    Object.entries(holdingMap).forEach(([symbol, subMap]) => {
      const subHoldings: StockSubHolding[] = [];
      let totalQty = 0;
      let totalCost = 0;

      Object.entries(subMap).forEach(([key, data]) => {
        if (data.quantity > 0) {
          const [owner, brokerage] = key.split('|||');
          const averagePrice = Math.round((data.totalCost / data.quantity) * 100) / 100;
          subHoldings.push({
            owner,
            brokerage,
            quantity: data.quantity,
            averagePrice,
            totalCost: data.totalCost
          });
          totalQty += data.quantity;
          totalCost += data.totalCost;
        }
      });

      if (totalQty > 0) {
        list.push({
          symbol,
          totalQuantity: totalQty,
          averagePrice: Math.round((totalCost / totalQty) * 100) / 100,
          totalCost,
          subHoldings
        });
      }
    });

    return list;
  }, [records]);

  // 보유 종목의 종목명 목록 문자열화 (새로운 종목 추가 감지용)
  const holdingSymbolsStr = useMemo(() => {
    return holdings.map(h => h.symbol).sort().join(',');
  }, [holdings]);

  // 보유 종목 로딩 및 종목명 목록 변경 시 자동으로 시세 및 환율 동기화 실행
  useEffect(() => {
    if (isLoaded && holdingSymbolsStr) {
      syncPrices(holdings);
    }
  }, [isLoaded, holdingSymbolsStr]);

  // 각 종목별 현재가 계산 (수동 설정 가격 최우선 -> API 시세 -> 평단가 fallback)
  const currentPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    holdings.forEach(h => {
      if (userCurrentPrices[h.symbol] !== undefined) {
        prices[h.symbol] = userCurrentPrices[h.symbol];
      } else {
        // 해외 주식은 mock_base_prices가 없으면 평단가를 디폴트로 설정
        prices[h.symbol] = h.averagePrice;
      }
    });
    return prices;
  }, [holdings, userCurrentPrices]);

  return {
    records,
    holdings,
    currentPrices,
    usdToKrwRate,
    isLoaded,
    isSyncing,
    addRecord,
    updateRecord,
    deleteRecord,
    resetWithHoldings,
    updateCurrentPrice,
    syncPrices,
    getStockCurrency
  };
}
