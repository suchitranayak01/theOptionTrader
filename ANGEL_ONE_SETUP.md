# Angel One Live Data Integration - Complete Setup Guide

## 🎯 Quick Overview

Connect your Angel One account (Client ID: **AABZ373457**) to TheOptionTrader for live market data - completely FREE (no subscription fees unlike Zerodha).

## ✅ Why Angel One?

- ✨ **100% FREE** - No API subscription charges
- 🚀 Real-time market data
- 📊 Live position & holdings tracking
- ⚡ Fast and reliable
- 🔒 Secure authentication

---

## 📋 Prerequisites

1. **Angel One Trading Account** - Client ID: AABZ373457 ✓
2. **Python 3.8+** installed
3. **Angel One login password**
4. **API Key** from SmartAPI portal

---

## 🔑 Step 1: Get Angel One API Key

### 1.1 Register for SmartAPI (FREE)

1. Visit: **https://smartapi.angelbroking.com/**
2. Click "**Register**" (top right)
3. Fill registration form:
   - Client Code: `AABZ373457`
   - Email: Your email
   - Mobile: Your registered mobile number
4. Verify email and mobile OTP
5. Login to SmartAPI portal

### 1.2 Create Your App

1. After login, click "**My Apps**"
2. Click "**Create New App**"
3. Fill details:
   - **App Name**: TheOptionTrader
   - **App Type**: Web Application
   - **Description**: Live market data for options trading
4. Click "**Submit**"
5. You'll get:
   - ✅ **API Key** (e.g., `AbCdEfGh`)
   - ✅ No API Secret needed (unlike Zerodha!)

### 1.3 Enable TOTP (If you have 2FA)

If you've enabled 2-Factor Authentication on your Angel One account:

1. In SmartAPI portal, go to "**Settings**"
2. Copy your **TOTP Secret Key**
3. Keep it handy - you'll need it in server.py

> **Note:** If you don't use 2FA, leave TOTP_SECRET as is in server.py

---

## 🛠️ Step 2: Install Dependencies

Open Terminal and run:

```bash
cd /Users/sabirnayak/Desktop/Nifty-straddle
pip3 install -r requirements.txt
```

This installs:
- ✅ `smartapi-python` - Angel One official SDK
- ✅ `flask` - Web server
- ✅ `flask-cors` - API access
- ✅ `pyotp` - 2FA support

---

## ⚙️ Step 3: Configure Credentials

Edit **server.py** and update these lines (around line 19-22):

```python
# Angel One Credentials
CLIENT_ID = "AABZ373457"  # ✓ Already set!
PASSWORD = "your_angel_one_password"  # ⚠️ UPDATE THIS
API_KEY = "your_api_key_from_smartapi"  # ⚠️ UPDATE THIS
TOTP_SECRET = "your_totp_secret_here"  # ⚠️ Only if you have 2FA
```

### Example:
```python
CLIENT_ID = "AABZ373457"
PASSWORD = "MyPassword@123"
API_KEY = "AbCdEfGh"
TOTP_SECRET = "JBSWY3DPEHPK3PXP"  # Or leave as is if no 2FA
```

> ⚠️ **Security:** Never commit server.py to GitHub with real passwords!

---

## 🚀 Step 4: Start the Server

In Terminal:

```bash
cd /Users/sabirnayak/Desktop/Nifty-straddle
python3 server.py
```

**Expected Output:**
```
============================================================
🚀 Starting Angel One SmartAPI Server
============================================================
Client ID: AABZ373457
Server URL: http://localhost:5000
Login URL: http://localhost:5000/login
Health Check: http://localhost:5000/health
============================================================
⚠️  Make sure to set PASSWORD and API_KEY in server.py
============================================================
* Running on http://0.0.0.0:5000
```

---

## 🔐 Step 5: Authenticate

1. Open browser: **http://localhost:5000/login**
2. Server will automatically login using your credentials
3. If successful, you'll see:
   ```
   ✓ Angel One Authentication Successful!
   Live data is now streaming...
   ```
4. Page will auto-close after 3 seconds

### Troubleshooting Login:

**Error: "Invalid Credentials"**
- Check PASSWORD in server.py matches your Angel One password
- Try logging into Angel One web/app to verify password

**Error: "Invalid API Key"**
- Verify API_KEY from SmartAPI portal
- Make sure you copied the full key

**Error: "Invalid TOTP"**
- If you have 2FA: Check TOTP_SECRET is correct
- If you don't have 2FA: Set `TOTP_SECRET = "your_totp_secret_here"` (don't change it)

---

## ✅ Step 6: Verify Live Data

### 6.1 Check Health Status

Visit: **http://localhost:5000/health**

Should show:
```json
{
  "status": "ok",
  "authenticated": true,
  "client_id": "AABZ373457",
  "live_data": {
    "NIFTY 50": {"price": 23567.25, "change": 45.30, "changePct": 0.19},
    "SENSEX": {"price": 78234.50, "change": -123.40, "changePct": -0.16},
    "BANK NIFTY": {"price": 48932.75, "change": 89.25, "changePct": 0.18}
  }
}
```

### 6.2 Check Live Indices

Visit: **http://localhost:5000/api/indices**

Should show real-time data updating every 2 seconds!

### 6.3 Open Your Website

1. Open **index.html** in browser
2. Watch the header tickers - they should show **LIVE data** from Angel One!
3. Data updates automatically

