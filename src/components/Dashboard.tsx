import React from 'react';
import type { StockHolding } from '../types/trade';

interface SummaryCardsProps {
  holdings: StockHolding[];
  currentPrices: Record<string, number>;
  usdToKrwRate: number;
  getStockCurrency: (symbol: string) => 'KRW' | 'USD';
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  holdings,
  currentPrices,
  usdToKrwRate,
  getStockCurrency,
}) => {
  const metrics = React.useMemo(() => {
    let totalCostKRW = 0;
    let totalValueKRW = 0;

    holdings.forEach((h) => {
      const currentPrice = currentPrices[h.symbol] || h.averagePrice;
      const currency = getStockCurrency(h.symbol);
      const cost = h.totalCost;
      const value = h.totalQuantity * currentPrice;

      if (currency === 'USD') {
        totalCostKRW += cost * usdToKrwRate;
        totalValueKRW += value * usdToKrwRate;
      } else {
        totalCostKRW += cost;
        totalValueKRW += value;
      }
    });

    const totalProfit = totalValueKRW - totalCostKRW;
    const profitRate = totalCostKRW > 0 ? (totalProfit / totalCostKRW) * 100 : 0;

    return {
      totalCost: totalCostKRW,
      totalValue: totalValueKRW,
      totalProfit,
      profitRate,
    };
  }, [holdings, currentPrices, usdToKrwRate, getStockCurrency]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatRate = (val: number) => {
    const prefix = val > 0 ? '+' : '';
    return `${prefix}${val.toFixed(2)}%`;
  };

  const isProfit = metrics.totalProfit >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="summary-cards">
        <div className="card glass total-value-card">
          <span className="card-label">총 자산 평가액 (원화 환산)</span>
          <h2 className="card-value">{formatCurrency(metrics.totalValue)}</h2>
          <span className="card-subtext">총 매수 금액: {formatCurrency(metrics.totalCost)}</span>
        </div>

        <div className={`card glass profit-card ${isProfit ? 'profit-up' : 'profit-down'}`}>
          <span className="card-label">총 평가 손익 (원화 환산)</span>
          <h2 className="card-value">
            {formatCurrency(metrics.totalProfit)}
          </h2>
          <span className="card-rate-badge">
            {formatRate(metrics.profitRate)}
          </span>
        </div>
      </div>
      <div style={{
        fontSize: '11px',
        color: 'var(--text-muted)',
        textAlign: 'right',
        marginRight: '8px',
        fontStyle: 'italic'
      }}>
        ※ 해외 자산은 실시간 환율 (1 USD = {new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2 }).format(usdToKrwRate)}원) 기준 원화로 환산되어 합산되었습니다.
      </div>
    </div>
  );
};

interface PortfolioSidebarProps {
  holdings: StockHolding[];
  currentPrices: Record<string, number>;
  usdToKrwRate: number;
  getStockCurrency: (symbol: string) => 'KRW' | 'USD';
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string | null) => void;
  onOpenInitModal: () => void;
  onUpdateCurrentPrice: (symbol: string, price: number) => void;
}

