# O'Reilly Local Library

Chrome extension (Manifest V3) that helps you identify and manage books you already own while browsing [learning.oreilly.com](https://learning.oreilly.com/).

## Features

- Import a JSON file of your books
- Normalize and simplify imported records
- Store your library in `chrome.storage.local`
- Show an `Owned` badge beside matched books on O'Reilly pages
- Manage the library in the popup (add/remove books)
- Export an updated JSON copy of your current library

## Install (Load Unpacked)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

## Usage

1. Click the extension icon and open the popup
2. Import your library JSON file
3. Review sorted books list (sorted by title)
4. Add or remove books as needed
5. Click **Export JSON** to download an updated copy
6. Visit `https://learning.oreilly.com/` and look for `Owned` badges

## Accepted Import JSON

The importer accepts your full record format and keeps only relevant fields.

Example input:

```json
[
  {
    "addedAt": "2026-01-10T19:15:44.719Z",
    "authors": ["Adrienne Braganza"],
    "bookId": "9781633438125",
    "description": "Add to playlist...",
    "isbn": "9781633438125",
    "publisher": "O'Reilly Media",
    "skills": [],
    "title": "\"Looks Good to Me\"",
    "url": "https://learning.oreilly.com/library/view/-/9781633438125/"
  }
]
```

## Simplified Stored/Exported JSON

```json
[
  {
    "bookId": "9781633438125",
    "isbn": "9781633438125",
    "title": "\"Looks Good to Me\"",
    "url": "https://learning.oreilly.com/library/view/-/9781633438125/",
    "description": "Add to playlist..."
  }
]
```

## Matching Logic

Book matches are checked in this order:

1. `bookId` / `isbn` match
2. Fallback to book ID parsed from O'Reilly URL (`/library/view/-/<id>/`)

## Project Structure

- `manifest.json`
- `src/content/contentScript.js`
- `src/popup/popup.html`
- `src/popup/popup.css`
- `src/popup/popup.js`
- `src/shared/normalize.js`
- `src/shared/storage.js`
- `test-data/sample-library.json`
- `TESTING.md`

## Test Quickly

- Load unpacked extension in `chrome://extensions`
- Import `test-data/sample-library.json`
- Open `https://learning.oreilly.com/` and verify `Owned` badges
- Use `TESTING.md` for the full validation checklist
