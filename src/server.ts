import express from 'express';
import type { Request, Response } from 'express';
import { scrapePage, BlockedError } from './scraper.js';
import { warmupSession, rotateSession } from './warmup.js';
import { getActiveSession } from './session.js';

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_RETRIES = 5;

let isServerReady = false;
let isWarmingUp = false;

// Request queue system
interface QueuedRequest {
  url: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  id: string;
}

const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;
let requestCounter = 0;

//When starting the server, warm it up first
(async () => {
  console.log('[SERVER] Starting warmup...');
  isWarmingUp = true;
  try {
    await warmupSession();
    isServerReady = true;
    console.log('[SERVER] Ready to handle requests');
  } catch (error) {
    console.error('[SERVER] Warmup failed:', error);
  } finally {
    isWarmingUp = false;
  }
})();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

//Health check
app.get('/health', (req: Request, res: Response) => {
  const session = getActiveSession();
  res.json({
    status: isServerReady ? 'ready' : (isWarmingUp ? 'warming_up' : 'not_ready'),
    hasSession: !!session.browser,
    sessionId: session.sessionId,
  });
});

//the REAL queue logic
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  console.log(`[QUEUE] Starting queue processing - ${requestQueue.length} requests pending`);
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (!request) break;
    
    console.log(`[QUEUE] Processing request ${request.id} - ${requestQueue.length} remaining`);
    
    try {
      const result = await scrapeWithRetry(request.url);
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }
  }
  
  isProcessingQueue = false;
  console.log('[QUEUE] Queue processing complete');
}

//Scrape with retry
async function scrapeWithRetry(url: string): Promise<any> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[SERVER] Scraping attempt ${attempt}/${MAX_RETRIES}: ${url}`);
      const result = await scrapePage(url);
      console.log(`[SERVER] Scraping successful on attempt ${attempt}`);
      return result;
      
    } catch (error) {
      if (error instanceof BlockedError) {
        console.log(`[SERVER] Blocked (${error.blockType}: ${error.message})`);
        
        if (attempt < MAX_RETRIES) {
          console.log(`[SERVER] Rotating session before retry...`);
          isWarmingUp = true;
          try {
            await rotateSession();
            console.log('[SERVER] New session ready');
          } catch (rotateError) {
            console.error('[SERVER] Rotation failed:', rotateError);
          } finally {
            isWarmingUp = false;
          }
        } else {
          console.log(`[SERVER] Max retries reached, giving up`);
          throw error;
        }
      } else {
        console.error('[SERVER] Non-block error:', error);
        throw error;
      }
    }
  }
  
  throw new Error('Max retries reached');
}

//Naver endpoint
app.get('/naver', async (req: Request, res: Response) => {
  const url = req.query.productUrl as string;

  if (!url) {
    res.status(400).json({ error: 'productUrl required' });
    return;
  }

  //If warming up, return immediately
  if (isWarmingUp) {
    console.log('[SERVER] Request received during warmup - returning warming up status');
    res.status(503).json({ 
      error: 'Server is warming up a new session', 
      status: 'warming_up',
      retry_after: 10 
    });
    return;
  }

  if (!isServerReady) {
    console.log('[SERVER] Request received but server not ready');
    res.status(503).json({ error: 'Service not ready', retry_after: 5 });
    return;
  }

  // Add to queue
  requestCounter++;
  const requestId = `REQ-${requestCounter}`;
  console.log(`[SERVER] Queuing request ${requestId} - Queue size: ${requestQueue.length + 1}`);
  
  const queuePromise = new Promise((resolve, reject) => {
    requestQueue.push({ url, resolve, reject, id: requestId });
    processQueue();
  });
  
  try {
    const result = await queuePromise;
    res.json(result);
  } catch (error) {
    if (error instanceof BlockedError) {
      res.status(429).json({ error: 'Max retries reached, all sessions blocked', blockType: error.blockType });
    } else {
      console.error('[SERVER] Error:', error);
      res.status(500).json({ error: 'Scraping failed' });
    }
  }
});
