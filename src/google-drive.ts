import { google, drive_v3 } from "googleapis";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import open from "open";
import http from "http";
import url from "url";
import dotenv from "dotenv";

dotenv.config();

const CREDENTIALS_PATH = path.join(process.cwd(), "config", "credentials.json");
const TOKEN_PATH = path.join(process.cwd(), "config", "token.json");

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
  };
  return mimeMap[ext] || "application/octet-stream";
}

async function loadCredentials(): Promise<any> {
  try {
    const credentialsFile = await fs.readFile(CREDENTIALS_PATH, "utf-8");
    return JSON.parse(credentialsFile);
  } catch (error) {
    throw new Error(
      "Failed to load credentials.json. Make sure the file exists in the config folder.",
    );
  }
}

function createOAuth2Client(credentials: any): OAuth2Client {
  const { client_secret, client_id, redirect_uris } =
    credentials.installed || credentials.web;
  return new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0] || "http://localhost:3000/oauth2callback",
  );
}

async function getAccessToken(
  oAuth2Client: OAuth2Client,
): Promise<OAuth2Client> {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });

  console.log(chalk.yellow("\nOpening browser for authorization..."));
  await open(authUrl);

  return new Promise((resolve, reject) => {
    const server = http
      .createServer(async (req, res) => {
        try {
          const queryParams = url.parse(req.url ?? "", true).query as Record<
            string,
            string | undefined
          >;
          const code = queryParams.code;

          if (code) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(
              "<h1>Authorization successful! You may close this window.</h1>",
            );

            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);

            await fs.ensureDir(path.dirname(TOKEN_PATH));
            await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
            server.close();
            resolve(oAuth2Client);
          }
        } catch (error) {
          server.close();
          reject(error);
        }
      })
      .listen(3000, () => {
        console.log(
          chalk.gray("Waiting for authorization on http://localhost:3000 ..."),
        );
      });

    server.on("error", (err) => {
      reject(
        new Error(`Server error (port 3000 might be in use): ${err.message}`),
      );
    });
  });
}

export async function authenticate(): Promise<OAuth2Client> {
  const credentials = await loadCredentials();
  const oAuth2Client = createOAuth2Client(credentials);

  try {
    const token = await fs.readFile(TOKEN_PATH, "utf-8");
    oAuth2Client.setCredentials(JSON.parse(token));

    const expiryDate = oAuth2Client.credentials.expiry_date;
    if (expiryDate && expiryDate < Date.now()) {
      console.log(chalk.yellow("Token expired, refreshing..."));

      if (oAuth2Client.credentials.refresh_token) {
        const { credentials: newCredentials } =
          await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newCredentials);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(newCredentials));
      } else {
        return await getAccessToken(oAuth2Client);
      }
    }

    return oAuth2Client;
  } catch {
    return await getAccessToken(oAuth2Client);
  }
}

export async function uploadToGoogleDrive(
  auth: OAuth2Client,
  filePath: string,
  fileName: string,
): Promise<drive_v3.Schema$File> {
  const drive = google.drive({ version: "v3", auth });
  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    const folderMetadata = {
      name: "Google Uploader",
      mimeType: "application/vnd.google-apps.folder",
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id",
    });

    folderId = folder.data?.id ?? "";
    console.log(chalk.gray(`Folder created with ID: ${folderId}`));
  }

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: getMimeType(filePath),
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, size, webViewLink",
  });

  await drive.permissions.create({
    fileId: response.data.id ?? "",
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return response.data;
}

export async function createTinyUrl(fullUrl: string): Promise<string> {
  const response = await fetch(
    `https://tinyurl.com/api-create.php?url=${encodeURIComponent(fullUrl)}`,
  );

  if (!response.ok) {
    throw new Error(`TinyURL API error: ${response.statusText}`);
  }

  return await response.text();
}
