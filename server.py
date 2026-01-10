"""
Angel One SmartAPI Server for Live Market Data
This server fetches live market data from Angel One and serves it to the frontend
"""

from flask import Flask, jsonify, request, redirect, session
from flask_cors import CORS
from SmartApi import SmartConnect
import threading
import logging
from datetime import datetime
import os
import pyotp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.urandom(24)
CORS(app)

# ============ CONFIGURATION ============
# Angel One Credentials
CLIENT_ID = "AABZ373457"  # Your Angel One Client ID
PASSWORD = "Sabir@123"  # Your Angel One login password
API_KEY = "Hsx6OX7y"  # API Key from SmartAPI portal
SECRET_KEY = "03a10594-9df4-41d9-ac75-bf807ab01c6b"  # Secret Key
TOTP_SECRET = "7CNLDZ42RSAP4SS3J43JJ77JBY"  # TOTP secret for 2FA

# Initialize SmartAPI
smart_api = SmartConnect(api_key=API_KEY)

# Global variables for live data
live_data = {
    'NIFTY 50': {'price': 0, 'change': 0, 'changePct': 0},
    'SENSEX': {'price': 0, 'change': 0, 'changePct': 0},
    'BANK NIFTY': {'price': 0, 'change': 0, 'changePct': 0}
}

auth_token = None
feed_token = None
refresh_token = None

# Angel One Token Mapping (Symbol tokens)
INSTRUMENT_TOKENS = {
    'NIFTY 50': '99926000',      # NIFTY 50 Index
    'SENSEX': '99919000',         # SENSEX Index  
    'BANK NIFTY': '99926009'      # BANK NIFTY Index
}

# ============ AUTHENTICATION ============

def generate_totp():
    """Generate TOTP for 2FA if enabled"""
    try:
        if TOTP_SECRET and TOTP_SECRET != "your_totp_secret_here":
            totp = pyotp.TOTP(TOTP_SECRET)
            return totp.now()
    except Exception as e:
        logger.error(f"Error generating TOTP: {e}")
    return ""

def authenticate_angel_one():
    """Authenticate with Angel One and store tokens"""
    global auth_token, feed_token, refresh_token
    
    try:
        totp_code = generate_totp()
        logger.info(f"Attempting Angel One authentication for {CLIENT_ID}")
        
        # Generate session
        session_data = smart_api.generateSession(CLIENT_ID, PASSWORD, totp_code)
        
        if session_data and session_data.get('status'):
            auth_token = session_data['data']['jwtToken']
            feed_token = session_data['data']['feedToken']
            refresh_token = session_data['data']['refreshToken']
            
            logger.info(f"✓ Successfully authenticated with Angel One")
            logger.info(f"  Auth Token: {auth_token[:20]}...")
            logger.info(f"  Feed Token: {feed_token}")
            
            return True
        else:
            error_msg = session_data.get('message', 'Unknown error') if session_data else 'Invalid response'
            logger.error(f"✗ Authentication failed: {error_msg}")
            return False
            
    except Exception as e:
        logger.error(f"✗ Authentication error: {e}")
        return False

@app.route('/login')
def login():
    """Login to Angel One"""
    global auth_token
    
    if authenticate_angel_one() and auth_token:
        # Start live feed
        start_live_feed()
        
        return """
        <html>
            <head><title>Authentication Successful</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px; background: #0f172a; color: white;">
                <h1 style="color: #22c55e;">✓ Angel One Authentication Successful!</h1>
                <p>Live data is now streaming...</p>
                <p>Check <a href="/health" style="color: #3b82f6;">Health Status</a> for live data</p>
                <script>
                    setTimeout(() => window.location.href = '/health', 2000);
                </script>
            </body>
        </html>
        """
    else:
        return """
        <html>
            <body style="font-family: Arial; text-align: center; padding: 50px; background: #0f172a; color: white;">
                <h1 style="color: #ef4444;">✗ Authentication Failed</h1>
                <p>Check server logs for details</p>
                <p><a href="/" style="color: #3b82f6;">← Go Back</a></p>
            </body>
        </html>
        """, 400

