// Popup Logic

// DOM Elements
const selectorInput = document.getElementById('selectorInput');
const startBtn = document.getElementById('startBtn');
const btnText = document.getElementById('btnText');
const btnIcon = document.getElementById('btnIcon');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const logContainer = document.getElementById('logContainer');
const activeIndicator = document.getElementById('activeIndicator');

let isProcessing = false;

// Helpers
const addLog = (msg) => {
  const div = document.createElement('div');
  div.className = 'break-all border-l-2 border-transparent hover:border-blue-500/50 pl-2 transition-colors';
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  
  // Clear "Ready to initialize" message if it exists
  if (logContainer.querySelector('.italic')) {
    logContainer.innerHTML = '';
  }
  
  logContainer.appendChild(div);
  logContainer.scrollTop = logContainer.scrollHeight;
};

const setStatus = (status) => {
  if (status === 'processing') {
    isProcessing = true;
    startBtn.disabled = true;
    startBtn.className = 'group relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all shadow-lg bg-gray-700 text-gray-400 cursor-not-allowed';
    btnText.textContent = 'Processing Document...';
    // Spinner icon
    btnIcon.innerHTML = `<svg class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    progressContainer.classList.remove('hidden');
    activeIndicator.classList.remove('hidden');
    selectorInput.disabled = true;
  } else if (status === 'complete') {
    isProcessing = false;
    startBtn.disabled = false;
    startBtn.className = 'group relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white hover:shadow-blue-500/25 active:scale-[0.98]';
    btnText.textContent = 'Capture Another';
    // Check icon
    btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    activeIndicator.classList.add('hidden');
    selectorInput.disabled = false;
  } else if (status === 'error') {
    isProcessing = false;
    startBtn.disabled = false;
    startBtn.className = 'group relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all shadow-lg bg-red-600 hover:bg-red-500 text-white';
    btnText.textContent = 'Retry Capture';
    btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    activeIndicator.classList.add('hidden');
    selectorInput.disabled = false;
  }
};

const updateProgress = (current, total) => {
  const percent = Math.round((current / total) * 100);
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
};

// Listeners
startBtn.addEventListener('click', () => {
  const selector = selectorInput.value.trim();
  if (!selector) {
    addLog('Error: Please enter a valid CSS selector.');
    return;
  }

  logContainer.innerHTML = '';
  addLog(`Initializing capture for selector: "${selector}"`);
  setStatus('processing');
  updateProgress(0, 100);

  // Send message to active tab
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        addLog('Sending start command to content script...');
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'START_CAPTURE',
          selector: selector
        }).catch((err) => {
           addLog(`Connection failed: ${err.message}. Refresh page?`);
           setStatus('error');
        });
      } else {
        addLog('Error: No active tab found.');
        setStatus('error');
      }
    });
  } else {
    // Development/Preview mode simulation
    addLog('Chrome API not found (Running in preview mode)');
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      updateProgress(p, 100);
      addLog(`Simulating page capture ${p/10}...`);
      if (p >= 100) {
        clearInterval(interval);
        setStatus('complete');
        addLog('Simulation complete.');
      }
    }, 500);
  }
});

// Message Receiver
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'CAPTURE_PROGRESS') {
      addLog(`Processing page ${request.progress} of ${request.total}...`);
      if (request.progress && request.total) {
        updateProgress(request.progress, request.total);
      }
    } else if (request.type === 'CAPTURE_COMPLETE') {
      updateProgress(100, 100);
      setStatus('complete');
      addLog('Document saved successfully!');
    } else if (request.type === 'CAPTURE_ERROR') {
      setStatus('error');
      addLog(`Error: ${request.message}`);
    }
  });
}