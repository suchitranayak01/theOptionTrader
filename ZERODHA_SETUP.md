# Zerodha Live Data Integration - Setup Guide

## 🚀 Quick Start

This guide will help you connect your Zerodha account to TheOptionTrader for live market data.

## 📋 Prerequisites

1. **Zerodha Trading Account** (Already have: ZJ1908)
2. **Python 3.8+** installed on your system
3. **Internet connection**

## 🔑 Step 1: Get Kite Connect API Credentials

Your Zerodha login credentials (ZJ1908 / Shreyan@123) are used to access the Kite Connect Developer Portal, **NOT** the API directly.

### Register for Kite Connect:

1. Visit **https://developers.kite.trade/**
2. Click "**Login**" and use your Zerodha credentials:
   - User ID: `ZJ1908`
   - Password: `Shreyan@123`
3. Complete the 2FA (if required)
4. Click "**My Apps**" in the top navigation
5. Click "**Create New App**"
6. Fill in the details:
   - **App Name**: TheOptionTrader
   - **Redirect URL**: `http://localhost:5000/callback`
   - **Description**: Live market data for options trading
7. Click "**Create**"
8. You'll receive:
   - **API Key** (something like: `abcd1234efgh5678`)
   - **API Secret** (something like: `xyz789pqr456stu123`)

### ⚠️ Important Notes:
- Kite Connect has a **₹2,000/month** subscription fee after 1-month free trial
- You get **3 API calls per second** rate limit
- Historical data and live data included
- You can create **one app for free** during trial

## 🛠️ Step 2: Install Python Dependencies

Open Terminal and run:

```bash
cd /Users/sabirnayak/Desktop/Nifty-straddle
pip3 install -r requirements.txt
```

This will install:
- `kiteconnect` - Official Zerodha API library
- `flask` - Web server
- `flask-cors` - Cross-origin requests

## ⚙️ Step 3: Configure API Credentials

Edit the `server.py` file and replace the placeholder values:

```python
# Find these lines (around line 19-20):
API_KEY = "your_api_key_here"  # Replace with your API Key from Step 1
API_SECRET = "your_api_secret_here"  # Replace with your API Secret from Step 1
```

**Example:**
```python
API_KEY = "abcd1234efgh5678"
API_SECRET = "xyz789pqr456stu123"
```

## 🚀 Step 4: Start the Server

In Terminal, run:

```bash
cd /Users/sabirnayak/Desktop/Nifty-straddle
python3 server.py
```

You should see:
```
============================================================
🚀 Starting Zerodha Kite Connect Server
============================================================
Server URL: http://localhost:5000
Login URL: http://localhost:5000/login
Health Check: http://localhost:5000/health
============================================================
* Running on http://0.0.0.0:5000
```

## 🔐 Step 5: Authenticate with Zerodha

1. Open your browser and go to: **http://localhost:5000/login**
2. You'll be redirected to Zerodha login page
3. Enter your credentials:
   - User ID: `ZJ1908`
   - Password: `Shreyan@123`
4. Complete 2FA (TOTP/PIN)
5. **Authorize the app** when prompted
6. You'll be redirected back to `http://localhost:5000/callback`
7. If successful, you'll see: "✓ Authentication Successful!"

## ✅ Step 6: Verify Live Data

Check if live data is flowing:

1. Visit: **http://localhost:5000/health**
   - Should show: `"authenticated": true` and `"ticker_running": true`

2. Visit: **http://localhost:5000/api/indices**
   - Should show live prices for NIFTY, SENSEX, BANK NIFTY

3. Open **index.html** in your browser
   - Tickers should now show **live data** from Zerodha
   - Data updates automatically every few seconds

## 📊 Available API Endpoints

Once the server is running and authenticated, you can access:

| Endpoint | Description | Example |
|----------|-------------|---------|
| `/api/indices` | Live index prices (Nifty, Sensex, Bank Nifty) | GET |
| `/api/quote/RELIANCE` | Quote for specific symbol | GET |
| `/api/option-chain/NIFTY` | Option chain for NIFTY | GET |
| `/api/positions` | Your current trading positions | GET |
| `/api/holdings` | Your holdings | GET |
| `/api/orders` | Order history | GET |
| `/api/profile` | Your Zerodha profile info | GET |

## 🔧 Troubleshooting

### Error: "TokenException: Missing api_key"
- Make sure you've updated `API_KEY` in `server.py`

### Error: "Connection refused"
- Server is not running. Start it with `python3 server.py`

### Error: "Invalid token"
- Authentication expired. Go to `http://localhost:5000/login` again

### Tickers showing demo data
- Check if server is running: `http://localhost:5000/health`
- Verify authentication status
- Check browser console for errors

### Rate limit exceeded
- Kite Connect allows 3 requests/second
- Server handles this automatically with WebSocket for live data

## 💡 How It Works

1. **Backend (server.py)**:
   - Authenticates with Zerodha using OAuth
   - Opens WebSocket connection for live price updates
   - Stores data in memory and serves via REST API

2. **Frontend (index.html, Options360.html)**:
   - Tries to fetch from `http://localhost:5000/api/indices`
   - If server is running → displays **live data**
   - If server is not available → falls back to **demo data**

## 🔒 Security Notes

- **Never commit** `API_KEY` and `API_SECRET` to GitHub
- `.gitignore` already excludes `.env` files
- Access token expires daily - re-login required
- Server runs locally only (not accessible from internet)

## 📝 Next Steps

After live data is working:

1. **Option Chain**: Integrate live option chain data
2. **Position Tracking**: Show your actual Zerodha positions
3. **Order Placement**: Add buy/sell functionality
4. **Alerts**: Set up WhatsApp/Telegram alerts for price movements

## 💰 Kite Connect Pricing

- **Free trial**: 1 month
- **After trial**: ₹2,000/month
- **What you get**:
  - Live streaming data
  - Historical data (last 60 days tick data)
  - Order placement APIs
  - Portfolio management
  - 3 API calls/second

## 📞 Support

- **Kite Connect Docs**: https://kite.trade/docs/connect/v3/
- **Forum**: https://kite.trade/forum/
- **Email**: kiteconnect@zerodha.com

---

**Ready to go live?** Start the server and enjoy real-time market data! 🚀
