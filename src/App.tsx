import { useState, useMemo } from 'react';
import { useTradeRecords } from './hooks/useTradeRecords';
import { TimelineChart } from './components/TimelineChart';
import { SummaryCards, PortfolioSidebar } from './components/Dashboard';
import { TradeForm } from './components/TradeForm';
import { TradeList } from './components/TradeList';
import { InitPortfolioModal } from './components/InitPortfolioModal';

function App() {
  const {
    records,
    holdings,
    currentPrices,
    usdToKrwRate,
    isLoaded,
    isSyncing,
    addRecord,
    deleteRecord,
    resetWithHoldings,
    updateCurrentPrice,
    syncPrices,
    getStockCurrency
  } = useTradeRecords();

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);

  // 자동완성 추천을 위해 존재했던 종목명 리스트 추출
  const existingSymbols = useMemo(() => {
    const symbols = new Set(records.map((r) => r.symbol));
    return Array.from(symbols);
  }, [records]);

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        color: '#fff',
        backgroundColor: '#0b0f19'
      }}>
        <h2>데이터 로드 중...</h2>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-buy)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
          <h1>Stock Diary</h1>
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 환율 표시 배지 */}
          <div className="exchange-rate-badge glass" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            <span>💵 환율:</span>
            <strong style={{ color: '#fff' }}>
              1 USD = {new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1 }).format(usdToKrwRate)}원
            </strong>
          </div>

          {/* 실시간 시세 동기화 버튼 */}
          <button 
            className="btn-sync-prices glass" 
            onClick={() => syncPrices()}
            disabled={isSyncing}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '20px',
              color: 'var(--text-primary)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: isSyncing ? 'not-allowed' : 'pointer'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={isSyncing ? 'spin-icon' : ''}
              style={{ marginRight: '6px', verticalAlign: 'middle' }}
            >
              <path d="M23 4v6h-6M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {isSyncing ? '시세 동기화 중...' : '실시간 시세 동기화'}
          </button>

          {/* 새 매매 기록 추가 버튼 (모달 오픈) */}
          <button className="btn-add-record" onClick={() => setIsFormOpen(true)}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '6px', verticalAlign: 'middle' }}
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            새 매매 일지 기록
          </button>

          {/* 프로젝트 단계 배지 */}
          <div className="project-phase-badge glass" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>개발 상태:</span>
            <strong style={{ color: '#fff' }}>6단계 (실시간 시세 연동)</strong>
          </div>
        </div>
      </header>

      {/* 전체 레이아웃 (왼쪽 사이드바 + 오른쪽 메인 영역) */}
      <main className="app-layout">
        {/* 왼쪽 사이드바: 보유 종목 리스트 */}
        <aside className="sidebar-area">
          <PortfolioSidebar
            holdings={holdings}
            currentPrices={currentPrices}
            usdToKrwRate={usdToKrwRate}
            getStockCurrency={getStockCurrency}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            onOpenInitModal={() => setIsInitModalOpen(true)}
            onUpdateCurrentPrice={updateCurrentPrice}
          />
        </aside>

        {/* 오른쪽 메인 영역 */}
        <section className="main-area">
          {/* 최상단: 자산 평가 요약 카드 */}
          <SummaryCards
            holdings={holdings}
            currentPrices={currentPrices}
            usdToKrwRate={usdToKrwRate}
            getStockCurrency={getStockCurrency}
          />

          {/* 중간: 가로형 타임라인 차트 */}
          <TimelineChart
            records={records}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
          />

          {/* 하단: 전체 매매 일지 히스토리 */}
          <TradeList
            records={records}
            onDeleteRecord={deleteRecord}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            getStockCurrency={getStockCurrency}
          />
        </section>
      </main>

      {/* 매매 기록 등록 모달 */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setIsFormOpen(false)}>
              ✕
            </button>
            <TradeForm
              onAddRecord={(record) => {
                addRecord(record);
                setIsFormOpen(false);
              }}
              existingSymbols={existingSymbols}
            />
          </div>
        </div>
      )}

      {/* 초기 포트폴리오 자산 설정 모달 */}
      {isInitModalOpen && (
        <InitPortfolioModal
          currentHoldings={holdings}
          onClose={() => setIsInitModalOpen(false)}
          onConfirm={(initialHoldings) => {
            resetWithHoldings(initialHoldings);
            setIsInitModalOpen(false);
            setSelectedSymbol(null); // 초기화 시 종목 필터 초기화
          }}
        />
      )}
    </>
  );
}

export default App;
