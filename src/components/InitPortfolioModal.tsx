import React, { useState } from 'react';
import type { StockHolding } from '../types/trade';

interface InitHoldingInput {
  symbol: string;
  averagePrice: string;
  totalQuantity: string;
  brokerage: string;
  owner: string;
}

interface InitPortfolioModalProps {
  currentHoldings: StockHolding[];
  onClose: () => void;
  onConfirm: (holdings: { symbol: string; averagePrice: number; totalQuantity: number; brokerage?: string; owner?: string }[]) => void;
}

export const InitPortfolioModal: React.FC<InitPortfolioModalProps> = ({
  currentHoldings,
  onClose,
  onConfirm,
}) => {
  const [holdingsList, setHoldingsList] = useState<InitHoldingInput[]>(() => {
    if (currentHoldings && currentHoldings.length > 0) {
      const list: InitHoldingInput[] = [];
      currentHoldings.forEach((h) => {
        if (h.subHoldings && h.subHoldings.length > 0) {
          h.subHoldings.forEach((sub) => {
            list.push({
              symbol: h.symbol,
              averagePrice: sub.averagePrice.toString(),
              totalQuantity: sub.quantity.toString(),
              brokerage: sub.brokerage === '미지정' ? '' : sub.brokerage,
              owner: sub.owner === '미지정' ? '' : sub.owner,
            });
          });
        } else {
          list.push({
            symbol: h.symbol,
            averagePrice: h.averagePrice.toString(),
            totalQuantity: h.totalQuantity.toString(),
            brokerage: '',
            owner: '',
          });
        }
      });
      return list;
    }
    // 기본 모크 데이터 대신 1개의 비어있는 행 반환
    return [{ symbol: '', averagePrice: '', totalQuantity: '', brokerage: '', owner: '' }];
  });

  const handleAddRow = () => {
    setHoldingsList((prev) => [...prev, { symbol: '', averagePrice: '', totalQuantity: '', brokerage: '', owner: '' }]);
  };

  const handleRemoveRow = (idx: number) => {
    setHoldingsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChangeField = (idx: number, field: keyof InitHoldingInput, val: string) => {
    setHoldingsList((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 입력 유효성 검사
    const parsedHoldings: { symbol: string; averagePrice: number; totalQuantity: number; brokerage?: string; owner?: string }[] = [];

    for (let i = 0; i < holdingsList.length; i++) {
      const row = holdingsList[i];
      if (!row.symbol.trim()) {
        alert(`${i + 1}번째 종목의 종목명을 입력해주세요.`);
        return;
      }
      const price = parseFloat(row.averagePrice);
      const qty = parseFloat(row.totalQuantity);

      if (isNaN(price) || price <= 0) {
        alert(`'${row.symbol}' 종목의 올바른 평단가를 입력해주세요.`);
        return;
      }
      if (isNaN(qty) || qty <= 0) {
        alert(`'${row.symbol}' 종목의 올바른 보유 수량을 입력해주세요.`);
        return;
      }

      parsedHoldings.push({
        symbol: row.symbol.trim(),
        averagePrice: price,
        totalQuantity: qty,
        brokerage: row.brokerage.trim() || undefined,
        owner: row.owner.trim() || undefined,
      });
    }

    if (parsedHoldings.length === 0) {
      alert('최소 1개 이상의 보유 종목을 추가해주세요.');
      return;
    }

    const confirmMsg =
      '⚠️ 경고: 초기 포트폴리오를 적용하면 기존에 등록되어 있던 모든 상세 매매 내역(상세 일지)이 삭제되고 입력하신 잔고 내역으로 데이터가 대체됩니다. 계속 진행하시겠습니까?';
    if (confirm(confirmMsg)) {
      onConfirm(parsedHoldings);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="닫기">
          ✕
        </button>

        <div className="card glass form-card" style={{ padding: '24px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '8px' }}>
            ⚙️ 초기 포트폴리오 설정 (데이터 초기화)
          </h3>
          
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            marginBottom: '20px',
            background: 'rgba(239, 68, 68, 0.08)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.15)'
          }}>
            <strong>안내:</strong> 과거 매수 건의 구체적인 체결 일시를 일일이 알기 힘들 때 사용하는 기능입니다. 
            입력하신 평단가와 수량으로 가상의 과거 매수 건(기본 일시: 2026-01-01)이 생성되며, 
            <strong> 기존의 모든 데이터는 포맷(초기화)</strong>됩니다.
          </p>

          <form onSubmit={handleSubmit} className="trade-form">
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '16px',
              paddingRight: '4px'
            }}>
              {holdingsList.map((row, idx) => (
                <div key={idx} className="form-row" style={{
                  gridTemplateColumns: '2fr 1.8fr 1.8fr 2fr 2fr 0.6fr',
                  gap: '8px',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.01)',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}>
                  <div className="form-group" style={{ gap: '4px' }}>
                    {idx === 0 && <label style={{ fontSize: '11px' }}>종목명</label>}
                    <input
                      type="text"
                      value={row.symbol}
                      onChange={(e) => handleChangeField(idx, 'symbol', e.target.value)}
                      placeholder="삼성전자"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group" style={{ gap: '4px' }}>
                    {idx === 0 && <label style={{ fontSize: '11px' }}>평균 매수단가</label>}
                    <input
                      type="number"
                      step="any"
                      value={row.averagePrice}
                      onChange={(e) => handleChangeField(idx, 'averagePrice', e.target.value)}
                      placeholder="단가"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gap: '4px' }}>
                    {idx === 0 && <label style={{ fontSize: '11px' }}>보유 수량</label>}
                    <input
                      type="number"
                      step="any"
                      value={row.totalQuantity}
                      onChange={(e) => handleChangeField(idx, 'totalQuantity', e.target.value)}
                      placeholder="수량"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gap: '4px' }}>
                    {idx === 0 && <label style={{ fontSize: '11px' }}>증권사</label>}
                    <input
                      type="text"
                      value={row.brokerage}
                      onChange={(e) => handleChangeField(idx, 'brokerage', e.target.value)}
                      placeholder="예: 키움증권"
                      list="brokerages"
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group" style={{ gap: '4px' }}>
                    {idx === 0 && <label style={{ fontSize: '11px' }}>소유주</label>}
                    <input
                      type="text"
                      value={row.owner}
                      onChange={(e) => handleChangeField(idx, 'owner', e.target.value)}
                      placeholder="예: 본인"
                      list="owners"
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group" style={{ gap: '4px', alignSelf: idx === 0 ? 'flex-end' : 'center' }}>
                    {idx === 0 && <div style={{ height: '18px' }}></div>}
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      style={{
                        padding: '10px 8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)'
                      }}
                      className="btn-delete-row"
                      title="종목 제거"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

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

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="control-btn"
                style={{
                  flexGrow: 1,
                  fontSize: '13px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '42px'
                }}
                onClick={handleAddRow}
              >
                ＋ 종목 추가
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{
                  flexGrow: 2,
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  height: '42px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                설정 적용 (전체 초기화)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
