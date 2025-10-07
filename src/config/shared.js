import puppeteer from "puppeteer";

export async function getBrowserConfig() {
  try {
    // Try to connect to existing browser first
    console.log("Attempting to connect to existing browser...");
    // const hostIp = "10.255.255.254"; // WSL2 IP
    const hostIp = "127.0.0.1"; // Localhost IP
    // First, try to get the WebSocket endpoint from the browser
    const response = await fetch(`http://${hostIp}:9222/json/version`);
    const data = await response.json();
    const browserWSEndpoint = data.webSocketDebuggerUrl;
    
    const browser = await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: null,
    });
    console.log("Successfully connected to existing browser");
    return browser;
  } catch (error) {
    console.log("Could not connect to existing browser, launching new one...");
    console.error("Connection error:", error.message);
    
    // If connection fails, launch a new browser
    // const browser = await puppeteer.launch({
    //   headless: false,
    //   args: [
    //     "--remote-debugging-port=9222",
    //     "--user-data-dir=./chrome-profile",
    //     "--start-maximized",
    //   ],
    //   defaultViewport: null,
    // });
    // console.log("Successfully launched new browser");
    // return browser;
  }
}

export async function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}