export const PortfolioSidebar: React.FC<PortfolioSidebarProps> = ({
  holdings,
  currentPrices,
  usdToKrwRate,
  getStockCurrency,
  selectedSymbol,
  onSelectSymbol,
  onOpenInitModal,
  onUpdateCurrentPrice,
}) => {
  const [editingSymbol, setEditingSymbol] = React.useState<string | null>(null);
  const [editPrice, setEditPrice] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<'list' | 'ratios'>('list');

  // 비중, 통화별, 종목별 및 소유자별 자산 비율 계산
  const metrics = React.useMemo(() => {
    let totalValueKRW = 0;
    let krwVal = 0;
    let usdVal = 0;
    const symbolMap: Record<string, number> = {};
    const ownerMap: Record<string, number> = {};

    holdings.forEach((h) => {
      const currentPrice = currentPrices[h.symbol] || h.averagePrice;
      const currency = getStockCurrency(h.symbol);
      const value = h.totalQuantity * currentPrice;
      const valKRW = currency === 'USD' ? value * usdToKrwRate : value;

      if (currency === 'USD') {
        usdVal += value;
        totalValueKRW += valKRW;
      } else {
        krwVal += value;
        totalValueKRW += valKRW;
      }

      symbolMap[h.symbol] = (symbolMap[h.symbol] || 0) + valKRW;

      if (h.subHoldings && h.subHoldings.length > 0) {
        h.subHoldings.forEach((sub) => {
          const subVal = sub.quantity * currentPrice;
          const subValKRW = currency === 'USD' ? subVal * usdToKrwRate : subVal;
          ownerMap[sub.owner] = (ownerMap[sub.owner] || 0) + subValKRW;
        });
      } else {
        ownerMap['미지정'] = (ownerMap['미지정'] || 0) + valKRW;
      }
    });

    const usdValKRW = usdVal * usdToKrwRate;
    const krwWeight = totalValueKRW > 0 ? (krwVal / totalValueKRW) * 100 : 0;
    const usdWeight = totalValueKRW > 0 ? (usdValKRW / totalValueKRW) * 100 : 0;

    const symbolDistribution = Object.entries(symbolMap)
      .map(([symbol, val]) => ({
        symbol,
        value: val,
        weight: totalValueKRW > 0 ? (val / totalValueKRW) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    const ownerDistribution = Object.entries(ownerMap)
      .map(([owner, val]) => ({
        owner,
        value: val,
        weight: totalValueKRW > 0 ? (val / totalValueKRW) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalValue: totalValueKRW,
      krwTotalValue: krwVal,
      usdTotalValue: usdVal,
      krwWeight,
      usdWeight,
      symbolDistribution,
      ownerDistribution,
    };
  }, [holdings, currentPrices, usdToKrwRate, getStockCurrency]);

  const formatCurrency = (val: number, currency: 'KRW' | 'USD') => {
    if (currency === 'KRW') {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
      }).format(val);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatRate = (val: number) => {
    const prefix = val > 0 ? '+' : '';
    return `${prefix}${val.toFixed(2)}%`;
  };

  return (
    <div className="portfolio-sidebar glass" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="sidebar-header" style={{ paddingBottom: '8px' }}>
        <h3>보유 종목</h3>
        {selectedSymbol && (
          <button className="clear-filter-btn" onClick={() => onSelectSymbol(null)}>
            전체
          </button>
        )}
      </div>

      {holdings.length > 0 && (
        <div className="sidebar-tabs" style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '16px',
          gap: '4px',
          padding: '0 4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: activeTab === 'list' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'list' ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: activeTab === 'list' ? '#fff' : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all var(--transition-normal)',
              outline: 'none'
            }}
          >
            📂 자산 목록
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ratios')}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: activeTab === 'ratios' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ratios' ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: activeTab === 'ratios' ? '#fff' : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all var(--transition-normal)',
              outline: 'none'
            }}
          >
            📊 자산 비중
          </button>
        </div>
      )}

      {activeTab === 'ratios' && holdings.length > 0 && (
        <div className="portfolio-ratios" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {/* 통화별 자산 비중 */}
          <div className="currency-ratio-container" style={{
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: '600' }}>
              <span>통화별 자산 비중</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                KRW {metrics.krwWeight.toFixed(1)}% : USD {metrics.usdWeight.toFixed(1)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex'
            }}>
              <div style={{
                width: `${metrics.krwWeight}%`,
                height: '100%',
                backgroundColor: 'var(--color-buy)',
                transition: 'width var(--transition-normal)'
              }} title={`원화(KRW) 비중: ${metrics.krwWeight.toFixed(1)}%`} />
              <div style={{
                width: `${metrics.usdWeight}%`,
                height: '100%',
                backgroundColor: 'var(--color-accent)',
                transition: 'width var(--transition-normal)'
              }} title={`달러(USD) 비중: ${metrics.usdWeight.toFixed(1)}%`} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>원화: {formatCurrency(metrics.krwTotalValue, 'KRW')}</span>
              <span>달러: {formatCurrency(metrics.usdTotalValue, 'USD')}</span>
            </div>
          </div>

          {/* 종목별 자산 비중 */}
          <div className="symbol-ratio-container" style={{
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: '600' }}>
              <span>종목별 자산 비중</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {metrics.symbolDistribution.map(sd => `${sd.symbol} ${sd.weight.toFixed(1)}%`).join(' : ')}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex'
            }}>
              {metrics.symbolDistribution.map((sd, idx) => {
                const SYMBOL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#30b0c7'];
                const color = SYMBOL_COLORS[idx % SYMBOL_COLORS.length];
                return (
                  <div key={sd.symbol} style={{
                    width: `${sd.weight}%`,
                    height: '100%',
                    backgroundColor: color,
                    transition: 'width var(--transition-normal)'
                  }} title={`${sd.symbol} 비중: ${sd.weight.toFixed(1)}%`} />
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '10px' }}>
              {metrics.symbolDistribution.map((sd, idx) => {
                const SYMBOL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#30b0c7'];
                const color = SYMBOL_COLORS[idx % SYMBOL_COLORS.length];
                return (
                  <div key={sd.symbol} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />
                    <span>{sd.symbol}: {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(sd.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 소유자별 자산 비중 */}
          <div className="owner-ratio-container" style={{
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: '600' }}>
              <span>소유자별 자산 비중</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {metrics.ownerDistribution.map(od => `${od.owner} ${od.weight.toFixed(1)}%`).join(' : ')}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex'
            }}>
              {metrics.ownerDistribution.map((od, idx) => {
                const OWNER_COLORS = ['#3f51b5', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4'];
                const color = OWNER_COLORS[idx % OWNER_COLORS.length];
                return (
                  <div key={od.owner} style={{
                    width: `${od.weight}%`,
                    height: '100%',
                    backgroundColor: color,
                    transition: 'width var(--transition-normal)'
                  }} title={`${od.owner} 비중: ${od.weight.toFixed(1)}%`} />
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '10px' }}>
              {metrics.ownerDistribution.map((od, idx) => {
                const OWNER_COLORS = ['#3f51b5', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4'];
                const color = OWNER_COLORS[idx % OWNER_COLORS.length];
                return (
                  <div key={od.owner} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />
                    <span>{od.owner}: {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(od.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {holdings.length === 0 ? (
        <div className="empty-portfolio-sidebar" style={{ flexGrow: 1 }}>
          <p>보유 주식 없음</p>
        </div>
      ) : (
        activeTab === 'list' && (
          <div className="sidebar-holding-list" style={{ flexGrow: 1, overflowY: 'auto' }}>
          {holdings.map((h) => {
            const currentPrice = currentPrices[h.symbol] || h.averagePrice;
            const currency = getStockCurrency(h.symbol);
            
            const value = h.totalQuantity * currentPrice;
            const profit = value - h.totalCost;
            const rate = h.totalCost > 0 ? (profit / h.totalCost) * 100 : 0;
            
            // 비중 계산을 위해 원화 환산
            const valueKRW = currency === 'USD' ? value * usdToKrwRate : value;
            const weight = metrics.totalValue > 0 ? (valueKRW / metrics.totalValue) * 100 : 0;
            const isSelected = selectedSymbol === h.symbol;

            return (
              <div
                key={h.symbol}
                className={`holding-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectSymbol(isSelected ? null : h.symbol)}
              >
                <div className="holding-item-top">
                  <div className="holding-symbol-area">
                    <span className={`status-dot ${isSelected ? 'dot-active' : ''}`}></span>
                    <strong className="holding-symbol">{h.symbol}</strong>
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 4px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '4px',
                      color: 'var(--text-secondary)'
                    }}>
                      {currency}
                    </span>
                  </div>
                  <span className={`holding-profit-rate ${profit >= 0 ? 'text-up' : 'text-down'}`}>
                    {formatRate(rate)}
                  </span>
                </div>

                <div className="holding-item-mid">
                  <span className="holding-qty-price" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>{h.totalQuantity}주 · 평단 {formatCurrency(h.averagePrice, currency)}</span>
                    {currency === 'USD' && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        (원화 평단: {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(h.averagePrice * usdToKrwRate)})
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span className="holding-value">{formatCurrency(value, currency)}</span>
                    {currency === 'USD' && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        ({new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value * usdToKrwRate)})
                      </span>
                    )}
                  </div>
                </div>

                {/* 현재가 수정 영역 */}
                <div className="holding-price-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  <span>
                    현재가: {editingSymbol === h.symbol ? (
                      <input
                        type="number"
                        step="any"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            const p = parseFloat(editPrice);
                            if (!isNaN(p) && p >= 0) {
                              onUpdateCurrentPrice(h.symbol, p);
                              setEditingSymbol(null);
                            }
                          } else if (e.key === 'Escape') {
                            setEditingSymbol(null);
                          }
                        }}
                        style={{
                          width: '75px',
                          padding: '2px 4px',
                          fontSize: '11px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--color-accent)',
                          borderRadius: '4px',
                          color: '#fff',
                          outline: 'none',
                          marginRight: '4px'
                        }}
                        autoFocus
                      />
                    ) : (
                      <span>
                        {formatCurrency(currentPrice, currency)}
                        {currency === 'USD' && (
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            ({new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(currentPrice * usdToKrwRate)})
                          </span>
                        )}
                      </span>
                    )}
                  </span>

                  {editingSymbol === h.symbol ? (
                    <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          const p = parseFloat(editPrice);
                          if (!isNaN(p) && p >= 0) {
                            onUpdateCurrentPrice(h.symbol, p);
                            setEditingSymbol(null);
                          }
                        }}
                        style={{ padding: '2px 4px', fontSize: '10px', background: 'var(--color-buy-bg)', color: 'var(--color-buy)', borderRadius: '4px' }}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSymbol(null)}
                        style={{ padding: '2px 4px', fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', borderRadius: '4px' }}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="edit-price-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSymbol(h.symbol);
                        setEditPrice(currentPrice.toString());
                      }}
                      style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        padding: '2px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title="현재가 수정"
                    >
                      ✏️ 수정
                    </button>
                  )}
                </div>

                {/* 요약 비중 정보 (비선택 시 노출) */}
                {!isSelected && h.subHoldings && h.subHoldings.length > 0 && (
                  <div className="holding-summary-badges" style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginTop: '6px',
                    paddingTop: '6px',
                    borderTop: '1px dashed rgba(255, 255, 255, 0.05)',
                    fontSize: '10px',
                    color: 'var(--text-muted)'
                  }}>
                    <span>🏢 {Array.from(new Set(h.subHoldings.map(s => s.brokerage))).join(', ')}</span>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                    <span>👤 {Array.from(new Set(h.subHoldings.map(s => s.owner))).join(', ')}</span>
                  </div>
                )}

                {/* 소유주 및 증권사별 상세 현황 (선택 시 노출) */}
                {isSelected && h.subHoldings && h.subHoldings.length > 0 && (
                  <div className="holding-details-expanded" style={{
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>👤 소유주 · 증권사별 상세 지분</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {h.subHoldings.map((sub, sIdx) => {
                        const subVal = sub.quantity * currentPrice;
                        const subProfit = subVal - sub.totalCost;
                        const subRate = sub.totalCost > 0 ? (subProfit / sub.totalCost) * 100 : 0;
                        const subShare = h.totalQuantity > 0 ? (sub.quantity / h.totalQuantity) * 100 : 0;
                        return (
                          <div key={sIdx} style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '11px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                              <span>
                                <span style={{ color: '#fff', marginRight: '6px' }}>👤 {sub.owner}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>🏢 {sub.brokerage}</span>
                              </span>
                              <span className={subProfit >= 0 ? 'text-up' : 'text-down'}>
                                {subRate >= 0 ? '+' : ''}{subRate.toFixed(2)}%
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                              <span>{sub.quantity}주 ({subShare.toFixed(1)}%) · 평단 {formatCurrency(sub.averagePrice, currency)}</span>
                              <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(subVal, currency)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="holding-item-bottom" style={{ marginTop: '6px' }}>
                  <div className="weight-bar-bg">
                    <div className="weight-bar" style={{ width: `${weight}%` }}></div>
                  </div>
                  <span className="holding-weight">{weight.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* 초기 포트폴리오 일괄 설정 버튼 */}
      <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
        <button className="btn-setup-init" onClick={onOpenInitModal} style={{
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '600',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          ⚙️ 초기 자산 일괄 설정
        </button>
      </div>
    </div>
  );
};
