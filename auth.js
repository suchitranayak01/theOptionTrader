// Authentication and User Management System
// Handles login, logout, session persistence until midnight, and profile management

const AUTH = {
  // Check if user is logged in
  isLoggedIn() {
    const session = this.getSession();
    if (!session) return false;
    
    // Check if session has expired (after midnight)
    const now = new Date();
    const sessionDate = new Date(session.expiresAt);
    
    if (now > sessionDate) {
      this.logout();
      return false;
    }
    
    return true;
  },
  
  // Get current session
  getSession() {
    const sessionData = localStorage.getItem('userSession');
    return sessionData ? JSON.parse(sessionData) : null;
  },
  
  // Get current user profile
  getUserProfile() {
    const profileData = localStorage.getItem('userProfile');
    return profileData ? JSON.parse(profileData) : null;
  },
  
  // Create session (expires at midnight)
  createSession(email) {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight
    
    const session = {
      email: email,
      loginTime: now.toISOString(),
      expiresAt: midnight.toISOString()
    };
    
    localStorage.setItem('userSession', JSON.stringify(session));
    return session;
  },
  
  // Login user
  login(email, password) {
    // Get all users
    const users = this.getAllUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return { success: false, message: 'User not found. Please sign up first.' };
    }
    
    if (user.password !== password) {
      return { success: false, message: 'Incorrect password.' };
    }
    
    // Create session
    this.createSession(email);
    
    return { success: true, message: 'Login successful!', user: user };
  },
  
  // Register new user
  signup(userData) {
    const users = this.getAllUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === userData.email)) {
      return { success: false, message: 'Email already registered.' };
    }
    
    // Create new user profile
    const newUser = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      mobile: userData.mobile,
      password: userData.password,
      traderType: userData.traderType || 'buyer',
      angelAccount: userData.angelAccount || false,
      isPremium: userData.angelAccount || false,
      premiumExpiry: userData.angelAccount ? this.getPremiumExpiry() : null,
      createdAt: new Date().toISOString()
    };
    
    // Add to users list
    users.push(newUser);
    localStorage.setItem('allUsers', JSON.stringify(users));
    
    // Set as current profile
    localStorage.setItem('userProfile', JSON.stringify(newUser));
    
    // Create session
    this.createSession(newUser.email);
    
    return { success: true, message: 'Account created successfully!', user: newUser };
  },
  
  // Update user profile
  updateProfile(updates) {
    const session = this.getSession();
    if (!session) {
      return { success: false, message: 'Not logged in' };
    }
    
    const users = this.getAllUsers();
    const userIndex = users.findIndex(u => u.email === session.email);
    
    if (userIndex === -1) {
      return { success: false, message: 'User not found' };
    }
    
    // Update user data
    users[userIndex] = { ...users[userIndex], ...updates };
    localStorage.setItem('allUsers', JSON.stringify(users));
    
    // Update current profile
    localStorage.setItem('userProfile', JSON.stringify(users[userIndex]));
    
    return { success: true, message: 'Profile updated successfully!', user: users[userIndex] };
  },
  
  // Logout user
  logout() {
    localStorage.removeItem('userSession');
    // Keep userProfile for potential re-login
  },
  
  // Get all registered users
  getAllUsers() {
    const usersData = localStorage.getItem('allUsers');
    return usersData ? JSON.parse(usersData) : [];
  },
  
  // Get premium expiry date (1 month from now)
  getPremiumExpiry() {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    return expiry.toISOString();
  },
  
  // Initialize profile dropdown in header
  initializeProfileDropdown() {
    if (!this.isLoggedIn()) {
      return;
    }
    
    const session = this.getSession();
    const users = this.getAllUsers();
    const user = users.find(u => u.email === session.email);
    
    if (!user) return;
    
    // Update current profile
    localStorage.setItem('userProfile', JSON.stringify(user));
    
    // Find login link and replace with profile dropdown
    const loginLinks = document.querySelectorAll('a[href="login.html"]');
    loginLinks.forEach(loginLink => {
      const profileDropdown = this.createProfileDropdown(user);
      loginLink.parentNode.replaceChild(profileDropdown, loginLink);
    });
  },
  
  // Create profile dropdown HTML
  createProfileDropdown(user) {
    const container = document.createElement('div');
    container.style.cssText = 'position: relative; display: inline-block;';
    
    const button = document.createElement('button');
    button.style.cssText = 'background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;';
    button.innerHTML = `
      <span>${user.name.split(' ')[0]}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 8L2 4h8L6 8z"/>
      </svg>
    `;
    
    const dropdown = document.createElement('div');
    dropdown.style.cssText = 'display: none; position: absolute; right: 0; top: 100%; margin-top: 8px; background: white; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); min-width: 220px; z-index: 1000; border: 1px solid #e2e8f0;';
    dropdown.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
        <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${user.name}</div>
        <div style="font-size: 13px; color: #64748b;">${user.email}</div>
        ${user.isPremium ? '<div style="margin-top: 8px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">⭐ PREMIUM</div>' : ''}
      </div>
      <div style="padding: 8px 0;">
        <a href="profile.html" style="display: block; padding: 12px 16px; color: #334155; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
          <span style="margin-right: 8px;">👤</span> My Profile
        </a>
        <a href="Options360.html" style="display: block; padding: 12px 16px; color: #334155; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
          <span style="margin-right: 8px;">📊</span> Dashboard
        </a>
        <a href="#" onclick="AUTH.logout(); window.location.href='index.html'; return false;" style="display: block; padding: 12px 16px; color: #ef4444; text-decoration: none; border-top: 1px solid #e2e8f0; transition: background 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'">
          <span style="margin-right: 8px;">🚪</span> Logout
        </a>
      </div>
    `;
    
    button.onclick = (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    };
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });
    
    container.appendChild(button);
    container.appendChild(dropdown);
    
    return container;
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  AUTH.initializeProfileDropdown();
});
