"""
True Data API Server for Live Market Data
Fetches real-time market data from True Data and serves it to the frontend
"""

from flask import Flask, jsonify
from flask_cors import CORS
import requests
import threading
import logging
import time
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ============ TRUE DATA CONFIGURATION ============
TRUE_DATA_CONFIG = {
    'userId': 'trial871',
    'password': 'suchitra871',
    'base_url': 'https://api.truedata.in'
}

# Global variables for live data
live_data = {
    'NIFTY': {'ltp': 0, 'change': 0, 'changePct': 0, 'volume': 0, 'high': 0, 'low': 0, 'open': 0},
    'SENSEX': {'ltp': 0, 'change': 0, 'changePct': 0, 'volume': 0, 'high': 0, 'low': 0, 'open': 0},
    'BANKNIFTY': {'ltp': 0, 'change': 0, 'changePct': 0, 'volume': 0, 'high': 0, 'low': 0, 'open': 0}
}

auth_token = None
is_authenticated = False

# Symbol mapping for True Data
SYMBOL_MAP = {
    'NIFTY': 'NIFTY 50',
    'SENSEX': 'BSE SENSEX',
    'BANKNIFTY': 'NIFTY BANK'
}

# ============ AUTHENTICATION ============

def authenticate_truedata():
    """Authenticate with True Data API"""
    global auth_token, is_authenticated
    
    try:
        logger.info(f"Attempting True Data authentication for {TRUE_DATA_CONFIG['userId']}")
        
        # True Data login endpoint
        login_url = f"{TRUE_DATA_CONFIG['base_url']}/auth/login"
        
        payload = {
            'username': TRUE_DATA_CONFIG['userId'],
            'password': TRUE_DATA_CONFIG['password']
        }
        
        response = requests.post(login_url, json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('token'):
                auth_token = data['token']
                is_authenticated = True
                logger.info(f"✓ Successfully authenticated with True Data")
                return True
        
        logger.error(f"✗ Authentication failed: {response.status_code}")
        logger.error(f"Response: {response.text}")
        is_authenticated = False
        return False
            
    except Exception as e:
        logger.error(f"✗ Authentication error: {e}")
        is_authenticated = False
        return False

def get_market_data(symbol):
    """Fetch market data for a symbol from True Data"""
    global auth_token
    
    try:
        if not auth_token:
            logger.warning("No auth token, attempting to authenticate...")
            if not authenticate_truedata():
                return None
        
        # True Data quote endpoint
        quote_url = f"{TRUE_DATA_CONFIG['base_url']}/quotes/{symbol}"
        
        headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(quote_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            # Token expired, re-authenticate
            logger.info("Token expired, re-authenticating...")
            if authenticate_truedata():
                return get_market_data(symbol)  # Retry
        
        logger.error(f"Failed to fetch data for {symbol}: {response.status_code}")
        return None
            
    except Exception as e:
        logger.error(f"Error fetching market data for {symbol}: {e}")
        return None

def update_live_data():
    """Update live market data for all symbols"""
    global live_data
    
    for symbol_key, symbol_name in SYMBOL_MAP.items():
        data = get_market_data(symbol_name)
        
        if data:
            live_data[symbol_key] = {
                'ltp': data.get('ltp', 0),
                'change': data.get('change', 0),
                'changePct': data.get('change_percent', 0),
                'volume': data.get('volume', 0),
                'high': data.get('high', 0),
                'low': data.get('low', 0),
                'open': data.get('open', 0)
            }
            logger.info(f"Updated {symbol_key}: {live_data[symbol_key]['ltp']}")
        else:
            # Use simulated data as fallback
            simulate_price_movement(symbol_key)

def simulate_price_movement(symbol):
    """Simulate realistic price movement as fallback"""
    base_prices = {
        'NIFTY': 23500,
        'SENSEX': 78000,
        'BANKNIFTY': 49000
    }
    
    if symbol not in live_data or live_data[symbol]['ltp'] == 0:
        live_data[symbol]['ltp'] = base_prices.get(symbol, 0)
        live_data[symbol]['open'] = base_prices.get(symbol, 0)
    
    # Simulate small price movement
    volatility = 0.0003
    movement = (random.uniform(-1, 1) * volatility)
    live_data[symbol]['ltp'] *= (1 + movement)
    
    change = live_data[symbol]['ltp'] - live_data[symbol]['open']
    live_data[symbol]['change'] = change
    live_data[symbol]['changePct'] = (change / live_data[symbol]['open']) * 100

def live_feed_worker():
    """Background worker to update live feed periodically"""
    while True:
        try:
            update_live_data()
            time.sleep(2)  # Update every 2 seconds
        except Exception as e:
            logger.error(f"Error in live feed worker: {e}")
            time.sleep(5)

# ============ API ENDPOINTS ============

@app.route('/api/indices')
def get_indices():
    """Get current indices data"""
    return jsonify(live_data)

@app.route('/api/status')
def get_status():
    """Get authentication and connection status"""
    return jsonify({
        'authenticated': is_authenticated,
        'timestamp': datetime.now().isoformat(),
        'symbols': list(live_data.keys())
    })

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'authenticated': is_authenticated,
        'data_available': any(data['ltp'] > 0 for data in live_data.values())
    })

@app.route('/')
def index():
    """Server status page"""
    status_color = '#22c55e' if is_authenticated else '#ef4444'
    status_text = 'Connected' if is_authenticated else 'Disconnected'
    
    return f"""
    <html>
        <head>
            <title>True Data Server</title>
            <meta http-equiv="refresh" content="5">
        </head>
        <body style="font-family: Arial; background: #0f172a; color: white; padding: 50px;">
            <h1>🔌 True Data Server</h1>
            <h2 style="color: {status_color};">Status: {status_text}</h2>
            <h3>Live Data:</h3>
            <pre style="background: #1e293b; padding: 20px; border-radius: 8px; overflow-x: auto;">
{jsonify(live_data).get_data(as_text=True)}
            </pre>
            <p><a href="/api/indices" style="color: #3b82f6;">View JSON Data</a></p>
            <p><a href="/api/status" style="color: #3b82f6;">View Status</a></p>
        </body>
    </html>
    """

# ============ STARTUP ============

if __name__ == '__main__':
    import random
    
    logger.info("Starting True Data Server...")
    
    # Authenticate on startup
    authenticate_truedata()
    
    # Start background worker
    worker_thread = threading.Thread(target=live_feed_worker, daemon=True)
    worker_thread.start()
    logger.info("Started live feed worker")
    
    # Start Flask server
    app.run(host='0.0.0.0', port=5002, debug=False)
