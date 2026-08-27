# StudyShot 📸 → 📄

**A premium Chrome extension for turning lecture screenshots into organized study PDFs.**

StudyShot makes it easy to capture useful content while studying online and automatically turn those captures into a single, clean PDF.

Instead of taking screenshots, saving them individually, renaming files, arranging them, and eventually combining everything manually, StudyShot keeps the entire workflow inside your browser.

## ✨ Features

### 📸 Capture screenshots

StudyShot provides two capture modes:

* **Visible Tab** — capture the current browser view.
* **Select Area** — select a specific region of the page to capture.

The extension UI automatically gets out of the way before capturing so the toolbar and capture panel don't appear in your screenshots.

### 🗂️ Live Capture Panel

Every screenshot appears immediately in a side panel.

From there you can:

* Preview captured screenshots
* Reorder screenshots using drag & drop
* Delete individual screenshots
* See the order in which pages will appear in the final PDF
* Hide or show the panel whenever you need more screen space

This makes it possible to build your notes while continuing to watch the lecture.

### 📐 System & A4 PDF modes

StudyShot supports two PDF layouts:

#### System

Preserves the screenshot's natural dimensions and aspect ratio.

This is particularly useful for:

* YouTube lectures
* 16:9 presentations
* Online course slides
* Diagrams and demonstrations
* Wide-screen content

A 16:9 screenshot stays 16:9 instead of being placed on an A4 page with large empty margins.

#### A4

Creates traditional A4 portrait pages with the screenshot fitted neatly onto the page.

This mode is useful when the PDF is intended for:

* Printing
* Traditional handwritten notes
* Academic submissions
* Physical revision material

### ✏️ Custom file names

You can name your study session before exporting.

For example:

`Heat Transfer Lecture 05`

will produce a file such as:

`2026-08-27_Heat_Transfer_Lecture_05.pdf`

If no custom name is provided, StudyShot uses:

`2026-08-27_notes.pdf`

### ⚡ Fast workflow

The entire process is designed around a simple workflow:

```text
Open StudyShot
      ↓
Capture useful content
      ↓
Review screenshots
      ↓
Reorder / delete if needed
      ↓
Choose System or A4
      ↓
Give the session a name
      ↓
Save PDF
```

The goal is to let you keep studying instead of interrupting your lecture just to organize screenshots.

---

## 🖥️ Installation

StudyShot currently works as a developer-loaded Chrome extension.

### 1. Download the project

Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/studyshot.git
```

Or download the repository as a ZIP and extract it.
## 📥 Download

**[Download StudyShot v2.2.0](https://github.com/faheemmhmd/studyshot/releases/latest)**

Download the latest release and install it as an unpacked Chrome extension.

### 2. Open Chrome Extensions

Go to:

```text
chrome://extensions
```

### 3. Enable Developer Mode

Turn on **Developer mode** in the top-right corner.

### 4. Load the extension

Click:

**Load unpacked**

Then select the StudyShot project directory containing:

```text
manifest.json
```

### 5. Pin StudyShot

Pin the extension from the Chrome extensions menu for quick access.

---

## 🧩 Project Structure

```text
studyshot/
├── manifest.json
├── background.js
├── content.js
├── content.css
├── README.md
├── LICENSE
```

> The exact file structure may evolve as the project develops.

---

## 🛠️ Built With

* **JavaScript**
* **HTML**
* **CSS**
* **Chrome Extension APIs**
* **Manifest V3**
* Browser-native screenshot and download capabilities
* Client-side PDF generation

The project intentionally avoids unnecessary complexity so that it remains easy to understand and modify.

---

## 🔒 Privacy

StudyShot is designed around local processing.

Your captured screenshots are used to create the PDF locally rather than being uploaded to a remote server.

There is no need for an external account just to create your study PDFs.

---

## ⚠️ Chrome Limitations

Chrome extensions cannot freely interact with every page.

Protected browser pages such as:

```text
chrome://extensions
chrome://settings
```

and certain internal Chrome pages cannot be captured or modified in the same way as normal webpages.

The extension is intended primarily for ordinary web content such as:

* YouTube
* Online courses
* Lecture websites
* Documentation
* Educational platforms
* Articles and presentations

---

## 🚧 Future Ideas

StudyShot is still evolving.

Some planned or interesting possibilities include:

### 🔎 OCR & searchable PDFs

Extract text from captured screenshots so that generated PDFs can be searched.

### 🧠 Smart lecture capture

Automatically detect the relevant lecture/video/slide region and capture that area instead of the surrounding webpage.

### 🏷️ Automatic lecture naming

Detect the title of the current lecture or webpage and use it when generating the PDF.

### 📚 Study session organization

Automatically group captured PDFs by:

* Course
* Subject
* Lecture
* Date

### ⌨️ Keyboard shortcuts

Expand the current shortcut system so screenshots can be captured without opening the toolbar.

### ☁️ Optional cloud backup

Allow users to optionally synchronize their study PDFs between devices.

---

## 🤝 Contributing

Contributions, ideas and feedback are welcome.

A simple contribution workflow is:

```bash
git clone https://github.com/YOUR-USERNAME/studyshot.git
```

Create a new branch:

```bash
git checkout -b feature-name
```

Make your changes, test the extension in Chrome, and open a pull request.

---

## 📜 License

Add your preferred open-source license here, such as the MIT License.

Example:

```text
MIT License
```

---

## 💡 Why StudyShot?

Taking notes during an online lecture can sometimes interrupt the actual learning process.

StudyShot is built around a simple idea:

> **Capture first. Organize automatically. Revise later.**

The extension is intended to make collecting useful visual information during online learning almost frictionless.

---

## ⭐ Support the Project

If you find StudyShot useful:

* ⭐ Star the repository
* 🐛 Report bugs
* 💡 Suggest features
* 🔧 Submit improvements
* 📢 Share it with other students

Every bit of feedback helps improve the project.

---

**StudyShot — Capture what matters. Keep learning.**
