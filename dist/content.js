// Content script for AI Chat Platforms integration
// This script runs on various AI chat platforms and can interact with the page

console.log(
  'AI Chat Manager content script loaded on:',
  window.location.hostname
);

// ==============================
// 1. PLATFORM CONFIGURATION AND DETECTION
// ==============================

// Comprehensive selector sets for different AI platforms
const PLATFORM_SELECTORS = {
  // Gemini selectors
  gemini: {
    chatTitle: [
      'h1[data-testid="conversation-title"]',
      '.conversation-title',
      'h1.font-semibold',
      'h1',
      '.chat-title',
    ],
    userMessage: [
      '[data-testid="user-message"]',
      '.user-message',
      '[data-testid="human-message"]',
    ],
    modelResponse: [
      '[data-testid="model-response"]',
      '[data-testid="bot-message"]',
      '.model-response',
    ],
    messages: [
      '[data-testid="user-message"], [data-testid="model-response"]',
      '.message',
      '.user-message, .model-response',
    ],
  },

  // ChatGPT selectors
  chatgpt: {
    chatTitle: [
      'h1[class*="text-"]',
      '[data-testid="conversation-title"]',
      '.conversation-header h1',
      'h1',
      'title',
    ],
    userMessage: [
      '[data-message-author-role="user"]',
      '.user-message',
      '[role="user"]',
    ],
    modelResponse: [
      '[data-message-author-role="assistant"]',
      '.assistant-message',
      '[role="assistant"]',
    ],
    messages: [
      '[data-message-author-role="user"], [data-message-author-role="assistant"]',
      '.message',
      '[role="user"], [role="assistant"]',
    ],
  },

  // Claude selectors
  claude: {
    chatTitle: [
      'h1[class*="font-"]',
      '[data-testid="chat-title"]',
      '.conversation-title',
      'h1',
      'title',
    ],
    userMessage: [
      '[data-role="user"]',
      '.user-message',
      '[data-testid="user-message"]',
    ],
    modelResponse: [
      '[data-role="assistant"]',
      '.assistant-message',
      '[data-testid="assistant-message"]',
    ],
    messages: [
      '[data-role="user"], [data-role="assistant"]',
      '.message',
      '[data-testid*="message"]',
    ],
  },

  // Perplexity selectors
  perplexity: {
    chatTitle: ['h1[class*="text-"]', '.conversation-title', 'h1', 'title'],
    userMessage: ['[data-testid="user-message"]', '.user-message', '.query'],
    modelResponse: ['[data-testid="answer"]', '.answer', '.response'],
    messages: [
      '[data-testid="user-message"], [data-testid="answer"]',
      '.message',
      '.query, .answer',
    ],
  },

  // Generic fallback selectors (for custom platforms)
  generic: {
    chatTitle: [
      'h1',
      'h2',
      '[class*="title"]',
      '[class*="heading"]',
      '[data-testid*="title"]',
      'title',
    ],
    userMessage: [
      '[class*="user"]',
      '[data-role="user"]',
      '[role="user"]',
      '[data-testid*="user"]',
    ],
    modelResponse: [
      '[class*="assistant"]',
      '[class*="bot"]',
      '[class*="ai"]',
      '[data-role="assistant"]',
      '[role="assistant"]',
      '[data-testid*="assistant"]',
      '[data-testid*="bot"]',
    ],
    messages: [
      '[class*="message"]',
      '[data-testid*="message"]',
      '[role="user"], [role="assistant"]',
    ],
  },
};

// Current platform data
let currentPlatform = null;
let platformConfig = null;

// Function to detect current platform
function detectPlatform() {
  const hostname = window.location.hostname.toLowerCase();
  const url = window.location.href.toLowerCase();

  if (hostname.includes('gemini.google.com')) {
    return 'gemini';
  } else if (
    hostname.includes('chatgpt.com') ||
    hostname.includes('chat.openai.com')
  ) {
    return 'chatgpt';
  } else if (hostname.includes('claude.ai')) {
    return 'claude';
  } else if (hostname.includes('perplexity.ai')) {
    return 'perplexity';
  }

  return 'generic';
}

// Function to get platform-specific selectors
function getPlatformSelectors(platform = null) {
  const detectedPlatform = platform || detectPlatform();
  return PLATFORM_SELECTORS[detectedPlatform] || PLATFORM_SELECTORS.generic;
}

// ==============================
// 2. AUTO-DETECT CHAT DETAILS
// ==============================

// Function to extract chat title from the page
function getChatTitle() {
  const selectors = getPlatformSelectors();

  // Try platform-specific selectors first
  for (const selector of selectors.chatTitle) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }

  // Fallback: generate title from first user message
  for (const selector of selectors.userMessage) {
    const firstMessage = document.querySelector(selector);
    if (firstMessage && firstMessage.textContent) {
      const text = firstMessage.textContent.trim();
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
  }

  // Last fallback with platform name
  const platform = currentPlatform || detectPlatform();
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
  return `${platformName} Chat - ${new Date().toLocaleDateString()}`;
}

// Function to detect if this is a new/active chat
function isActiveChat() {
  const selectors = getPlatformSelectors();

  // Check if there are messages on the page using platform-specific selectors
  for (const selector of selectors.messages) {
    const messages = document.querySelectorAll(selector);
    if (messages.length > 0) {
      return true;
    }
  }

  return false;
}

// Function to get chat summary/context
function getChatSummary() {
  const selectors = getPlatformSelectors();

  // Try to get first user message
  for (const selector of selectors.userMessage) {
    const messages = document.querySelectorAll(selector);
    if (messages.length > 0) {
      const firstMessage = messages[0].textContent.trim();
      return firstMessage.length > 100
        ? firstMessage.substring(0, 100) + '...'
        : firstMessage;
    }
  }

  return '';
}

