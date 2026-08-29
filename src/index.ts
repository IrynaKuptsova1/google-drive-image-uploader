import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  uploadToGoogleDrive,
  authenticate,
  createTinyUrl,
} from "./google-drive.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function promptForImagePath(): Promise<string> {
  const { imagePath } = await inquirer.prompt([
    {
      type: "input",
      name: "imagePath",
      message: "Image path (drag & drop here):",
      validate: async (input: string) => {
        const cleanPath = input.trim().replace(/^['"]|['"]$/g, "");
        if (!cleanPath) return "Please provide the image path";

        const exists = await fs.pathExists(cleanPath);
        if (!exists) return "File not found";

        const stats = await fs.stat(cleanPath);
        if (!stats.isFile()) return "The provided path is not a file";

        const ext = path.extname(cleanPath).toLowerCase();
        const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
        if (!imageExts.includes(ext))
          return "The file must be an image (.jpg, .jpeg, .png, .gif, .bmp, .webp)";

        return true;
      },
    },
  ]);

  return imagePath.trim().replace(/^['"]|['"]$/g, "");
}

async function promptForRename(originalPath: string): Promise<string> {
  const originalName = path.basename(originalPath);
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: `File name: ${chalk.green(originalName)}`,
      choices: [
        { name: "Keep as is", value: "keep" },
        { name: "Rename", value: "rename" },
      ],
    },
  ]);

  if (action === "rename") {
    const { newName } = await inquirer.prompt([
      {
        type: "input",
        name: "newName",
        message: "New filename (without extension):",
        validate: (input: string) => {
          if (!input.trim()) return "Name cannot be empty";
          if (/[<>:"/\\|?*]/.test(input))
            return "Name contains invalid characters";
          return true;
        },
      },
    ]);

    const ext = path.extname(originalPath);
    return newName.trim() + ext;
  }

  return originalName;
}

async function promptForShortLink(): Promise<boolean> {
  const { shorten } = await inquirer.prompt([
    {
      type: "confirm",
      name: "shorten",
      message: "Create a short link?",
      default: true,
    },
  ]);

  return shorten;
}

async function main(): Promise<void> {
  let tempFilePath = "";
  try {
    const imagePath = await promptForImagePath();
    console.log(chalk.gray(`\nSelected: ${imagePath}\n`));

    const finalFileName = await promptForRename(imagePath);
    if (finalFileName !== path.basename(imagePath)) {
      console.log(chalk.gray(`New name: ${finalFileName}\n`));
    }

    const createShortLink = await promptForShortLink();

    console.log(chalk.cyan("\nGoogle Drive authentication..."));
    const auth = await authenticate();
    console.log(chalk.green("Authentication successful!\n"));

    console.log(chalk.cyan("Uploading file..."));

    let fileToUpload = imagePath;

    if (finalFileName !== path.basename(imagePath)) {
      tempFilePath = path.join(__dirname, "temp", finalFileName);
      await fs.ensureDir(path.dirname(tempFilePath));
      await fs.copy(imagePath, tempFilePath);
      fileToUpload = tempFilePath;
    }

    const fileInfo = await uploadToGoogleDrive(
      auth,
      fileToUpload,
      finalFileName,
    );

    if (!fileInfo.webViewLink) {
      throw new Error("Uploaded file did not return a webViewLink.");
    }

    console.log(chalk.green("File uploaded successfully!\n"));
    console.log(chalk.cyan("Details:"));
    console.log(`ID: ${fileInfo.id ?? "unknown"}`);
    console.log(`Name: ${fileInfo.name ?? finalFileName}`);
    const sizeInKb = fileInfo.size ? Number(fileInfo.size) / 1024 : undefined;
    console.log(`Size: ${sizeInKb ? sizeInKb.toFixed(2) : "unknown"} KB`);
    console.log(`Link: ${fileInfo.webViewLink}`);

    if (createShortLink) {
      console.log(chalk.cyan("\nCreating short link..."));
      try {
        const shortUrl = await createTinyUrl(fileInfo.webViewLink);
        console.log(chalk.green("Short link created!"));
        console.log(`Short URL: ${shortUrl}`);
      } catch (e) {
        console.error(
          chalk.red("Failed to create short link:"),
          e instanceof Error ? e.message : String(e),
        );
      }
    }

    console.log(chalk.green.bold("\nDone! File is on Google Drive\n"));
  } catch (error: unknown) {
    console.error(
      chalk.red("\nError:"),
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  } finally {
    if (tempFilePath && (await fs.pathExists(tempFilePath))) {
      await fs.remove(tempFilePath);
    }
  }
}
main();
