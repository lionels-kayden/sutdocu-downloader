// Content Script: Runs inside the web page
// Handles stitching, coordinate extraction, cropping, and PDF assembly

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Helpers ---

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Toggle visibility of fixed/sticky elements to prevent artifacts during stitching
const toggleFixedElements = (hide) => {
  const elements = document.querySelectorAll('body *');
  const modified = [];
  
  // Inject/Remove scrollbar hiding style
  const scrollStyleId = 'docu-capture-scroll-hide';
  if (hide) {
    const style = document.createElement('style');
    style.id = scrollStyleId;
    style.innerHTML = `
      ::-webkit-scrollbar { display: none !important; }
      body { -ms-overflow-style: none !important; scrollbar-width: none !important; }
    `;
    document.head.appendChild(style);
  } else {
    const style = document.getElementById(scrollStyleId);
    if (style) style.remove();
  }

  // Handle Fixed Elements
  elements.forEach(el => {
    // Skip our own script elements or the PDF library if visible (unlikely)
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;

    const computed = window.getComputedStyle(el);
    if (computed.position === 'fixed' || computed.position === 'sticky') {
      if (hide) {
        // Store original state
        el.dataset.docuOriginalVisibility = el.style.visibility;
        el.style.visibility = 'hidden';
        modified.push(el);
      } else {
        // Restore
        el.style.visibility = el.dataset.docuOriginalVisibility || '';
        delete el.dataset.docuOriginalVisibility;
      }
    }
  });
  return modified;
};

// --- Stitching Logic ---

const captureElementStitched = async (element) => {
  // 1. Calculate Full Dimensions relative to the document
  const rect = element.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
  
  const elementAbsoluteTop = rect.top + scrollTop;
  const elementAbsoluteLeft = rect.left + scrollLeft;
  const elementWidth = rect.width;
  const elementHeight = rect.height;

  // 2. Setup Master Canvas
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = elementWidth * dpr;
  canvas.height = elementHeight * dpr;
  const ctx = canvas.getContext('2d');
  
  // 3. Prepare for Scrolling
  const viewportHeight = window.innerHeight;
  let currentOffset = 0;
  
  // Hide fixed artifacts
  toggleFixedElements(true);

  try {
    // 4. Stitching Loop
    while (currentOffset < elementHeight) {
      // Scroll so the current chunk is at the top of the viewport (if possible)
      // Math.min checks we don't scroll past the bottom of the document unnecessarily,
      // though the browser handles that.
      const targetScrollY = elementAbsoluteTop + currentOffset;
      window.scrollTo(0, targetScrollY);
      
      // Wait for lazy loading / rendering
      await sleep(800);

      // Recalculate element position in viewport after scroll
      const currentRect = element.getBoundingClientRect();

      // Determine the visible slice of the element in the current viewport
      // The element might be partially off-screen at the top or bottom
      const visibleTop = Math.max(0, currentRect.top); // Viewport Y where element starts
      const visibleBottom = Math.min(viewportHeight, currentRect.bottom); // Viewport Y where element ends
      const visibleHeight = visibleBottom - visibleTop;

      // If nothing is visible (shouldn't happen in this loop logic), skip
      if (visibleHeight <= 0) {
        currentOffset += viewportHeight;
        continue;
      }

      // Capture Viewport
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, resolve);
      });

      if (!response || !response.dataUrl) {
        throw new Error('Screenshot failed');
      }

      const img = await loadImage(response.dataUrl);

      // Crop coordinates (Source)
      const sx = currentRect.left * dpr; // Assuming element fits horizontally
      const sy = visibleTop * dpr;
      const sw = currentRect.width * dpr;
      const sh = visibleHeight * dpr;

      // Destination coordinates (Master Canvas)
      // Calculate where this slice belongs on the full canvas
      // The absolute Y of the visible slice in the document is (window.scrollY + visibleTop)
      // The relative Y in the element is (AbsoluteY - elementAbsoluteTop)
      const currentScrollY = window.scrollY;
      const absoluteSliceY = currentScrollY + visibleTop;
      const dy = (absoluteSliceY - elementAbsoluteTop) * dpr;
      const dx = 0; // We assume we captured the full width
      const dw = sw;
      const dh = sh;

      // Draw
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

      // Move to next chunk
      // We advance by the viewport height, ensuring we cover the next section
      currentOffset += viewportHeight;
    }
  } finally {
    // 5. Restore fixed elements
    toggleFixedElements(false);
    // Return scroll to top of element
    window.scrollTo(0, elementAbsoluteTop);
  }

  return canvas.toDataURL('image/png');
};

// --- PDF Generation ---

const processDocument = async (selector) => {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("jsPDF library not found.");
    }
    const { jsPDF } = window.jspdf;

    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
      throw new Error(`No elements found for selector: ${selector}`);
    }

    // A4 Dimensions (mm)
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    const a4Width = 210; 

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      // Notify Progress
      chrome.runtime.sendMessage({
        type: 'CAPTURE_PROGRESS',
        progress: i + 1,
        total: elements.length
      });

      // Stitch
      const stitchedDataUrl = await captureElementStitched(element);

      // Calculate PDF dimensions
      const imgProps = pdf.getImageProperties(stitchedDataUrl);
      const pdfHeight = (imgProps.height * a4Width) / imgProps.width;

      if (i > 0) pdf.addPage();
      pdf.addImage(stitchedDataUrl, 'PNG', 0, 0, a4Width, pdfHeight);
    }

    pdf.save(`document_${Date.now()}.pdf`);
    chrome.runtime.sendMessage({ type: 'CAPTURE_COMPLETE' });

  } catch (error) {
    console.error(error);
    chrome.runtime.sendMessage({ 
      type: 'CAPTURE_ERROR', 
      message: error.message || 'Unknown error' 
    });
  }
};

// --- Message Listener ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_CAPTURE') {
    processDocument(request.selector);
  }
});