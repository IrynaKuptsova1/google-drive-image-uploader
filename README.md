# Google Drive Image Uploader

Challenge: Build an interactive command-line tool that automates uploading local images to Google Drive, handles OAuth 2.0 token life cycles, sets public view permissions, and generates shortened share links.

To see the result, just run:
```bash
npm run start:node
npm run start:bun
```
---

Example:

```ts
Image path (drag & drop here): ./photo.png
File name: photo.png
? Rename: Y
New filename (without extension): example-photo.png

? Create a short link: Yes

Google Drive authentication...
Authentication successful

Uploading file...
Folder created with ID: <new-id>
File uploaded successfully

Details:
ID: <new-id>
Name: Lexample-photo.png
Size: 281.88 KB
Link: https://drive.google.com/file/d/<link>

Creating short link...
Short link created
Short URL: https://tinyurl.com/<tinyurl-id>

Done! File is on Google Drive
```
---
### 1.Google OAuth (config/credentials.json)
Place your Google Cloud OAuth 2.0 credentials in config/credentials.json.

Note for testing: Ensure http://localhost:3000/oauth2callback is added to Authorized redirect URIs and the tester's email is in Test users.

### 2.Environment Variables (.env) 
Target folder ID (leave empty to automatically create a "Google Uploader" folder)

Create a .env file in the project root:
`GOOGLE_DRIVE_FOLDER_ID=`


## Interactive CLI Workflow & Output
File Input: Drag & drop any image (.png, .jpg, .jpeg, .webp, .gif, .bmp).

Rename: Keep original filename or enter a new sanitized name.

Shorten URL: Choose whether to generate a short TinyURL link (Y/n).

Auth & Upload: Authenticates via browser on first run, auto-refreshes tokens subsequently, sets public view permissions, and displays output links.

---
The app uses Inquirer and Chalk for a interactive CLI, Google OAuth2 for Drive access, and TypeScript with native Node.js ESM modules with path validation, safe staging cleanup, and third-party REST API integration (TinyURL). Add your Google OAuth client file as `config/credentials.json`; the first run opens a browser, stores the token locally, and uploads the selected image with public read access. Through building this project, I gained hands-on experience working with TypeScript ESM modules and the Google Drive API (drive_v3) for programmatic folder creation, stream-based uploads `fs.createReadStream`, and automated permission provisioning.
