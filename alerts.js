// ============================================
// ALERT SYSTEM FOR OPTIONS360
// ============================================
let previousIV = null;
let previousPCR = null;
let straddleLow = null;
let lastAlertTimestamps = {
  iv: 0,
  pcr: 0,
  straddle10: 0,
  straddle20: 0,
  straddle30: 0
};

// Alert sound
function playAlertSound() {
  if (document.getElementById('soundAlerts')?.checked) {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGJ0fPTgjMGHGi56+GZSA0OUqzl8K1hGQU0jdXzzn0pBSd+zPLZkT0KFmS36+OdTgwOT6Df8bJcGwYugc/y2Ig2Bx1ov+zglUoODlGn4/KsYBsGM43U8st9KAUme8rx25E+ChhluOzimEwNDlKp5PKqYBoGMIvS8sx+KQUle8vx25E+ChhluOzimEwNDlKp5PKqYBoGMIvS8sx+KQUle8vx25E+ChhluOzimEwNDlKp5PKqYBoGMIvS8sx+KQUle8vx25E+ChhluOzimEwNDlKp5PKqYBoGMIvS8sx+KQUle8vx25E+ChhluOzimEwNDlKp5PKqYBoGMIvS8sx+KQUle8vx25E+ChhluOzimEwNDlKp5PKqYBoGMIvS8sx+KQUle8vx25E+ChhluOzimEwNDlKp5PKqYBoGMIvS8sx+KQUle8vx25E+ChhluOzimEwN');
    audio.play().catch(e => console.log('Audio play failed:', e));
  }
}

// Show notification
function showNotification(title, message, type = 'info') {
  if (!document.getElementById('enableAlerts')?.checked) return;
  
  // Browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message, icon: 'logo.png' });
  }
  
  // Visual alert banner
  const alertBanner = document.createElement('div');
  alertBanner.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'warning' ? '#eab308' : type === 'danger' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 350px;
  `;
  alertBanner.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 4px;">${title}</div>
    <div style="font-size: 0.9rem;">${message}</div>
  `;
  
  document.body.appendChild(alertBanner);
  setTimeout(() => {
    alertBanner.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => alertBanner.remove(), 300);
  }, 5000);
  
  playAlertSound();
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Check IV alert
function checkIVAlert(currentIV) {
  if (!document.getElementById('ivAlertEnabled')?.checked) return;
  
  const threshold = parseFloat(document.getElementById('ivThreshold')?.value || 20);
  const now = Date.now();
  
  if (currentIV > threshold && (now - lastAlertTimestamps.iv) > 300000) { // 5 min cooldown
    lastAlertTimestamps.iv = now;
    showNotification(
      '🔔 High IV Alert!',
      `Implied Volatility is ${currentIV.toFixed(2)}% (above ${threshold}%)`,
      'warning'
    );
    
    // Send to other channels
    if (document.getElementById('whatsappAlerts')?.checked) {
      sendWhatsAppAlert(`IV Alert: ${currentIV.toFixed(2)}%`);
    }
    if (document.getElementById('telegramAlerts')?.checked) {
      sendTelegramAlert(`IV Alert: ${currentIV.toFixed(2)}%`);
    }
  }
}

// Check PCR alert
function checkPCRAlert(currentPCR) {
  if (!document.getElementById('pcrAlertEnabled')?.checked) return;
  
  const bullishThreshold = parseFloat(document.getElementById('pcrBullish')?.value || 1.0);
  const bearishThreshold = parseFloat(document.getElementById('pcrBearish')?.value || 1.0);
  const now = Date.now();
  
  if (previousPCR !== null && (now - lastAlertTimestamps.pcr) > 300000) { // 5 min cooldown
    if (currentPCR > bullishThreshold && previousPCR <= bullishThreshold) {
      lastAlertTimestamps.pcr = now;
      showNotification(
        '📈 Bullish PCR Shift!',
        `PCR crossed above ${bullishThreshold} - Bullish trend detected (Current: ${currentPCR.toFixed(2)})`,
        'info'
      );
    } else if (currentPCR < bearishThreshold && previousPCR >= bearishThreshold) {
      lastAlertTimestamps.pcr = now;
      showNotification(
        '📉 Bearish PCR Shift!',
        `PCR dropped below ${bearishThreshold} - Bearish trend detected (Current: ${currentPCR.toFixed(2)})`,
        'danger'
      );
    }
  }
  
  previousPCR = currentPCR;
}

