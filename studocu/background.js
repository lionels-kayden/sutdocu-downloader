// Background Script: Handles the screenshot capture
// Runs in the service worker context

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CAPTURE_VISIBLE_TAB') {
    // Capture the visible area of the active tab in the current window
    chrome.tabs.captureVisibleTab(
      null, 
      { format: 'png' }, 
      (dataUrl) => {
        // Handle potential errors (e.g., restricted URLs)
        if (chrome.runtime.lastError) {
          console.error("Capture failed:", chrome.runtime.lastError);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          // Return the base64 image data
          sendResponse({ dataUrl: dataUrl });
        }
      }
    );
    
    // Return true to indicate we will send the response asynchronously
    return true;
  }
});