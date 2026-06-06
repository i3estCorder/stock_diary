import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { TradeRecord } from '../types/trade';

interface TimelineChartProps {
  records: TradeRecord[];
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string | null) => void;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
  records,
  selectedSymbol,
  onSelectSymbol,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 타임라인 상태 (시간 범위 및 중심점)
  const [centerX, setCenterX] = useState<number>(Date.now());
  const [viewDurationMs, setViewDurationMs] = useState<number>(30 * 24 * 60 * 60 * 1000); // 기본 30일
  const [hoveredRecord, setHoveredRecord] = useState<TradeRecord | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 드래그 상태 관리
  const dragStatus = useRef({
    isDragging: false,
    startX: 0,
    startCenterX: 0,
  });

  const svgWidth = 1000;
  const svgHeight = 320;
  
  // 패딩 영역 정의 (X축: 140px 좌측 라벨용, 40px 우측 여백 / Y축: 30px 상단, 50px 하단)
  const paddingLeft = 140;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 50;
  
  const chartActiveWidth = svgWidth - paddingLeft - paddingRight;
  const chartActiveHeight = svgHeight - paddingTop - paddingBottom;

  // 전체 거래 중 유효한 시간 구하기
  const timeBounds = useMemo(() => {
    if (records.length === 0) {
      const now = Date.now();
      return { min: now - 15 * 24 * 3600 * 1000, max: now + 15 * 24 * 3600 * 1000 };
    }
    const times = records.map((r) => new Date(r.date).getTime());
    return { min: Math.min(...times), max: Math.max(...times) };
  }, [records]);

  // 종목별 리스트 추출
  const allSymbols = useMemo(() => {
    const symbols = new Set(records.map((r) => r.symbol));
    return Array.from(symbols).sort();
  }, [records]);

  // 컴포넌트 마운트 및 거래 목록이 들어올 때 중앙 정렬 초기화
  useEffect(() => {
    if (records.length > 0) {
      const { min, max } = timeBounds;
      const mid = (min + max) / 2;
      const diff = max - min;
      // 너무 좁으면 최소 7일 분량 범위 제공
      const initialDuration = Math.max(diff * 1.5, 7 * 24 * 60 * 60 * 1000);
      setCenterX(mid);
      setViewDurationMs(initialDuration);
    }
  }, [records, timeBounds]);

  // 시간축 변환 헬퍼 함수
  const startTime = centerX - viewDurationMs / 2;

  const getX = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return paddingLeft + ((t - startTime) / viewDurationMs) * chartActiveWidth;
  };

  // 1. 단일 종목 집중 보기 데이터 필터링 및 Y축(가격) 매핑
  const singleSymbolDetails = useMemo(() => {
    if (!selectedSymbol) return null;
    const filtered = records
      .filter((r) => r.symbol === selectedSymbol)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (filtered.length === 0) return null;

    const prices = filtered.map((r) => r.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const diff = maxPrice - minPrice;
    
    // Y축 가격의 상하 여백 15% 제공
    const yMin = diff === 0 ? minPrice * 0.9 : Math.max(0, minPrice - diff * 0.15);
    const yMax = diff === 0 ? maxPrice * 1.1 : maxPrice + diff * 0.15;

    return { filtered, yMin, yMax };
  }, [records, selectedSymbol]);

  const getY = (price: number) => {
    if (singleSymbolDetails) {
      const { yMin, yMax } = singleSymbolDetails;
      return (
        svgHeight -
        paddingBottom -
        ((price - yMin) / (yMax - yMin)) * chartActiveHeight
      );
    }
    return 0;
  };

  // 2. 멀티 종목 보기 Lane(차선) 매핑
  const symbolLanesMap = useMemo(() => {
    const map: Record<string, number> = {};
    allSymbols.forEach((s, idx) => {
      map[s] = idx;
    });
    return map;
  }, [allSymbols]);

  const getLaneY = (symbol: string) => {
    const laneIndex = symbolLanesMap[symbol] ?? 0;
    const laneCount = allSymbols.length || 1;
    const laneHeight = chartActiveHeight / laneCount;
    return paddingTop + laneIndex * laneHeight + laneHeight / 2;
  };

  // 시간축 텍스트 포맷 (줌 범위에 따라 지능적으로 연/월/일 표시)
  const timeTicks = useMemo(() => {
    const ticks: { time: number; label: string }[] = [];
    const stepCount = 5;
    const stepMs = viewDurationMs / stepCount;
    
    // 날짜 포맷 함수
    const formatTickDate = (time: number) => {
      const d = new Date(time);
      if (viewDurationMs < 3 * 24 * 3600 * 1000) {
        // 3일 이하: 시간 표시
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } else if (viewDurationMs < 90 * 24 * 3600 * 1000) {
        // 90일 이하: 월/일 표시
        return `${d.getMonth() + 1}/${d.getDate()}`;
      } else {
        // 장기 범위: 년/월 표시
        return `${d.getFullYear()}/${d.getMonth() + 1}`;
      }
    };

    for (let i = 0; i <= stepCount; i++) {
      const tickTime = startTime + i * stepMs;
      ticks.push({
        time: tickTime,
        label: formatTickDate(tickTime),
      });
    }
    return ticks;
  }, [startTime, viewDurationMs]);

  // 가격 포맷 (단일 종목 집중 뷰 격자선용)
  const priceTicks = useMemo(() => {
    if (!singleSymbolDetails) return [];
    const { yMin, yMax } = singleSymbolDetails;
    const ticks: number[] = [];
    const stepCount = 4;
    const stepVal = (yMax - yMin) / stepCount;

    for (let i = 0; i <= stepCount; i++) {
      ticks.push(yMin + i * stepVal);
    }
    return ticks;
  }, [singleSymbolDetails]);

  // 드래그(Panning) 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // 좌클릭만 허용
    dragStatus.current = {
      isDragging: true,
      startX: e.clientX,
      startCenterX: centerX,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragStatus.current.isDragging) return;
    const deltaX = e.clientX - dragStatus.current.startX;
    
    // 픽셀 이동거리를 시간 변화량(ms)으로 변환
    const deltaMs = -(deltaX / chartActiveWidth) * viewDurationMs;
    setCenterX(dragStatus.current.startCenterX + deltaMs);
  };

  const handleMouseUp = () => {
    dragStatus.current.isDragging = false;
  };

  // 휠(Zooming) 이벤트 핸들러
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85;

    // 마우스 커서 위치 기준으로 줌인/줌아웃 되도록 시간 축 계산 보정 (옵션)
    // 여기서는 기본적으로 중심점 기준 줌 적용 및 범위 제한 (최소 12시간 ~ 최대 5년)
    const minZoom = 12 * 60 * 60 * 1000;
    const maxZoom = 5 * 365 * 24 * 60 * 60 * 1000;
    
    setViewDurationMs((prev) => {
      const next = prev * zoomFactor;
      if (next < minZoom) return minZoom;
      if (next > maxZoom) return maxZoom;
      return next;
    });
  };

  // 수동 줌 인/아웃 버튼 제어
  const handleZoomBtn = (factor: number) => {
    setViewDurationMs((prev) => {
      const next = prev * factor;
      const minZoom = 12 * 60 * 60 * 1000;
      const maxZoom = 5 * 365 * 24 * 60 * 60 * 1000;
      if (next < minZoom) return minZoom;
      if (next > maxZoom) return maxZoom;
      return next;
    });
  };

  const handleReset = () => {
    if (records.length > 0) {
      const { min, max } = timeBounds;
      const mid = (min + max) / 2;
      const diff = max - min;
      setViewDurationMs(Math.max(diff * 1.5, 7 * 24 * 60 * 60 * 1000));
      setCenterX(mid);
    } else {
      setCenterX(Date.now());
      setViewDurationMs(30 * 24 * 60 * 60 * 1000);
    }
  };

  // 점 마우스 호버 이벤트
  const handleDotHover = (e: React.MouseEvent, rec: TradeRecord) => {
    if (!svgRef.current || !containerRef.current) return;
    
    // 컨테이너 대비 상대 좌표 구하기
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    setTooltipPos({ x, y });
    setHoveredRecord(rec);
  };

  const handleDotLeave = () => {
    setHoveredRecord(null);
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000) {
      return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="card glass timeline-card" ref={containerRef}>
      <div className="timeline-header">
        <div className="timeline-title-area">
          <h3>
            {selectedSymbol ? `📈 ${selectedSymbol} 매매 타임라인` : '📊 전체 매매 흐름 타임라인'}
          </h3>
          <span className="timeline-subtitle">
            {selectedSymbol 
              ? 'Y축: 매매 단가 (추세선 제공) | 마우스 드래그로 탐색, 휠로 확대/축소 가능' 
              : 'Y축: 종목 구분 | 점 크기: 매매 대금 비례 | 드래그와 휠 가능'}
          </span>
        </div>
        
        <div className="timeline-controls">
          <button className="control-btn" onClick={() => handleZoomBtn(0.7)} title="확대 (Zoom In)">
            ＋
          </button>
          <button className="control-btn" onClick={() => handleZoomBtn(1.4)} title="축소 (Zoom Out)">
            －
          </button>
          <button className="control-btn" onClick={handleReset} title="초기화 및 전체 범위 맞춤">
            🔄
          </button>
        </div>
      </div>

      <div className="timeline-viewport">
        <svg
          className="timeline-svg"
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* 1. 눈금선 레이어 (격자) */}
          {/* 세로 시간 그리드 및 텍스트 */}
          {timeTicks.map((tick, idx) => {
            const x = paddingLeft + (idx * chartActiveWidth) / (timeTicks.length - 1);
            return (
              <g key={`time-tick-${idx}`}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={svgHeight - paddingBottom}
                  className="grid-line"
                />
                <text
                  x={x}
                  y={svgHeight - paddingBottom + 20}
                  textAnchor="middle"
                  className="axis-text"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          {/* 가로 그리드 및 가로 라벨 (뷰 모드별 다름) */}
          {singleSymbolDetails ? (
            // 단일 종목 집중 뷰 - 가로 가격 격자선 및 가격 라벨
            priceTicks.map((price, idx) => {
              const y = getY(price);
              return (
                <g key={`price-tick-${idx}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    className="grid-line"
                  />
                  <text
                    x={paddingLeft - 15}
                    y={y + 4}
                    textAnchor="end"
                    className="axis-text"
                  >
                    {formatCurrency(price)}
                  </text>
                </g>
              );
            })
          ) : (
            // 전체 종목 멀티 라인 뷰 - 종목 구분 차선 및 종목명 라벨
            allSymbols.map((sym) => {
              const y = getLaneY(sym);
              const laneHeight = chartActiveHeight / (allSymbols.length || 1);
              const isSelected = selectedSymbol === sym;
              return (
                <g key={`lane-${sym}`} className="lane-group">
                  {/* 차선 배경 hover 영역 */}
                  <rect
                    x={paddingLeft}
                    y={y - laneHeight / 2}
                    width={chartActiveWidth}
                    height={laneHeight}
                    className="lane-bg"
                  />
                  {/* 중앙 실선 */}
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    className="lane-line"
                  />
                  {/* 왼쪽 텍스트 */}
                  <text
                    x={paddingLeft - 15}
                    y={y + 4}
                    textAnchor="end"
                    className={`lane-label ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectSymbol(sym)}
                    style={{ cursor: 'pointer', fill: isSelected ? 'var(--color-accent)' : 'var(--text-secondary)' }}
                  >
                    {sym}
                  </text>
                </g>
              );
            })
          )}

          {/* 차트 프레임 경계선 */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={svgHeight - paddingBottom}
            className="grid-line-main"
          />
          <line
            x1={paddingLeft}
            y1={svgHeight - paddingBottom}
            x2={svgWidth - paddingRight}
            y2={svgHeight - paddingBottom}
            className="grid-line-main"
          />

          {/* 2. 시각 데이터 드로잉 */}
          {singleSymbolDetails ? (
            // 단일 종목 보기: 매매 시점을 이어주는 추세선 렌더링
            <>
              {singleSymbolDetails.filtered.length > 1 && (
                <path
                  d={singleSymbolDetails.filtered
                    .map((r, idx) => {
                      const prefix = idx === 0 ? 'M' : 'L';
                      return `${prefix}${getX(r.date)} ${getY(r.price)}`;
                    })
                    .join(' ')}
                  className="price-line"
                />
              )}

              {/* 매매 마커 점들 */}
              {singleSymbolDetails.filtered.map((rec) => {
                const x = getX(rec.date);
                const y = getY(rec.price);
                
                // 타임라인 해상도 영역 밖은 렌더링 무시
                if (x < paddingLeft || x > svgWidth - paddingRight) return null;

                const isBuy = rec.type === 'BUY';
                return (
                  <circle
                    key={rec.id}
                    cx={x}
                    cy={y}
                    r={8}
                    className={`chart-dot ${isBuy ? 'dot-buy' : 'dot-sell'}`}
                    onMouseEnter={(e) => handleDotHover(e, rec)}
                    onMouseMove={(e) => handleDotHover(e, rec)}
                    onMouseLeave={handleDotLeave}
                  />
                );
              })}
            </>
          ) : (
            // 전체 종목 멀티 레인 보기: 모든 매매 마커를 종목별 레인 상에 표시
            records.map((rec) => {
              const x = getX(rec.date);
              const y = getLaneY(rec.symbol);

              if (x < paddingLeft || x > svgWidth - paddingRight) return null;

              const isBuy = rec.type === 'BUY';
              
              // 거래 금액에 따라 비례하는 점 크기 설정 (거래 대금 비례 6px ~ 14px 범위)
              const transactionVal = rec.price * rec.quantity;
              const maxScale = 5000000; // 500만원 기준
              const size = 6 + Math.min(8, (transactionVal / maxScale) * 8);

              return (
                <circle
                  key={rec.id}
                  cx={x}
                  cy={y}
                  r={size}
                  className={`chart-dot ${isBuy ? 'dot-buy' : 'dot-sell'}`}
                  onMouseEnter={(e) => handleDotHover(e, rec)}
                  onMouseMove={(e) => handleDotHover(e, rec)}
                  onMouseLeave={handleDotLeave}
                  onClick={() => onSelectSymbol(rec.symbol)}
                />
              );
            })
          )}
        </svg>

        {/* 3. 툴팁 팝업 레이어 */}
        {hoveredRecord && (
          <div
            className="chart-tooltip"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
            }}
          >
            <div className="tooltip-header">
              <span className="tooltip-title">{hoveredRecord.symbol}</span>
              <span className={`tooltip-badge ${hoveredRecord.type.toLowerCase()}`}>
                {hoveredRecord.type === 'BUY' ? '매수' : '매도'}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">거래 단가</span>
              <span className="tooltip-value">{formatCurrency(hoveredRecord.price)}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">거래 수량</span>
              <span className="tooltip-value">{hoveredRecord.quantity}주</span>
            </div>
            <div className="tooltip-row" style={{ fontWeight: 'bold' }}>
              <span className="tooltip-label">거래 금액</span>
              <span className="tooltip-value">
                {formatCurrency(hoveredRecord.price * hoveredRecord.quantity)}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">거래 일시</span>
              <span className="tooltip-value" style={{ fontSize: '10px' }}>
                {hoveredRecord.date.replace('T', ' ')}
              </span>
            </div>
            {hoveredRecord.memo && (
              <div className="tooltip-memo">{hoveredRecord.memo}</div>
            )}
          </div>
        )}
      </div>

      {/* 도움말 안내 */}
      <div className="timeline-instructions">
        <div className="instruction-item">
          <span>🟢 매수</span>
        </div>
        <div className="instruction-item">
          <span>🔴 매도</span>
        </div>
        <div className="instruction-item">
          <span>🖱 드래그: 시간대 탐색</span>
        </div>
        <div className="instruction-item">
          <span>🎡 마우스 휠: 확대/축소</span>
        </div>
      </div>
    </div>
  );
};
