import React, { useState } from 'react';
import type { TradeRecord } from '../types/trade';

interface TradeListProps {
  records: TradeRecord[];
  onDeleteRecord: (id: string) => void;
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string | null) => void;
  getStockCurrency: (symbol: string) => 'KRW' | 'USD';
}

export const TradeList: React.FC<TradeListProps> = ({
  records,
  onDeleteRecord,
  selectedSymbol,
  onSelectSymbol,
  getStockCurrency,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 매칭 검색 필터링
  const filteredRecords = React.useMemo(() => {
    let result = [...records].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (selectedSymbol) {
      result = result.filter((r) => r.symbol === selectedSymbol);
    }

    if (searchQuery.trim() !== '') {
      result = result.filter((r) =>
        r.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [records, selectedSymbol, searchQuery]);

  const formatCurrency = (val: number, currency: 'KRW' | 'USD') => {
    if (currency === 'KRW') {
      return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${date} ${hours}:${minutes}`;
  };

  return (
    <div className="card glass history-card">
      <div className="history-header">
        <h3>매매 일지 내역</h3>
        {selectedSymbol && (
          <span className="badge-type buy" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)', cursor: 'pointer' }} onClick={() => onSelectSymbol(null)}>
            {selectedSymbol} ✕
          </span>
        )}
      </div>

      {/* 검색 바 */}
      <div className="form-group" style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="종목명으로 거래 검색..."
          className="search-input"
        />
      </div>

      {filteredRecords.length === 0 ? (
        <div className="empty-portfolio" style={{ padding: '24px 0' }}>
          <p>등록된 매매 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="history-list">
          {filteredRecords.map((rec) => {
            const isBuy = rec.type === 'BUY';
            const totalSum = rec.price * rec.quantity;

            return (
              <div key={rec.id} className="history-item">
                <div className="item-left">
                  <span className={`badge-type ${isBuy ? 'buy' : 'sell'}`}>
                    {isBuy ? '매수' : '매도'}
                  </span>
                  <div className="item-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span 
                        className="item-symbol" 
                        onClick={() => onSelectSymbol(rec.symbol)}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {rec.symbol}
                      </span>
                      {rec.brokerage && (
                        <span className="badge-brokerage" style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.2'
                        }}>
                          🏢 {rec.brokerage}
                        </span>
                      )}
                      {rec.owner && (
                        <span className="badge-owner" style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '4px',
                          color: '#60a5fa',
                          lineHeight: '1.2'
                        }}>
                          👤 {rec.owner}
                        </span>
                      )}
                    </div>
                    <span className="item-time">{formatDate(rec.date)}</span>
                    {rec.memo && <span className="item-memo">{rec.memo}</span>}
                  </div>
                </div>

                <div className="item-right">
                  <div className="item-finance">
                    <div className="item-price">
                      {formatCurrency(rec.price, getStockCurrency(rec.symbol))}
                    </div>
                    <div className="item-qty">
                      {rec.quantity}주 ({formatCurrency(totalSum, getStockCurrency(rec.symbol))})
                    </div>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={() => {
                      if (confirm(`${rec.symbol} 매매 일지를 삭제하시겠습니까?`)) {
                        onDeleteRecord(rec.id);
                      }
                    }}
                    title="기록 삭제"
                  >
                    {/* SVG 쓰레기통 아이콘 */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
