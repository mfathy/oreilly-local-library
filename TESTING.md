# Testing Guide

## 1) Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project root folder.
5. Pin the extension so popup access is easy.

## 2) Import test data

1. Open extension popup.
2. In **Import Library JSON**, choose `test-data/sample-library.json`.
3. Confirm:
   - Status message shows imported records.
   - Library count is greater than 0.
   - Records are sorted by title.

## 3) Verify popup management

1. Add a new book with `bookId` and `title`.
2. Confirm list re-renders in title order.
3. Remove a book and confirm count updates.
4. Close/reopen popup and confirm data persisted.

## 4) Verify O'Reilly page labels

1. Open `https://learning.oreilly.com/`.
2. Navigate to pages with book cards or book details, including:
   - `https://learning.oreilly.com/library/view/-/9781633438125/`
   - `https://learning.oreilly.com/library/view/-/9781492084542/`
3. Confirm an `Owned` badge appears beside matching titles.
4. Move across pages/search results and ensure badges continue appearing.
5. Confirm no duplicate badges appear after scrolling/navigation.

## 5) Verify export

1. In popup, click **Export JSON**.
2. Save the downloaded file.
3. Confirm file is valid JSON and sorted by `title`.
4. Re-import the exported file and confirm records load without errors.

## 6) Quick troubleshooting

- If badges do not appear:
  - Reload extension from `chrome://extensions`.
  - Refresh O'Reilly tab.
  - Re-import JSON and retry.
- If import fails:
  - Ensure JSON root is an array.
  - Ensure each record has at least `bookId` (or resolvable ID) and `title`.
