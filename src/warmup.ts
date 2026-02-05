import type { Browser, BrowserContext, Page } from "playwright-core";
import { createBrowser, generateSessionId, checkIP } from "./browser.js";
import { Humanize } from "./humanization.js";
import { setActiveSession, closeActiveSession } from "./session.js";

// ENV CONF
const WARMUP_HOMEPAGE_URL =
  process.env.WARMUP_HOMEPAGE_URL ||
  "https://shopping.naver.com/v1/products/15030128621?cp=1&frm=NVSHATC";
const WARMUP_PRODUCT_URL =
  process.env.WARMUP_PRODUCT_URL ||
  "https://smartstore.naver.com/ccjoy/products/12438838476";

//Create a newly warmed-up session
export async function warmupSession(): Promise<{
  browser: Browser | BrowserContext;
  sessionId: string;
}> {
  console.log("[WARMUP] Starting session warmup...");

  for (let attempt = 1; ; attempt++) {
    const sessionId = generateSessionId();
    console.log(`[WARMUP] Attempt ${attempt} | Session: ${sessionId}`);

    try {
      //Quick check IP
      const ipInfo = await checkIP(sessionId);
      console.log(`[WARMUP] IP: ${ipInfo.ip} | Country: ${ipInfo.country}`);

      if (ipInfo.country !== "KR") {
        console.log(`[WARMUP] Got Non-Korean IP, trying next...`);
        await delay(500);
        continue;
      }

      console.log(`[WARMUP] Korean IP found! Creating browser...`);
      const browser = await createBrowser(sessionId);

      // Start humanization
      const humanizeStopSignal = { stopped: false };
      const humanizeTask = Humanize(browser, humanizeStopSignal);
      
      // Visit homepage first to prevents 429 and build trust on this session
      const page = await browser.newPage();
      console.log("[WARMUP] Visiting homepage...");
      try {
        await page.goto(WARMUP_HOMEPAGE_URL, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });
      } catch (e: any) {
        console.log(
          "[WARMUP] Homepage timeout, checking if page is accessible...",
        );
        try {
          await page.evaluate(() => document.readyState);
        } catch {
          throw e;
        }
      }

      //Navigate to product page
      console.log("[WARMUP] Testing product page...");
      let productApiOk = false;
      let benefitApiOk = false;
      let productApiStatus: number | null = null;
      let benefitApiStatus: number | null = null;

      page.on("response", (response) => {
        const url = response.url();
        const status = response.status();

        if (url.includes("/benefits/by-products/")) {
          benefitApiStatus = status;
          if (status === 200) benefitApiOk = true;
        }
        if (
          url.includes("/products/") &&
          url.includes("withWindow=false")
        ) {
          productApiStatus = status;
          if (status === 200) productApiOk = true;
        }
      });

      await page.goto(WARMUP_PRODUCT_URL, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for both APIs
      const maxWait = 20000;
      const start = Date.now();
      while ((!productApiOk || !benefitApiOk) && Date.now() - start < maxWait) {
        await delay(500);
        if ((Date.now() - start) % 2000 < 500) {
          const productStatus = productApiStatus ? `${productApiStatus}` : "waiting";
          const benefitStatus = benefitApiStatus ? `${benefitApiStatus}` : "waiting";
          console.log(
            `[WARMUP] APIs - Product: ${productStatus}, Benefit: ${benefitStatus}`,
          );
        }
      }

      if (productApiOk && benefitApiOk) {
        console.log(`[WARMUP] Session healthy! Both APIs returned 200`);
        setActiveSession(
          browser,
          sessionId,
          humanizeStopSignal,
          humanizeTask,
          page,
        );
        return { browser, sessionId };
      }

      console.log(
        `[WARMUP] Session unhealthy - Product: ${productApiStatus || "no response"}, Benefit: ${benefitApiStatus || "no response"}`
      );
      humanizeStopSignal.stopped = true;
      await page.close();
      await browser.close();
    } catch (error: any) {
      console.log(`[WARMUP] Error: ${error.message}`);
    }

    await delay(2000);
  }
}

//Close current session and rotate to a freshly created one
export async function rotateSession(): Promise<{
  browser: Browser | BrowserContext;
  sessionId: string;
}> {
  console.log("[WARMUP] Rotating session...");
  await closeActiveSession();
  return warmupSession();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