@app.route('/authenticate', methods=['POST'])
def authenticate():
    """Fallback manual authentication endpoint"""
    global auth_token, feed_token, refresh_token
    
    try:
        data = request.get_json()
        totp_code = data.get('totp')
        
        if not totp_code:
            return jsonify({'success': False, 'error': 'TOTP required'})
        
        # Generate session with manual TOTP
        session_data = smart_api.generateSession(CLIENT_ID, PASSWORD, totp_code)
        
        if session_data and session_data.get('status'):
            auth_token = session_data['data']['jwtToken']
            feed_token = session_data['data']['feedToken']
            refresh_token = session_data['data']['refreshToken']
            
            logger.info("✓ Successfully authenticated with Angel One")
            start_live_feed()
            
            return jsonify({'success': True, 'message': 'Authenticated successfully'})
        else:
            error_msg = session_data.get('message', 'Unknown error') if session_data else 'Invalid response'
            logger.error(f"✗ Authentication failed: {error_msg}")
            return jsonify({'success': False, 'error': error_msg})
            
    except Exception as e:
        logger.error(f"✗ Authentication error: {e}")
        return jsonify({'success': False, 'error': str(e)})

# ============ LIVE DATA ROUTES ============

@app.route('/api/indices')
def get_indices():
    """Get current index values from live_data"""
    return jsonify({
        'status': 'success',
        'data': live_data,
        'timestamp': datetime.now().isoformat(),
        'authenticated': auth_token is not None
    })

@app.route('/api/quote/<symbol>')
def get_quote(symbol):
    """Get quote for a specific symbol"""
    try:
        if not auth_token:
            return jsonify({'error': 'Not authenticated with Angel One'}), 401
        
        # Try Angel One first
        try:
            response = smart_api.getQuote('NSE', symbol)
            if response and response.get('status'):
                logger.info(f"Fetched {symbol} from Angel One")
                return jsonify({
                    'source': 'angel_one',
                    'symbol': symbol,
                    'data': response.get('data', {})
                })
        except Exception as e:
            logger.warning(f"Angel One quote failed for {symbol}: {e}")
        
        # Fallback to Yahoo Finance
        import requests
        url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=price"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            logger.info(f"Fetched {symbol} from Yahoo Finance")
            return jsonify({
                'source': 'yahoo_finance',
                'symbol': symbol,
                'data': response.json()
            })
        else:
            return jsonify({'error': 'Symbol not found'}), 404
            
    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/positions')
