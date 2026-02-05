import { Camoufox } from "camoufox-js";
import type { Browser, BrowserContext } from "playwright-core";
import http from "http";
import https from "https";
import { config } from "dotenv";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";

// ENV Config
config();
const proxy =
  process.env.PROXY_URL ||
  process.env.PROXY ||
  "http://proxy-server-address:port:username:password";
const HEADLESS = process.env.HEADLESS || "true";
const IP_TEST_URL = process.env.IP_TEST_URL || "http://ipinfo.thordata.com";

// Proxy configuration (parse URL format: http://username:password@server:port)
let server: string;
let port: string;
let username: string;
let password: string;

try {
  const proxyUrl = new URL(proxy);
  server = proxyUrl.hostname;
  port = proxyUrl.port;
  username = proxyUrl.username;
  password = proxyUrl.password;
  if(server === "" || port === "") {
    throw new Error("Invalid proxy URL, missing server or port");
  }
} catch (err) {
  // Fallback to old colon-separated format (server:port:username:password)
  const proxyParts = proxy.split(":");
  console.log(`Parsed proxy string parts: ${proxyParts[0]}, port: ${proxyParts[1]}, ${proxyParts[2]}, ****`);
  server = proxyParts[0] || "";
  port = proxyParts[1] || "";
  username = proxyParts[2] || "";
  password = proxyParts.slice(3).join(":");
}

export function generateSessionId(): string {
  const prefix = Math.random().toString(36).slice(2, 5);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}${timestamp}${random}`;
}
export function withSessionUsername(
  baseUsername: string,
  sessionId?: string,
): string {
  let updatedUsername = baseUsername;
  if (!updatedUsername.includes("-country-kr")) {
    updatedUsername = `${updatedUsername}-country-kr`;
  }

  if (!sessionId) return updatedUsername;
  //TD
  if (updatedUsername.includes("td-customer-")) {
    if (updatedUsername.includes("-sessid-")) {
      return updatedUsername.replace(/-sessid-[^-]+/, `-sessid-${sessionId}`);
    }
    return `${updatedUsername}-sessid-${sessionId}-sesstime-90`;
  }

  //BRD
  if (updatedUsername.includes("brd-customer-")) {
    if (updatedUsername.includes("-session-")) {
      return updatedUsername.replace(/-session-[^-]+/, `-session-${sessionId}`);
    }
    return `${updatedUsername}-session-${sessionId}`;
  }

  return `${updatedUsername}-session-${sessionId}`;
}

//Fast IP check through proxy server testing.
export async function checkIP(sessionId: string): Promise<{ ip: string; country: string; city: string }> {
  const sessionUsername = withSessionUsername(username || "", sessionId);
  const proxyUrl = `http://${sessionUsername}:${password}@${server}:${port}`;
  
  // Use HTTPS agent for HTTPS URLs or HTTP agent for HTTP URLs
  const agent = IP_TEST_URL.startsWith('https://') 
    ? new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false })
    : new HttpProxyAgent(proxyUrl);

  const checkUrl = IP_TEST_URL;
  const requestModule = IP_TEST_URL.startsWith('https://') ? https : http;

  return new Promise((resolve, reject) => {
    const req = requestModule.get(checkUrl, { agent, timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const ipInfo = JSON.parse(data);
          resolve({
            ip: `${ipInfo.asn?.asnum || "no-ip"}-${ipInfo.geo?.city || "unknown"}`,
            country: ipInfo.country || ipInfo.geo?.country || "unknown",
            city: ipInfo.geo?.city || "unknown",
          });
        } catch (e) {
          reject(new Error("Failed to parse IP info"));
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("IP check timeout"));
    });
  });
}

//Create a Camoufox browser instance
export async function createBrowser(sessionId: string,): Promise<Browser | BrowserContext> {
  const PROXY_USERNAME = withSessionUsername(username || "", sessionId);
  const PROXY_PASSWORD = password || "";

  console.log(`[CAMOUFOX] Session ID: ${sessionId}`);
  console.log(`[CAMOUFOX] Proxy: ${server}:${port}`);
  console.log(`[CAMOUFOX] Username: ${PROXY_USERNAME}`);

  const startTime = Date.now();
  let browser: any;

  try {
    browser = await Camoufox({
      headless: HEADLESS === "true",
      locale: "ko-KR",
      geoip: false,
      proxy: `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${server}:${port}`,
      humanize: true,
      block_webrtc: true,
      persistent_context: false,
      ignore_https_errors: true,
      config: {
        "battery:charging": true,
        "battery:chargingTime": 0,
        "battery:dischargingTime": Infinity,
        "battery:level": 0.67,
      },
    });
  } catch (err: any) {
    const msg = String(err?.message || err);
    console.error(`[CAMOUFOX] ERROR creating browser: ${msg}`);
    throw err;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[CAMOUFOX] Browser ready in ${elapsed}s`);

  return browser;
}