// ==============================
// 3. FLOATING SAVE BUTTON
// ==============================

// Function to create a floating save button
function createSaveButton() {
  // Check if button already exists
  if (document.getElementById('ai-chat-manager-save-btn')) return;

  const saveButton = document.createElement('div');
  saveButton.id = 'ai-chat-manager-save-btn';
  saveButton.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
      </svg>
      Save Chat
    </div>
  `;

  // Add click event
  saveButton.addEventListener('click', () => {
    const platform = currentPlatform || detectPlatform();
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

    const chatData = {
      title: getChatTitle(),
      url: window.location.href,
      summary: getChatSummary(),
      timestamp: new Date().toISOString(),
      platform: platformName,
    };

    // Send message to extension
    chrome.runtime.sendMessage(
      {
        action: 'SAVE_CHAT_FROM_PAGE',
        chatData: chatData,
      },
      (response) => {
        if (response && response.success) {
          showNotification('Chat saved successfully!', 'success');
        } else {
          showNotification('Failed to save chat', 'error');
        }
      }
    );
  });

  document.body.appendChild(saveButton);
}

// ==============================
// 4. NOTIFICATION SYSTEM
// ==============================

// Function to show notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10001;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ==============================
// 5. CHAT CHANGE DETECTION
// ==============================

// Function to detect when user navigates to a new chat
function setupChatChangeDetection() {
  let currentUrl = window.location.href;
  let currentTitle = getChatTitle();

  // Watch for URL changes (SPA navigation)
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log('Navigated to new chat:', currentUrl);

      // Update save button visibility
      setTimeout(() => {
        if (isActiveChat()) {
          createSaveButton();
        } else {
          const existingBtn = document.getElementById(
            'ai-chat-manager-save-btn'
          );
          if (existingBtn) existingBtn.remove();
        }
      }, 1000);
    }

    // Watch for title changes
    const newTitle = getChatTitle();
    if (newTitle !== currentTitle) {
      currentTitle = newTitle;
      console.log('Chat title changed:', newTitle);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// ==============================
// 6. AUTO-SAVE FUNCTIONALITY
// ==============================

// Function to auto-save important chats
function setupAutoSave() {
  let messageCount = 0;
  const selectors = getPlatformSelectors();

  const checkForNewMessages = () => {
    // Use platform-specific selectors for model responses
    let messages = [];
    for (const selector of selectors.modelResponse) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        messages = found;
        break;
      }
    }

    if (messages.length > messageCount && messages.length >= 3) {
      messageCount = messages.length;

      // Ask user if they want to save this chat
      if (
        confirm(
          'This looks like an important conversation. Would you like to save it?'
        )
      ) {
        document.getElementById('ai-chat-manager-save-btn')?.click();
      }
    }
  };

  // Check every 10 seconds
  setInterval(checkForNewMessages, 10000);
}

// ==============================
// 7. KEYBOARD SHORTCUTS
// ==============================

// Function to setup keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+S or Cmd+Shift+S to save chat
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      document.getElementById('ai-chat-manager-save-btn')?.click();
    }

    // Ctrl+Shift+M or Cmd+Shift+M to open manager
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: 'OPEN_MANAGER' });
    }
  });
}

// ==============================
// 8. INITIALIZATION
// ==============================

// Function to check if current URL is supported by user settings
function isUrlSupported() {
  return new Promise((resolve) => {
    // Request platform settings from extension storage
    chrome.runtime.sendMessage(
      { action: 'GET_PLATFORM_SETTINGS' },
      (response) => {
        if (!response || !response.platforms) {
          // Fallback to default platforms if no settings
          const defaultPlatforms = [
            { urlPattern: 'https://gemini.google.com/' },
            { urlPattern: 'https://chatgpt.com/' },
            { urlPattern: 'https://claude.ai/' },
            { urlPattern: 'https://www.perplexity.ai/' },
          ];

          const isSupported = defaultPlatforms.some((platform) =>
            window.location.href.startsWith(platform.urlPattern)
          );
          resolve(isSupported);
          return;
        }

        // Check if current URL matches any configured platform
        const isSupported = response.platforms.some((platform) =>
          window.location.href.startsWith(platform.urlPattern)
        );
        resolve(isSupported);
      }
    );
  });
}

// Wait for page to load and initialize
async function init() {
  // Check if this URL is supported before initializing
  const isSupported = await isUrlSupported();

  if (!isSupported) {
    console.log(
      'AI Chat Manager: URL not in configured platforms, skipping initialization'
    );
    return;
  }

  // Detect platform and initialize
  currentPlatform = detectPlatform();
  const platformName =
    currentPlatform.charAt(0).toUpperCase() + currentPlatform.slice(1);

  console.log(`Initializing AI Chat Manager on ${platformName}...`);

  // Setup all features
  setTimeout(() => {
    if (isActiveChat()) {
      createSaveButton();
    }

    setupChatChangeDetection();
    setupKeyboardShortcuts();
    // setupAutoSave(); // Uncomment if you want auto-save prompts

    console.log(`AI Chat Manager features enabled for ${platformName}`);
    showNotification(`${platformName} chat loaded!`, 'success');
  }, 2000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ==============================
// 9. MESSAGE LISTENER
// ==============================

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_CHAT_DATA') {
    sendResponse({
      title: getChatTitle(),
      url: window.location.href,
      summary: getChatSummary(),
      isActive: isActiveChat(),
    });
  }

  if (message.action === 'SHOW_SAVE_BUTTON') {
    createSaveButton();
  }

  return true;
});
