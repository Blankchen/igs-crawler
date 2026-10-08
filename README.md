# Puppeteer Automation Project

This project uses Puppeteer to automate form filling on a specific website. It navigates to the target page, handles dialogs, fills out form fields, and submits the form.

## Table of Contents

-   [Installation](#installation)
-   [Usage](#usage)
-   [Project Structure](#project-structure)
-   [Key Features](#key-features)
-   [Contributing](#contributing)
-   [License](#license)

## Installation

To get started, clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd igs-crawler
npm install
```

## Usage

You can run the main script by executing the following command:

```bash
node src/index.js
```


## Project Structure

The project has the following structure:

```
.
├── src
│   ├── index.js          # Main entry point
│   └── scripts
│       └── example-script.js  # Example script
└── package.json
```

## Key Features

-   Automated form filling
-   Dialog handling
-   Form field validation
-   Screenshot capturing

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

### 連線到自動化專用 Chrome（port 9222）
1. 執行 `npm run chrome`，會以 `--remote-debugging-port=9222 --user-data-dir=C:\ChromeDebugProfile` 啟動一個獨立的 Chrome（已在執行則略過）
2. 首次使用請在這個 Chrome 登入 webcase.towergame.com 等需要的網站；登入狀態保存在 `C:\ChromeDebugProfile`，之後不必重登
3. 腳本透過 `http://127.0.0.1:9222` 連線，不會跳允許視窗；可用環境變數 `CHROME_DEBUG_URL`、`CHROME_PATH`、`CHROME_USER_DATA_DIR` 覆寫預設值
4. 排程執行期間請保持這個 Chrome 開著