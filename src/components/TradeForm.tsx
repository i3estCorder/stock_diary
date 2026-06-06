import React, { useState, useEffect } from 'react';
import type { TradeRecord } from '../types/trade';

interface TradeFormProps {
  onAddRecord: (record: Omit<TradeRecord, 'id'>) => void;
  existingSymbols: string[];
}

export const TradeForm: React.FC<TradeFormProps> = ({ onAddRecord, existingSymbols }) => {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState('');
  const [memo, setMemo] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [owner, setOwner] = useState('');
  
  // 종목명 입력 자동 추천 제어
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 일시 초기값을 현재 시간으로 설정 (한국 시간대 기준 YYYY-MM-DDTHH:mm 포맷)
  useEffect(() => {
    const getLocalISOString = () => {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      return localISOTime;
    };
    setDate(getLocalISOString());
  }, []);

  // 종목명 입력 시 추천 필터링
  useEffect(() => {
    if (symbol.trim() === '') {
      setSuggestions([]);
      return;
    }
    const filtered = existingSymbols.filter((s) =>
      s.toLowerCase().includes(symbol.toLowerCase())
    );
    setSuggestions(filtered);
  }, [symbol, existingSymbols]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol.trim()) {
      alert('종목명을 입력해주세요.');
      return;
    }
    const parsedPrice = parseFloat(price);
    const parsedQty = parseFloat(quantity);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('올바른 단가를 입력해주세요.');
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert('올바른 수량을 입력해주세요.');
      return;
    }
    if (!date) {
      alert('거래 일시를 선택해주세요.');
      return;
    }

    onAddRecord({
      symbol: symbol.trim(),
      type,
      price: parsedPrice,
      quantity: parsedQty,
      date,
      memo: memo.trim() || undefined,
      brokerage: brokerage.trim() || undefined,
      owner: owner.trim() || undefined,
    });

    // 폼 초기화 (종목명, 타입 등은 연속 입력을 위해 부분 보존하거나 초기화)
    setSymbol('');
    setPrice('');
    setQuantity('');
    setMemo('');
    setBrokerage('');
    setOwner('');
    setShowSuggestions(false);
  };

  return (
    <div className="card glass form-card">
      <h3>매매 일지 기록</h3>
      <form onSubmit={handleSubmit} className="trade-form">
        {/* 거래 구분 */}
        <div className="form-group">
          <label>거래 구분</label>
          <div className="type-toggle">
            <button
              type="button"
              className={`type-btn ${type === 'BUY' ? 'active buy' : ''}`}
              onClick={() => setType('BUY')}
            >
              매수
            </button>
            <button
              type="button"
              className={`type-btn ${type === 'SELL' ? 'active sell' : ''}`}
              onClick={() => setType('SELL')}
            >
              매도
            </button>
          </div>
        </div>

        {/* 종목명 (추천 목록 포함) */}
        <div className="form-group" style={{ position: 'relative' }}>
          <label htmlFor="form-symbol">종목명</label>
          <input
            id="form-symbol"
            type="text"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="예: 삼성전자, AAPL"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions-list glass" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 10,
              marginTop: '4px',
              listStyle: 'none',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              background: '#151c30'
            }}>
              {suggestions.map((s) => (
                <li
                  key={s}
                  onMouseDown={() => {
                    setSymbol(s);
                    setShowSuggestions(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                  }}
                  className="suggestion-item"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 단가 및 수량 */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="form-price">거래 단가</label>
            <input
              id="form-price"
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="단가 입력"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="form-quantity">거래 수량</label>
            <input
              id="form-quantity"
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="수량 입력"
              required
            />
          </div>
        </div>

        {/* 증권사 및 소유주 입력 필드 */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="form-brokerage">증권사 (선택)</label>
            <input
              id="form-brokerage"
              type="text"
              value={brokerage}
              onChange={(e) => setBrokerage(e.target.value)}
              placeholder="예: 키움증권"
              list="brokerages"
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="form-owner">소유주 (선택)</label>
            <input
              id="form-owner"
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="예: 본인"
              list="owners"
              autoComplete="off"
            />
          </div>
        </div>

        {/* 거래 일시 */}
        <div className="form-group">
          <label htmlFor="form-date">거래 일시</label>
          <input
            id="form-date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* 메모 */}
        <div className="form-group">
          <label htmlFor="form-memo">메모 (선택)</label>
          <textarea
            id="form-memo"
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="거래 이유 또는 특이사항 기록"
          />
        </div>

        <button type="submit" className="btn-primary">
          기록 저장
        </button>
      </form>

      <datalist id="brokerages">
        <option value="키움증권" />
        <option value="삼성증권" />
        <option value="토스증권" />
        <option value="미래에셋증권" />
        <option value="한국투자증권" />
        <option value="KB증권" />
        <option value="신한투자증권" />
        <option value="NH투자증권" />
      </datalist>

      <datalist id="owners">
        <option value="본인" />
        <option value="배우자" />
        <option value="자녀" />
      </datalist>
    </div>
  );
};
