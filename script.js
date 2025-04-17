// Bitget GM/USDT 오더북 REST API 데이터 처리
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소 참조
    const connectionStatus = document.getElementById('connection-status');
    const lastPrice = document.getElementById('last-price');
    const midPrice = document.getElementById('mid-price');
    const spread = document.getElementById('spread');
    const spreadPercent = document.getElementById('spread-percent');
    const bidsContainer = document.getElementById('bids-container');
    const asksContainer = document.getElementById('asks-container');
    const lastPriceRange = document.getElementById('last-price-range');
    const lastPriceBidSum = document.getElementById('last-price-bid-sum');
    const lastPriceAskSum = document.getElementById('last-price-ask-sum');
    const midPriceRange = document.getElementById('mid-price-range');
    const midPriceBidSum = document.getElementById('mid-price-bid-sum');
    const midPriceAskSum = document.getElementById('mid-price-ask-sum');

    // 상태 변수
    let currentLastPrice = 0;
    let currentMidPrice = 0;
    let bids = [];
    let asks = [];
    let updateInterval = null;
    const updateDelay = 5000; // 5초

    // 시장 데이터 가져오기 함수
    async function fetchMarketData() {
        try {
            connectionStatus.className = 'connection-status connecting';
            connectionStatus.textContent = '데이터 가져오는 중...';

            // Tickers 데이터 가져오기
            const tickersResponse = await fetch('https://api.bitget.com/api/v2/spot/market/tickers?symbol=GMUSDT');
            if (!tickersResponse.ok) {
                throw new Error(`HTTP error! status: ${tickersResponse.status}`);
            }
            const tickersData = await tickersResponse.json();
            
            // Orderbook 데이터 가져오기
            const orderbookResponse = await fetch('https://api.bitget.com/api/v2/spot/market/merge-depth?symbol=GMUSDT&precision=scale1&limit=max');
            if (!orderbookResponse.ok) {
                throw new Error(`HTTP error! status: ${orderbookResponse.status}`);
            }
            const orderbookData = await orderbookResponse.json();
            
            if (tickersData.code === '00000' && orderbookData.code === '00000') {
                connectionStatus.className = 'connection-status connected';
                connectionStatus.textContent = '연결됨';
                
                // Tickers 데이터 처리
                const ticker = tickersData.data[0];
                currentLastPrice = parseFloat(ticker.lastPr);
                lastPrice.textContent = currentLastPrice.toFixed(6);
                
                // Orderbook 데이터 처리
                processOrderbookData(orderbookData.data);
            } else {
                throw new Error(`API error! tickers code: ${tickersData.code}, orderbook code: ${orderbookData.code}`);
            }
        } catch (error) {
            console.error('Error fetching market data:', error);
            connectionStatus.className = 'connection-status disconnected';
            connectionStatus.textContent = '데이터 가져오기 실패';
        }
    }

    // 오더북 데이터 처리 함수
    function processOrderbookData(data) {
        if (!data || !data.bids || !data.asks) return;
        
        // 데이터 저장
        bids = data.bids.map(item => ({
            price: parseFloat(item[0]),
            amount: parseFloat(item[1])
        }));
        
        asks = data.asks.map(item => ({
            price: parseFloat(item[0]),
            amount: parseFloat(item[1])
        }));
        
        // 최고 매수가와 최저 매도가로 mid price 계산
        if (bids.length > 0 && asks.length > 0) {
            const highestBid = bids[0].price;
            const lowestAsk = asks[0].price;
            
            // Mid price 계산 및 업데이트
            currentMidPrice = (highestBid + lowestAsk) / 2;
            midPrice.textContent = currentMidPrice.toFixed(6);
            
            // Spread 계산 및 업데이트
            const spreadValue = lowestAsk - highestBid;
            spread.textContent = spreadValue.toFixed(6);
            
            // Spread 퍼센트 계산 및 업데이트
            const spreadPercentValue = (spreadValue / currentMidPrice) * 100;
            spreadPercent.textContent = spreadPercentValue.toFixed(2) + '%';
        }
        
        // 오더북 UI 업데이트
        updateOrderbookUI();
        
        // Depth 분석 업데이트
        updateDepthMetrics();
    }

    // 오더북 UI 업데이트 함수
    function updateOrderbookUI() {
        // 매수 주문(bids) UI 업데이트
        bidsContainer.innerHTML = '';
        bids.forEach(bid => {
            const row = document.createElement('div');
            row.className = 'orderbook-row bid';
            
            const price = document.createElement('div');
            price.className = 'orderbook-price';
            price.textContent = bid.price.toFixed(6);
            
            const amount = document.createElement('div');
            amount.className = 'orderbook-amount';
            amount.textContent = bid.amount.toFixed(6);
            
            const total = document.createElement('div');
            total.className = 'orderbook-total';
            total.textContent = (bid.price * bid.amount).toFixed(2);
            
            row.appendChild(price);
            row.appendChild(amount);
            row.appendChild(total);
            bidsContainer.appendChild(row);
        });
        
        // 매도 주문(asks) UI 업데이트
        asksContainer.innerHTML = '';
        asks.forEach(ask => {
            const row = document.createElement('div');
            row.className = 'orderbook-row ask';
            
            const price = document.createElement('div');
            price.className = 'orderbook-price';
            price.textContent = ask.price.toFixed(6);
            
            const amount = document.createElement('div');
            amount.className = 'orderbook-amount';
            amount.textContent = ask.amount.toFixed(6);
            
            const total = document.createElement('div');
            total.className = 'orderbook-total';
            total.textContent = (ask.price * ask.amount).toFixed(2);
            
            row.appendChild(price);
            row.appendChild(amount);
            row.appendChild(total);
            asksContainer.appendChild(row);
        });
    }

    // Depth 분석 업데이트 함수
    function updateDepthMetrics() {
        if (currentLastPrice <= 0 || currentMidPrice <= 0) return;
        
        // Last Price 대비 ±2% 범위 계산
        const lastPriceLower = currentLastPrice * 0.98;
        const lastPriceUpper = currentLastPrice * 1.02;
        lastPriceRange.textContent = `${lastPriceLower.toFixed(6)} ~ ${lastPriceUpper.toFixed(6)}`;
        
        // Last Price 대비 ±2% 내 매수 호가 합계 계산
        const lastPriceBidSumValue = bids
            .filter(bid => bid.price >= lastPriceLower && bid.price <= currentLastPrice)
            .reduce((sum, bid) => sum + (bid.price * bid.amount), 0);
        lastPriceBidSum.textContent = lastPriceBidSumValue.toFixed(2) + ' USDT';
        
        // Last Price 대비 ±2% 내 매도 호가 합계 계산
        const lastPriceAskSumValue = asks
            .filter(ask => ask.price <= lastPriceUpper && ask.price >= currentLastPrice)
            .reduce((sum, ask) => sum + (ask.price * ask.amount), 0);
        lastPriceAskSum.textContent = lastPriceAskSumValue.toFixed(2) + ' USDT';
        
        // Mid Price 대비 ±2% 범위 계산
        const midPriceLower = currentMidPrice * 0.98;
        const midPriceUpper = currentMidPrice * 1.02;
        midPriceRange.textContent = `${midPriceLower.toFixed(6)} ~ ${midPriceUpper.toFixed(6)}`;
        
        // Mid Price 대비 ±2% 내 매수 호가 합계 계산
        const midPriceBidSumValue = bids
            .filter(bid => bid.price >= midPriceLower && bid.price <= currentMidPrice)
            .reduce((sum, bid) => sum + (bid.price * bid.amount), 0);
        midPriceBidSum.textContent = midPriceBidSumValue.toFixed(2) + ' USDT';
        
        // Mid Price 대비 ±2% 내 매도 호가 합계 계산
        const midPriceAskSumValue = asks
            .filter(ask => ask.price <= midPriceUpper && ask.price >= currentMidPrice)
            .reduce((sum, ask) => sum + (ask.price * ask.amount), 0);
        midPriceAskSum.textContent = midPriceAskSumValue.toFixed(2) + ' USDT';
    }

    // 초기 데이터 로드 및 주기적 업데이트 시작
    fetchMarketData();
    updateInterval = setInterval(fetchMarketData, updateDelay);

    // 페이지 언로드 시 인터벌 정리
    window.addEventListener('beforeunload', function() {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
    });
});
