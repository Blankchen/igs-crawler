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

# Download the latest available Chrome for Testing binary corresponding to the Stable channel.
npx @puppeteer/browsers install chrome@stable
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