// Check Straddle Premium Jump
function checkStraddleJump(currentStraddle) {
  if (!document.getElementById('straddleAlertEnabled')?.checked) return;
  
  if (straddleLow === null || currentStraddle < straddleLow) {
    straddleLow = currentStraddle;
    return;
  }
  
  const jump = ((currentStraddle - straddleLow) / straddleLow) * 100;
  const now = Date.now();
  
  if (document.getElementById('alert30Enabled')?.checked && jump >= 30 && (now - lastAlertTimestamps.straddle30) > 600000) {
    lastAlertTimestamps.straddle30 = now;
    showNotification(
      '🚨 MAJOR Straddle Jump!',
      `Straddle premium jumped ${jump.toFixed(1)}% from low (${straddleLow.toFixed(2)} → ${currentStraddle.toFixed(2)})`,
      'danger'
    );
    if (document.getElementById('telegramAlerts')?.checked) {
      sendTelegramAlert(`🚨 30% Straddle Jump: ${jump.toFixed(1)}%`);
    }
    if (document.getElementById('whatsappAlerts')?.checked) {
      sendWhatsAppAlert(`🚨 30% Straddle Jump: ${jump.toFixed(1)}%`);
    }
  } else if (document.getElementById('alert20Enabled')?.checked && jump >= 20 && (now - lastAlertTimestamps.straddle20) > 600000) {
    lastAlertTimestamps.straddle20 = now;
    showNotification(
      '⚠️ Significant Straddle Jump!',
      `Straddle premium jumped ${jump.toFixed(1)}% from low (${straddleLow.toFixed(2)} → ${currentStraddle.toFixed(2)})`,
      'warning'
    );
  } else if (document.getElementById('alert10Enabled')?.checked && jump >= 10 && (now - lastAlertTimestamps.straddle10) > 600000) {
    lastAlertTimestamps.straddle10 = now;
    showNotification(
      '📊 Straddle Jump Alert',
      `Straddle premium jumped ${jump.toFixed(1)}% from low (${straddleLow.toFixed(2)} → ${currentStraddle.toFixed(2)})`,
      'info'
    );
  }
}

// External messaging functions (placeholders - require backend integration)
function sendWhatsAppAlert(message) {
  console.log('WhatsApp Alert:', message);
  // In production, this would call your backend API to send WhatsApp message via Twilio/similar
}

function sendTelegramAlert(message) {
  console.log('Telegram Alert:', message);
  // In production, this would call Telegram Bot API
  // Example: fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`)
}

// Monitor metrics and trigger alerts
setInterval(() => {
  const ivElement = document.getElementById('metric-iv');
  const pcrElement = document.getElementById('metric-pcr');
  const straddleElement = document.getElementById('metric-straddle');
  
  if (ivElement && ivElement.textContent !== 'IV: --') {
    const ivMatch = ivElement.textContent.match(/[\d.]+/);
    if (ivMatch) {
      const currentIV = parseFloat(ivMatch[0]);
      checkIVAlert(currentIV);
    }
  }
  
  if (pcrElement && pcrElement.textContent !== 'PCR: --') {
    const pcrMatch = pcrElement.textContent.match(/[\d.]+/);
    if (pcrMatch) {
      const currentPCR = parseFloat(pcrMatch[0]);
      checkPCRAlert(currentPCR);
    }
  }
  
  if (straddleElement && straddleElement.textContent !== 'Straddle: --') {
    const straddleMatch = straddleElement.textContent.match(/[\d.]+/);
    if (straddleMatch) {
      const currentStraddle = parseFloat(straddleMatch[0]);
      checkStraddleJump(currentStraddle);
    }
  }
}, 5000); // Check every 5 seconds

// ============================================
// CHAT SYSTEM
// ============================================
let chatMessages = [];

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input?.value.trim();
  
  if (!message) return;
  
  const user = localStorage.getItem('user') || 'Anonymous';
  const timestamp = new Date().toLocaleTimeString();
  
  chatMessages.push({
    user: user,
    message: message,
    timestamp: timestamp
  });
  
  updateChatBox();
  input.value = '';
  
  // In production, send to backend/WebSocket for real-time sync
  // Example: socket.emit('chat_message', { user, message, timestamp });
}

function updateChatBox() {
  const chatBox = document.getElementById('chatBox');
  if (!chatBox) return;
  
  chatBox.innerHTML = chatMessages.map(msg => `
    <div style="margin-bottom: 10px; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 6px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #3b82f6; font-weight: 600; font-size: 0.85rem;">${msg.user}</span>
        <span style="color: #64748b; font-size: 0.75rem;">${msg.timestamp}</span>
      </div>
      <div style="color: #e6eef8; font-size: 0.9rem;">${msg.message}</div>
    </div>
  `).join('') || '<div style="color: #64748b; text-align: center; padding: 20px;">No messages yet</div>';
  
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Handle Enter key in chat
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });
  }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
