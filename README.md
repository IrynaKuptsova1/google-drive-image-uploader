# Google Drive Image Uploader

Challenge: Image file path -> public Google Drive link

Example:

```text
Image path: ./photos/sunset.png
File name: sunset.png
? Create a short link? No

Google Drive authentication
File uploaded successfully!
Link: https://drive.google.com/file/d/1a2b3c4d5e/view
```

How to Run:

```bash
# Install dependencies
npm install

# Run with Node.js
npm start
# or directly:
npm run start:node

# Run the TypeScript source with Bun
npm run start:bun
# or directly:
bun run src/index.ts
```

The app uses Inquirer and Chalk for a friendly interactive CLI, Google OAuth2 for Drive access, and TypeScript with native Node.js ESM modules. Add your Google OAuth client file as `config/credentials.json`; the first run opens a browser, stores the token locally, and uploads the selected image with public read access.