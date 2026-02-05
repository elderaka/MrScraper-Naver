import type { Page } from 'playwright-core';
import { getActiveSession, setActiveSession } from './session.js';

//custom error for blocked requests
export class BlockedError extends Error {
  status: number;
  blockType: 'api_429' | 'web_429' | 'captcha' | 'connection';
  // api_429 often occures because NAVER detected suspicious activity from the IP
  // web_429 often occures due to untrusted IP
  // captcha occures if IP or region is not from Korea. error code is 490
  // connection for other network issues
  
  constructor(message: string, status: number, blockType: 'api_429' | 'web_429' | 'captcha' | 'connection') {
    super(message);
    this.name = 'BlockedError';
    this.status = status;
    this.blockType = blockType;
  }
}

//main logic
export async function scrapePage(url: string): Promise<any> {
  const startTime = Date.now();
  const session = getActiveSession();
  
  if (!session.browser) {
    throw new Error('No active browser session');
  }
  
  //Setting up page
  let page = session.page;
  if (!page || page.isClosed()) {
    console.log("[SCRAPER] Creating new page");
    page = await session.browser.newPage();
    setActiveSession(session.browser, session.sessionId, session.humanizeStopSignal, session.humanizeTask, page);
  } else {
    console.log("[SCRAPER] Reusing existing page");
  }
  
  //Set up API interception
  let productDetail: any = null;
  let benefits: any = null;
  let apiBlocked = false;
  let blockedApiName = '';
  let blockedApiStatus = 0;
  
  const responseHandler = async (response: any) => {
    const responseUrl = response.url();
    const status = response.status();
    
    // Benefits API
    if (responseUrl.includes('/i/v2/channels/') && responseUrl.includes('/benefits/by-products/')) {
      console.log(`[SCRAPER] Benefits API: ${status}`);
      if (status === 429 || status === 490) {
        apiBlocked = true;
        blockedApiName = 'Benefits';
        blockedApiStatus = status;
        return;
      }
      if (status >= 200 && status < 300) {
        try { benefits = await response.json(); } catch {}
      }
    }
    
    // Product API
    if (responseUrl.includes('/i/v2/channels/') && responseUrl.includes('/products/') && responseUrl.includes('withWindow=false')) {
      console.log(`[SCRAPER] Product API: ${status}`);
      if (status === 429 || status === 490) {
        apiBlocked = true;
        blockedApiName = 'Product';
        blockedApiStatus = status;
        return;
      }
      if (status >= 200 && status < 300) {
        try { productDetail = await response.json(); } catch {}
      }
    }
  };
  
  page.on('response', responseHandler);
  
  //Navigate to the requested url
  try {
    console.log(`[SCRAPER] Navigating to: ${url}`);
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    const status = response?.status();
    console.log(`[SCRAPER] Page status: ${status}`);
    
    //Wait for APIs (max 12 seconds)
    const maxWait = 12000;
    const start = Date.now();
    while ((!productDetail || !benefits) && !apiBlocked && (Date.now() - start) < maxWait) {
      await new Promise(r => setTimeout(r, 200));
    }
    
    //Check for blocks. If there are any, throw to trigger server warmup
    if (apiBlocked) {
      const errorMsg = `${blockedApiName} API blocked with status ${blockedApiStatus}`;
      console.log(`[SCRAPER] ${errorMsg}`);
      throw new BlockedError(errorMsg, blockedApiStatus, 'api_429');
    }
    
    if (status === 490) {
      throw new BlockedError('CAPTCHA detected', 490, 'captcha');
    }
    
    if (status === 429) {
      throw new BlockedError('Rate limited', 429, 'web_429');
    }
    
    if (status === 404) {
      return { success: false, status: 404, error: 'Product not found' };
    }
    
    if (!status || status >= 400) {
      throw new BlockedError(`HTTP ${status}`, status || 0, 'connection');
    }
    
    //Check page content
    const content = await page.content();
    const title = await page.title();
    
    //Occasinally, Naver fails. These are words on the page if that happens
    if (content.includes('[에러페이지]') || content.includes('시스템오류')) {
      return { success: false, error: 'Naver error page' };
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[SCRAPER] Success! (${elapsed}s)`);
    return {
      success: true,
      status: 200,
      title,
      productDetail: productDetail || null,
      benefits: benefits || null,
    };
    
  } finally {
    page.off('response', responseHandler);
  }
}