---

## 📊 Available API Endpoints

| Endpoint | Description | Auth Required |
|----------|-------------|---------------|
| `/login` | Authenticate with Angel One | No |
| `/health` | Server status & live data preview | No |
| `/api/indices` | Real-time Nifty/Sensex/Bank Nifty | Yes |
| `/api/quote/RELIANCE` | Live quote for any symbol | Yes |
| `/api/positions` | Your current trading positions | Yes |
| `/api/holdings` | Your stock holdings | Yes |
| `/api/orderbook` | Your order history | Yes |
| `/api/profile` | Your Angel One profile | Yes |

---

## 🎨 How It Works

### Backend (server.py)
```
1. Authenticate with Angel One SmartAPI
2. Get auth token & feed token
3. Start background thread to fetch live data every 2 seconds
4. Serve data via REST API endpoints
```

### Frontend (index.html)
```
1. Try to fetch from http://localhost:5000/api/indices
2. If server is running → Display LIVE data
3. If server is offline → Fallback to demo data
```

### Data Flow
```
Angel One → SmartAPI → server.py → REST API → index.html → Your Browser
   (2 sec)     (Real-time)    (Local)    (HTTP)     (Display)
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep API_KEY and PASSWORD secure
- Run server locally only
- Use environment variables for sensitive data
- Logout when not trading

### ❌ DON'T:
- Commit passwords to GitHub
- Share API_KEY publicly
- Run server on public networks
- Leave server running unattended

### Optional: Use .env file

1. Create `.env` file:
```bash
ANGEL_CLIENT_ID=AABZ373457
ANGEL_PASSWORD=your_password
ANGEL_API_KEY=your_api_key
ANGEL_TOTP_SECRET=your_totp_secret
```

2. Update server.py:
```python
from dotenv import load_dotenv
load_dotenv()

CLIENT_ID = os.getenv('ANGEL_CLIENT_ID')
PASSWORD = os.getenv('ANGEL_PASSWORD')
API_KEY = os.getenv('ANGEL_API_KEY')
TOTP_SECRET = os.getenv('ANGEL_TOTP_SECRET')
```

---

## 🐛 Common Issues & Fixes

### Issue: "Module 'SmartApi' not found"
**Fix:**
```bash
pip3 install smartapi-python
```

### Issue: "Connection timeout"
**Fix:**
- Check internet connection
- Angel One servers may be down (market hours only)
- Try again after a minute

### Issue: "Session expired"
**Fix:**
- Go to http://localhost:5000/login again
- Sessions expire after 24 hours

### Issue: Tickers showing demo data
**Fix:**
1. Check server is running: `ps aux | grep python`
2. Visit http://localhost:5000/health
3. Check browser console for errors (F12)
4. Verify CORS is enabled in server.py

### Issue: "Rate limit exceeded"
**Fix:**
- Angel One allows 1 request/second for LTP
- Server handles this automatically
- If still happening, increase sleep time in server.py

---

## 💰 Pricing

### Angel One SmartAPI
- ✅ **FREE** - No API fees
- ✅ **FREE** - No subscription charges
- ✅ **FREE** - Unlimited API calls (within rate limits)
- ✅ **FREE** - Historical data included

### Rate Limits
- **LTP (Last Traded Price)**: 1 request/second
- **Quote Data**: 1 request/second  
- **Order Placement**: 10 orders/second
- **Position/Holdings**: 1 request/second

---

## 🎯 Next Steps

Once live data is working:

1. ✅ **Option Chain**: Fetch live option chain data
2. ✅ **Order Placement**: Place orders from TheOptionTrader
3. ✅ **Alerts**: Set up price alerts with WhatsApp integration
4. ✅ **Portfolio Tracking**: Track P&L in real-time
5. ✅ **Strategy Builder**: Automate your trading strategies

---

## 📞 Support & Resources

- **Angel One SmartAPI Docs**: https://smartapi.angelbroking.com/docs
- **Python SDK GitHub**: https://github.com/angelbroking-github/smartapi-python
- **Support Email**: smartapi@angelbroking.com
- **Forum**: https://smartapi.angelbroking.com/forum

---

## 📝 Quick Start Checklist

- [ ] Got API Key from SmartAPI portal
- [ ] Updated PASSWORD in server.py
- [ ] Updated API_KEY in server.py
- [ ] Updated TOTP_SECRET (if using 2FA)
- [ ] Installed Python dependencies
- [ ] Started server with `python3 server.py`
- [ ] Logged in at http://localhost:5000/login
- [ ] Verified at http://localhost:5000/health
- [ ] Checked live data at http://localhost:5000/api/indices
- [ ] Opened index.html and saw live tickers

---

**🎉 Ready to trade with live data? Start the server and watch the markets in real-time!**

---

### Terminal Commands Summary

```bash
# Navigate to project
cd /Users/sabirnayak/Desktop/Nifty-straddle

# Install dependencies
pip3 install -r requirements.txt

# Start server
python3 server.py

# In another terminal, open browser
open http://localhost:5000/login

# Check health
open http://localhost:5000/health

# View live data
open http://localhost:5000/api/indices

# Open your website
open index.html
```

---

**Last Updated:** January 9, 2026  
**Your Client ID:** AABZ373457  
**Status:** Ready to configure and launch! 🚀