def get_positions():
    """Get current positions from Angel One"""
    try:
        if not auth_token:
            return jsonify({'error': 'Not authenticated with Angel One'}), 401
        
        positions = smart_api.position()
        
        if positions and positions.get('status'):
            logger.info(f"Fetched {len(positions.get('data', []))} positions from Angel One")
            return jsonify({
                'status': 'success',
                'data': positions.get('data', []),
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': 'Failed to fetch positions'}), 400
            
    except Exception as e:
        logger.error(f"Error fetching positions: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/holdings')
def get_holdings():
    """Get current holdings from Angel One"""
    try:
        if not auth_token:
            return jsonify({'error': 'Not authenticated with Angel One'}), 401
        
        holdings = smart_api.holding()
        
        if holdings and holdings.get('status'):
            logger.info(f"Fetched {len(holdings.get('data', []))} holdings from Angel One")
            return jsonify({
                'status': 'success',
                'data': holdings.get('data', []),
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': 'Failed to fetch holdings'}), 400
            
    except Exception as e:
        logger.error(f"Error fetching holdings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orderbook')
def get_orders():
    """Get order history from Angel One"""
    try:
        if not auth_token:
            return jsonify({'error': 'Not authenticated with Angel One'}), 401
        
        orders = smart_api.orderBook()
        
        if orders and orders.get('status'):
            logger.info(f"Fetched {len(orders.get('data', []))} orders from Angel One")
            return jsonify({
                'status': 'success',
                'data': orders.get('data', []),
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': 'Failed to fetch orders'}), 400
            
    except Exception as e:
        logger.error(f"Error fetching orders: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile')
def get_profile():
    """Get user profile from Angel One"""
    try:
        if not auth_token or not refresh_token:
            return jsonify({'error': 'Not authenticated with Angel One'}), 401
        
        profile = smart_api.getProfile(refresh_token)
        
        if profile and profile.get('status'):
            logger.info("Fetched user profile from Angel One")
            return jsonify({
                'status': 'success',
                'data': profile.get('data', {}),
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': 'Failed to fetch profile'}), 400
            
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return jsonify({'error': str(e)}), 500

# ============ LIVE DATA FEED ============

def start_live_feed():
    """Start polling for live market data from Angel One"""
    def fetch_live_data():
        import time
        error_count = 0
        max_errors = 5
        
        while True:
            try:
                if not auth_token:
                    logger.warning("Not authenticated, skipping live data fetch")
                    time.sleep(5)
                    continue
                
                # Fetch LTP for indices
                for name, token in INSTRUMENT_TOKENS.items():
                    try:
                        # Determine exchange based on index
                        exchange = "NSE" if name != "SENSEX" else "BSE"
                        symbol_name = "SENSEX" if name == "SENSEX" else name
                        
                        # Get LTP data from Angel One
                        response = smart_api.ltpData(exchange, symbol_name, token)
                        
                        if response and response.get('status') and response.get('data'):
                            data = response['data']
                            ltp = float(data.get('ltp', 0))
                            close = float(data.get('close', ltp))
                            
                            if ltp > 0:
                                change = ltp - close
                                change_pct = (change / close * 100) if close > 0 else 0
                                
                                live_data[name] = {
                                    'price': round(ltp, 2),
                                    'change': round(change, 2),
                                    'changePct': round(change_pct, 2),
                                    'volume': data.get('volume', 0),
                                    'open': data.get('open', 0),
                                    'high': data.get('high', 0),
                                    'low': data.get('low', 0),
                                    'timestamp': datetime.now().isoformat()
                                }
                                
                                logger.info(f"{name}: ₹{ltp:.2f} ({change:+.2f}, {change_pct:+.2f}%)")
                                error_count = 0
                        else:
                            logger.warning(f"Invalid response for {name}: {response}")
                    
                    except Exception as e:
                        logger.error(f"Error fetching {name}: {e}")
                        error_count += 1
                
                if error_count > max_errors:
                    logger.error(f"Too many errors ({error_count}), stopping live feed")
                    break
                
                # Wait 2 seconds before next fetch
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Live data fetch error: {e}")
                error_count += 1
                if error_count > max_errors:
                    logger.error("Too many errors, stopping live feed")
                    break
                time.sleep(5)
    
    # Start in background thread
    feed_thread = threading.Thread(target=fetch_live_data, daemon=True)
    feed_thread.start()
    logger.info("✓ Live data feed thread started")

# ============ HEALTH CHECK ============

@app.route('/health')
def health():
    """Health check endpoint with detailed status"""
    return jsonify({
        'status': 'operational',
        'timestamp': datetime.now().isoformat(),
        'authentication': {
            'authenticated': auth_token is not None,
            'client_id': CLIENT_ID,
            'has_auth_token': bool(auth_token),
            'has_feed_token': bool(feed_token),
            'has_refresh_token': bool(refresh_token)
        },
        'live_data': live_data,
        'available_endpoints': [
            '/api/indices - Live index prices',
            '/api/quote/<symbol> - Quote for specific symbol',
            '/api/positions - Your positions',
            '/api/holdings - Your holdings',
            '/api/orderbook - Order history',
            '/api/profile - Your profile'
        ]
    })

@app.route('/')
def home():
    """Home page with setup instructions and auto-login"""
    auth_status = "✓ Authenticated" if auth_token else "✗ Not Authenticated"
    auth_color = "#22c55e" if auth_token else "#ef4444"
    
    return f"""
    <html>
    <head>
        <title>Angel One SmartAPI Server</title>
        <style>
            * {{ margin: 0; padding: 0; }}
            body {{ 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: #e6eef8;
                padding: 40px 20px;
                min-height: 100vh;
            }}
            .container {{ max-width: 900px; margin: 0 auto; }}
            h1 {{ color: #3b82f6; margin-bottom: 10px; font-size: 2.5em; }}
            .subtitle {{ color: #94a3b8; margin-bottom: 30px; font-size: 1.1em; }}
            .status-box {{
                background: rgba(59, 130, 246, 0.1);
                border: 2px solid #3b82f6;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
            }}
            .status-item {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 10px 0;
            }}
            .status-badge {{
                padding: 6px 12px;
                border-radius: 4px;
                font-weight: 600;
                color: white;
                background: {auth_color};
            }}
            .step {{
                background: rgba(148, 163, 184, 0.1);
                border-left: 4px solid #3b82f6;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .step h3 {{ color: #22c55e; margin-bottom: 10px; }}
            .code {{
                background: #1e293b;
                color: #22c55e;
                padding: 12px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                margin: 10px 0;
                overflow-x: auto;
            }}
            .button {{
                display: inline-block;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 14px 28px;
                border-radius: 6px;
                text-decoration: none;
                margin: 10px 10px 10px 0;
                font-weight: 600;
                transition: all 0.3s;
                border: none;
                cursor: pointer;
                font-size: 1em;
            }}
            .button:hover {{
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
            }}
            .button.secondary {{
                background: rgba(59, 130, 246, 0.2);
                border: 2px solid #3b82f6;
            }}
            .endpoints {{
                background: rgba(148, 163, 184, 0.05);
                border: 1px solid #475569;
                border-radius: 8px;
                padding: 20px;
                margin-top: 30px;
            }}
            .endpoint {{
                padding: 10px;
                margin: 5px 0;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 4px;
                font-family: monospace;
            }}
            .endpoint-method {{
                color: #22c55e;
                font-weight: 600;
                margin-right: 10px;
            }}
            .warning {{
                background: rgba(239, 68, 68, 0.1);
                border-left: 4px solid #ef4444;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                color: #fca5a5;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Angel One SmartAPI Server</h1>
            <p class="subtitle">Live market data integration for TheOptionTrader</p>
            
            <div class="status-box">
                <div class="status-item">
                    <span>Authentication Status:</span>
                    <span class="status-badge">{auth_status}</span>
                </div>
                <div class="status-item">
                    <span>Client ID:</span>
                    <span>{CLIENT_ID}</span>
                </div>
                <div class="status-item">
                    <span>API Key:</span>
                    <span>{API_KEY[:8]}*** (configured)</span>
                </div>
                <div class="status-item">
                    <span>Server URL:</span>
                    <span>http://localhost:5001</span>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="/login" class="button">🔐 Authenticate with Angel One</a>
                <a href="/health" class="button secondary">📊 Check Live Data</a>
            </div>
            
            <div class="step">
                <h3>✅ Setup Instructions</h3>
                <p><strong>1. Create SmartAPI App:</strong></p>
                <p style="margin: 10px 0 0 20px;">Visit <a href="https://smartapi.angelbroking.com" style="color: #3b82f6;" target="_blank">https://smartapi.angelbroking.com</a> → Create New App</p>
                
                <p style="margin: 20px 0 0 0;"><strong>2. Update server.py:</strong></p>
                <p style="margin: 10px 0 0 20px;">Edit these lines in server.py:</p>
                <div class="code">PASSWORD = "your_password"
API_KEY = "your_api_key"
TOTP_SECRET = "your_totp" # (if you have 2FA)</div>
                
                <p style="margin: 20px 0 0 0;"><strong>3. Start Server:</strong></p>
                <div class="code">python3 server.py</div>
                
                <p style="margin: 20px 0 0 0;"><strong>4. Click "Authenticate with Angel One" above</strong></p>
            </div>
            
            <div class="endpoints">
                <h3 style="margin-bottom: 15px;">📡 Available API Endpoints</h3>
                <div class="endpoint"><span class="endpoint-method">GET</span>/api/indices</div>
                <div class="endpoint"><span class="endpoint-method">GET</span>/api/quote/RELIANCE</div>
                <div class="endpoint"><span class="endpoint-method">GET</span>/api/positions</div>
                <div class="endpoint"><span class="endpoint-method">GET</span>/api/holdings</div>
                <div class="endpoint"><span class="endpoint-method">GET</span>/api/orderbook</div>
                <div class="endpoint"><span class="endpoint-method">GET</span>/api/profile</div>
                <div class="endpoint"><span class="endpoint-method">GET</span>/health</div>
            </div>
            
            <div class="warning">
                ⚠️ <strong>Important:</strong> Keep your PASSWORD and API_KEY secure. Never commit credentials to git. Use environment variables in production.
            </div>
        </div>
    </body>
    </html>
    """

if __name__ == '__main__':
    print("=" * 70)
    print("🚀 Starting Angel One SmartAPI Server")
    print("=" * 70)
    print(f"📱 Client ID: {CLIENT_ID}")
    print(f"🔑 API Key: {API_KEY[:8]}***")
    print(f"🌐 Server URL: http://localhost:5001")
    print(f"🔐 Login URL: http://localhost:5001/login")
    print(f"📊 Health Check: http://localhost:5001/health")
    print("=" * 70)
    
    # Try auto-authentication on startup
    print("\n⏳ Attempting auto-authentication...")
    if authenticate_angel_one():
        print("✓ Auto-authentication successful!")
        start_live_feed()
    else:
        print("⚠️  Auto-authentication failed. Please click /login to authenticate manually.")
    
    print("\n⚠️  Security Note: Keep PASSWORD and API_KEY secure!")
    print("=" * 70 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5001, use_reloader=False)
