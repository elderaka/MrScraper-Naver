# Naver SmartStore Scraper

A web scraper for Naver SmartStore (Korean e-commerce website) that can bypass bot detection using Camoufox and Playwright, created by Lauda Dhia Raka for Mr.Scraper's coding challenge

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Setup Instructions](#setup-instructions)
3. [Run Instructions](#run-instructions)
4. [API Usage](#api-usage)
5. [Evasion Strategies](#evasion-strategies)
6. [Proxy Usage](#proxy-usage)
7. [Troubleshooting](#troubleshooting)

---

## How It Works

The scraper has 6 main files:

| File | Purpose |
|------|---------|
| server.ts | HTTP server that receives scraping requests |
| scraper.ts | Navigates to product pages and captures API data |
| warmup.ts | Creates new sessions and tests if they work |
| session.ts | Stores the active browser and page state |
| browser.ts | Configures the stealth browser and proxy |
| humanization.ts | Simulates mouse movements and scrolling |

[![](https://mermaid.ink/img/pako:eNqFV-FS4zYQfhWNO9Npp8DFSQwh0-kNEHpkDrg0cO20Jj809ibxEFs5WabkEp6if_t0fZKuVrItJ4TjR7K7-na12v20CmsvEjF4fW8m-XLO7s8fMoZ_d4pL9UN4B_IJpNEmP7LDw1_YH1ymxTIkk1XYHeR5IrKJ8TWfdkm7fIDMIkIUQXIFpQsbDqxXDSKfizlEj8PRmr7ZcMSeEs5GUjyvXgzeAjR4cyuyw49jRG2cMLswgrD__v1nwy4kYBbnUvydgwyNxi54KoqpeGbW3jhPw4NSpBJcFSnPbDVITr5ypQ9xLcRy4hSTFsnv9yRP1JVIISSJaXHJZ2DR1XINxnPHRaQs_h5yxayJfR5fN9J08bZfiTobDfNQC2wqJNNavwrwEzvHnkwTNSn7ZvBUsXOh5qzdapmi2cJeAV-o-Sq84fKx6qM1vhbkV54sIMaaL0QOY1ByFZJYlpl9z8hqfWvYFnncYzZTMe0AdRap5AmQtYrxnBlti5wVyvpofo-Bx6uS66RMmntVIHIymxKxbOODNCkrYAjH7pO04s-2_3WSK8jG8CU0EjXlXcbN7l8KbG_eSMDZkAp6icgVCxjuuiE2lPzYwwwHQv7UmU8fN27gN5Bl_8ZC4Q0wPqFRtorrIpxh4Z6lOjyt4_cYIsB2xGt7dFYa7D13IJSSDplkM_Z5udG0KWQWtDqhkRiKrAZMXo9Andiwszj-rYACQhSYEoyURt1LBKWKZYnwsGRYG_NlulSr9zZPd90OpQ3dg3tMzFw-LU32oP-EfGMGxV2Ekxgss0jB0zj3Skep549BN-hamwl2phRgomv7zW7fBTbl0qJRt_xphDMoxO9kpjuLFSmZMKqHk4VVk2XAFa8ny85MoVmz9SwYJ4pw-awkj0wQKzOtWA9nuX4TzhcielzTJ8Rl8Z1ZTytU0m77lA1AQaRq9pbv0Bv0dV8hl7_Og2YL98bed0Wk-2vmpiEnndLytCyUc9gaZPoBz2qYGbbdCAkMJwxpzSM7sJpGA1jwVTjmWSxS1j30W7kx2Z1Ifp1B2-E0h6sb-8ZxP6k5Dq9LKYXcmGG-NhP8Zxa8ry6yHekmyUYN6zW9oykFRSsLRkqjUmRpztOdW2Df3CP9kvHocSZFkSEVbkSRw43Al8LWiAxMW1LI1OTbEbBmYrEo3Y1W39K3PAeSz0o_Lc9qN_NZJWd8L0SmkqxAo5O33Ya23YUZu-01brGL0FZ3z1ytFmDSZtNkseh_B_40AL-x6rxi-zAOh_eHaTzc-2AOvwxkOp12orixWeO2WlQvPon5Lso-SXtB5TvyDYTh3D6M03YDiX2Ipo1j1c3dh7BN3bdM_XQXvQP85Z7EXl_JAg48_NWRcq16a-324OHFTOHB66MY4--1B-8he0GfJc_-EiIt3ZCcs7nXn_JFjlqxjLFmg4Tj_wQ1BLIY5AWyWHl9v00hvP7ae_b6h75_fNTrBp1u0Ov0jtvtbnDgrcjePjo57Qat01O_c9Jqtf2XA-8r7ds-6vitXrcd-N1Wp9fqHb_8DxYXLUE?type=png)](https://mermaid.live/edit#pako:eNqFV-FS4zYQfhWNO9Npp8DFSQwh0-kNEHpkDrg0cO20Jj809ibxEFs5WabkEp6if_t0fZKuVrItJ4TjR7K7-na12v20CmsvEjF4fW8m-XLO7s8fMoZ_d4pL9UN4B_IJpNEmP7LDw1_YH1ymxTIkk1XYHeR5IrKJ8TWfdkm7fIDMIkIUQXIFpQsbDqxXDSKfizlEj8PRmr7ZcMSeEs5GUjyvXgzeAjR4cyuyw49jRG2cMLswgrD__v1nwy4kYBbnUvydgwyNxi54KoqpeGbW3jhPw4NSpBJcFSnPbDVITr5ypQ9xLcRy4hSTFsnv9yRP1JVIISSJaXHJZ2DR1XINxnPHRaQs_h5yxayJfR5fN9J08bZfiTobDfNQC2wqJNNavwrwEzvHnkwTNSn7ZvBUsXOh5qzdapmi2cJeAV-o-Sq84fKx6qM1vhbkV54sIMaaL0QOY1ByFZJYlpl9z8hqfWvYFnncYzZTMe0AdRap5AmQtYrxnBlti5wVyvpofo-Bx6uS66RMmntVIHIymxKxbOODNCkrYAjH7pO04s-2_3WSK8jG8CU0EjXlXcbN7l8KbG_eSMDZkAp6icgVCxjuuiE2lPzYwwwHQv7UmU8fN27gN5Bl_8ZC4Q0wPqFRtorrIpxh4Z6lOjyt4_cYIsB2xGt7dFYa7D13IJSSDplkM_Z5udG0KWQWtDqhkRiKrAZMXo9Andiwszj-rYACQhSYEoyURt1LBKWKZYnwsGRYG_NlulSr9zZPd90OpQ3dg3tMzFw-LU32oP-EfGMGxV2Ekxgss0jB0zj3Skep549BN-hamwl2phRgomv7zW7fBTbl0qJRt_xphDMoxO9kpjuLFSmZMKqHk4VVk2XAFa8ny85MoVmz9SwYJ4pw-awkj0wQKzOtWA9nuX4TzhcielzTJ8Rl8Z1ZTytU0m77lA1AQaRq9pbv0Bv0dV8hl7_Og2YL98bed0Wk-2vmpiEnndLytCyUc9gaZPoBz2qYGbbdCAkMJwxpzSM7sJpGA1jwVTjmWSxS1j30W7kx2Z1Ifp1B2-E0h6sb-8ZxP6k5Dq9LKYXcmGG-NhP8Zxa8ry6yHekmyUYN6zW9oykFRSsLRkqjUmRpztOdW2Df3CP9kvHocSZFkSEVbkSRw43Al8LWiAxMW1LI1OTbEbBmYrEo3Y1W39K3PAeSz0o_Lc9qN_NZJWd8L0SmkqxAo5O33Ya23YUZu-01brGL0FZ3z1ytFmDSZtNkseh_B_40AL-x6rxi-zAOh_eHaTzc-2AOvwxkOp12orixWeO2WlQvPon5Lso-SXtB5TvyDYTh3D6M03YDiX2Ipo1j1c3dh7BN3bdM_XQXvQP85Z7EXl_JAg48_NWRcq16a-324OHFTOHB66MY4--1B-8he0GfJc_-EiIt3ZCcs7nXn_JFjlqxjLFmg4Tj_wQ1BLIY5AWyWHl9v00hvP7ae_b6h75_fNTrBp1u0Ov0jtvtbnDgrcjePjo57Qat01O_c9Jqtf2XA-8r7ds-6vitXrcd-N1Wp9fqHb_8DxYXLUE)
Flow of a request:
1. Request comes to server at /naver endpoint
2. Server checks if there is an active session
3. If no session, warmup creates one (finds Korean IP, opens browser, visits homepage)
4. Scraper navigates to product URL and captures the API responses
5. If blocked (429 error), server rotates to a new session and retries
6. Returns product data as JSON

---

## Setup Instructions

### Step 1: Install Node.js

Download and install Node.js from https://nodejs.org/

Verify installation:
```powershell
node --version
npm --version
```

### Step 2: Clone or Download Project

```powershell
git clone //TBA
cd NaverScraper
```

### Step 3: Install Dependencies

```powershell
npm install
```

This will install:
- express (HTTP server)
- playwright-core (browser automation)
- camoufox-js (stealth browser)
- https-proxy-agent (proxy connection)
- dotenv (environment variables)
- typescript

### Step 4: Project Configuration

Create a file named `.env` in the project root folder:

```env
PORT = 3000
IP_TEST_URL=http://your-test-website.com
WARMUP_HOMEPAGE_URL=https://warmup-homepage.com
WARMUP_PRODUCT_URL=https://testing-product.com
PROXY=proxy-server-address:port:username:password
HEADLESS=true
```

### Step 5: Build the Project

```powershell
npm run build
```

---

## Run Instructions

### Start the Server

```powershell
npm start
```

You will see output like this:
```
Server on http://localhost:3000
[SERVER] Starting warmup...
[WARMUP] Starting...
[WARMUP] Attempt 1 - Session: abc123xyz
[WARMUP] IP: 12345-Seoul | Country: KR
[WARMUP] Korean IP found! Creating browser...
[BROWSER] Ready in 5.2s
[Humanization] Started
[WARMUP] Visiting homepage...
[WARMUP] Testing product page...
[WARMUP] Session healthy!
[SERVER] Ready!
```

When you see "Ready!", the server is ready to accept requests.

### Test the Server

Open a new terminal and run:

```powershell
curl "http://localhost:3000/health"
```

Expected response:
```json
{
  "status": "ready",
  "sessionId": "abc123xyz"
}
```

---

## API Usage

### Endpoint: GET /naver

Scrapes a Naver SmartStore product page.

**Request:**
```
GET http://localhost:3000/naver?productUrl=<url>
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| productUrl | Yes | Full URL of the Naver SmartStore product page |

**Example Request:**

Using curl:
```powershell
curl "http://localhost:3000/naver?productUrl=https://smartstore.naver.com/plusink/products/5721197056"
```

Using browser:
```
http://localhost:3000/naver?productUrl=https://smartstore.naver.com/plusink/products/5721197056
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "status": 200,
  "title": "Product Title Here",
  "productDetail": {
    "id": "5721197056",
    "name": "Product Name",
    "channelName": "Store Name",
    "salePrice": 14000,
    "stockQuantity": 7993107,
    ...
  },
  "benefits": {
    ...
  }
}
```

**Error Responses:**

400 Bad Request (missing parameter):
```json
{
  "error": "productUrl required"
}
```

503 Service Unavailable (still warming up):
```json
{
  "error": "Not ready"
}
```

429 Too Many Requests (all retries failed):
```json
{
  "error": "All retries failed"
}
```

500 Internal Server Error:
```json
{
  "error": "Scraping failed"
}
```

### Endpoint: GET /health

Check if the server is ready.

**Request:**
```
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ready",
  "sessionId": "abc123xyz"
}
```

Status can be "ready" or "warming_up".

---

## Evasion Strategies

Naver has multiple layers of bot detection. Here is how we bypass them:

### 1. Stealth Browser (Camoufox)

Normal browser automation tools like Puppeteer or Playwright have detectable fingerprints. Websites can check:
- navigator.webdriver property (true for bots)
- Browser plugins and extensions
- Screen resolution and color depth
- WebGL renderer information
- Canvas fingerprint

Camoufox is a modified Firefox browser that:
- Removes all automation flags
- Randomizes browser fingerprint
- Looks exactly like a real Firefox browser

### 2. Homepage Warmup

Naver is very untrusty with any IP. So, to build trust, we visited Homepage and redirect it to product address

Without warmup:
- Direct visit to product page = suspicious
- Benefit API returns 429 (rate limited)

With warmup:
- Visit homepage first
- Then navigate to product page
- Both APIs return 200 (success)

The warmup flow is:
1. Open browser
2. Go to https://shopping.naver.com/ns/home
3. Wait for page to load
4. Then navigate to product URL

### 3. Human Behavior Simulation

Bots usually:
- Navigate instantly without mouse movements
- Do not scroll the page
- Make requests in perfect timing

This scraper simulates human behavior:
- Random mouse movements
- Random scrolling
- Random drag actions
- Variable delays between actions

The humanization runs in background continuously while the browser is open.

### 4. Session Reuse

Creating a new browser for each request is slow and suspicious.

To circumvent it, we:
- Creates one browser session
- Reuses the same page for multiple requests
- Only rotates when blocked

### 5. Automatic Rotation on Block

When the scraper detects a block (429 or 490 status):
1. Close current session
2. Generate new session ID (new IP)
3. Create new browser
4. Warmup with homepage
5. Retry the request

Maximum 3 retries before giving up.

---

## Proxy Usage

### Why Proxies are Needed

Naver blocks non-Korean IP addresses. Even with Korean datacenter IPs, they can detect and block them because:
- Datacenter IPs are known and listed
- Too many requests from same IP
- IP reputation is bad

### Residential Proxies

Residential proxies use IP addresses from real Korean users (home internet). These are harder to detect because:
- IP looks like a normal user
- Not in datacenter blocklists
- Good IP reputation

### Session ID for IP Rotation

Each session ID gives you a different IP address. When you change the session ID, you get a new IP.

The scraper generates random session IDs like:
```
vkj123abc456xyz
```

When blocked:
1. Generate new session ID
2. This gives new IP from Thor
3. Try again with fresh IP

### IP Checking

Before creating a browser, the scraper checks if the IP is Korean.

If the IP is not Korean (country != "KR"), it generates a new session ID and tries again.
---

## Troubleshooting

### Problem: Benefit API returns 429

Cause: Homepage warmup is not working properly.

Solution:
1. Check if homepage navigation succeeds
2. Increase the wait time after homepage visit
3. Make sure cookies are being saved

### Problem: Non-Korean IP

Cause: Proxy configuration is wrong.

Solution:
1. Check .env file has correct proxy format
2. Make sure username includes "-country-kr"
3. Verify proxy credentials are correct

### Problem: Browser timeout

Cause: Proxy connection is slow or blocked.

Solution:
1. Try a different proxy provider
2. Check your internet connection
3. Increase timeout values in code

### Problem: CAPTCHA detected (490 error)

Cause: Naver detected suspicious behavior.

Solution:
1. The scraper will automatically rotate to new session
2. If it keeps happening, reduce request frequency and make sure that IP is korean.
3. Check if humanization is running

### Problem: Page too small

Cause: The page content is blocked or empty.

Solution:
1. Session is probably blocked
2. Will automatically rotate and retry
3. Check if the product URL is valid

### Problem: Build errors

Cause: TypeScript compilation failed.

Solution:
1. Make sure all dependencies are installed: `npm install`
2. Check for syntax errors in source files
3. Run `npm run build` and read error messages

---

## Project Structure

```
MrScraper/
├── src/
│   ├── server.ts        # HTTP server
│   ├── scraper.ts       # Scraping logic
│   ├── warmup.ts        # Session warmup
│   ├── session.ts       # Session state
│   ├── browser.ts       # Browser config
│   └── humanization.ts  # Human simulation
├── dist/                # Compiled JavaScript
├── .env                 # Proxy credentials (create this)
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── README.md            # This file
```

---
