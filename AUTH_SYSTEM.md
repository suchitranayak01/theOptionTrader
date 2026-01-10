# Authentication & Profile Management System

## Features Implemented

### ✅ Persistent Login Until Midnight
- Users stay logged in until midnight (00:00) each day
- Session automatically expires and requires re-login after midnight
- No auto-logout during the day

### ✅ User Registration & Storage
- All user signups are stored in localStorage (`allUsers`)
- User profiles persist across sessions
- Each user has a unique profile with:
  - ID (timestamp-based)
  - Name
  - Email
  - Mobile number
  - Password (stored locally)
  - Trader type (Buyer/Seller/Both)
  - Premium status
  - Creation date

### ✅ Profile Management
- Editable profile page at `profile.html`
- Users can update:
  - Name
  - Mobile number
  - Trader type (Option Buyer, Option Seller, or Both)
- Email is locked (cannot be changed)
- Profile dropdown in header shows:
  - User name
  - Email
  - Premium badge (if applicable)
  - Links to Profile and Dashboard
  - Logout option

### ✅ Premium Features
- Users who select "Angel One Account" during signup get:
  - 1 month free premium
  - Premium badge in profile
  - Automatic expiry tracking

## File Structure

```
auth.js           - Core authentication library
login.html        - Login & Signup page
profile.html      - User profile editing page
index.html        - Homepage (with profile dropdown)
Options360.html   - Dashboard (with profile dropdown)
```

## How It Works

### Session Management

1. **Login**: Creates a session that expires at next midnight
   ```javascript
   AUTH.login(email, password) // Returns {success, message, user}
   ```

2. **Session Check**: Automatically validates on every page load
   ```javascript
   AUTH.isLoggedIn() // Returns true/false
   ```

3. **Auto-Expire**: Session expires at 00:00 (midnight)
   - Expires at: `new Date().setHours(24, 0, 0, 0)`

### User Data Storage

**localStorage Keys:**
- `userSession` - Current active session
  ```json
  {
    "email": "user@example.com",
    "loginTime": "2026-01-10T10:30:00.000Z",
    "expiresAt": "2026-01-11T00:00:00.000Z"
  }
  ```

- `allUsers` - Array of all registered users
  ```json
  [{
    "id": "1736515200000",
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "+91 98765 43210",
    "password": "password123",
    "traderType": "buyer",
    "angelAccount": true,
    "isPremium": true,
    "premiumExpiry": "2026-02-10T00:00:00.000Z",
    "createdAt": "2026-01-10T10:00:00.000Z"
  }]
  ```

- `userProfile` - Current user's profile (cached for quick access)

## Usage Examples

### Check if User is Logged In
```javascript
if (AUTH.isLoggedIn()) {
  console.log('User is logged in');
} else {
  window.location.href = 'login.html';
}
```

### Get Current User Profile
```javascript
const profile = AUTH.getUserProfile();
console.log(profile.name, profile.email, profile.traderType);
```

### Update Profile
```javascript
AUTH.updateProfile({
  name: 'New Name',
  mobile: '+91 99999 88888',
  traderType: 'both'
});
```

### Logout
```javascript
AUTH.logout();
window.location.href = 'index.html';
```

## Profile Dropdown

The profile dropdown automatically appears in the header when a user is logged in, replacing the "Login" button.

**Features:**
- Shows user's first name
- Displays email and premium badge
- Links to:
  - 👤 My Profile
  - 📊 Dashboard
  - 🚪 Logout

**Auto-initialization:**
```javascript
// Automatically runs on every page
AUTH.initializeProfileDropdown();
```

## Security Notes

⚠️ **Current Implementation (Development):**
- Passwords stored in plain text in localStorage
- No server-side validation
- All data client-side only

🔒 **For Production:**
- Move to server-side authentication
- Hash passwords (bcrypt, argon2)
- Use JWT tokens
- Implement HTTPS
- Add rate limiting
- Use secure session cookies

## Testing

### Create a Test Account
1. Go to http://localhost:8000/login.html
2. Click "Create Account"
3. Fill in details:
   - Name: Test User
   - Email: test@example.com
   - Mobile: +91 98765 43210
   - Password: test1234
   - Trader Type: Option Buyer
4. Check "Angel One Account" for premium
5. Click "Create Account"

### Verify Session Persistence
1. Login and navigate around the site
2. Close browser tab
3. Open http://localhost:8000/index.html
4. You should still be logged in (profile dropdown visible)
5. Session expires automatically at midnight

### Test Profile Editing
1. Click profile dropdown → "My Profile"
2. Edit name, mobile, or trader type
3. Click "Save Changes"
4. Verify changes are reflected everywhere

## API Reference

See `auth.js` for complete AUTH object methods:
- `isLoggedIn()`
- `getSession()`
- `getUserProfile()`
- `createSession(email)`
- `login(email, password)`
- `signup(userData)`
- `updateProfile(updates)`
- `logout()`
- `getAllUsers()`
- `initializeProfileDropdown()`
