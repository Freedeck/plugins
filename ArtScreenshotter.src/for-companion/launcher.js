const { app, dialog } = require("electron");
const { BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const sharp = require('sharp');
const templatePath = path.join(__dirname, "Template.png");
const screenshotPath = path.join(__dirname, "MobileScreenshot.png");
const outputOnePath = path.join(__dirname, "MockupSS.png");
const outputPath = path.join(__dirname, "Mobile.png");
const companionScreenshotPath = path.join(__dirname, "Companion.png");

async function makeMockup() {
	console.log(">>>> making mockup!")
	const mask = Buffer.from(
		`<svg><rect x="0" y="0" width="2796" height="1290" rx="25" ry="25" /></svg>`
	);
	console.log("-> made phone mask")

	await sharp(screenshotPath)
		.composite([
			{
				input: mask,
				blend: 'dest-in'
			}
		])
		.toFile(outputOnePath)
	console.log("--> masked screenshot")

	await sharp(templatePath)
		.composite([
			{
				input: outputOnePath,
				blend: 'dest-over', // Places screenshot UNDER the template bezel frame
				top: 120,                   // Distance from top of template to screenshot top
				left: 120,                 // Distance from left of template to screenshot left
			}
		])
		.toFile(outputPath);
	console.log("---> template over masked screenshot, done")
}

console.log("=== ART Screenshotter ===")
console.log("This module uses Electron's offscreen and hidden rendering to render proper resolution files.")
console.log("You will not see any windows open! This isn't a bug, just wait for the script to exit.")
app.on("ready", () => {
	const window = new BrowserWindow({
		width: 1400,
		height: 850,
		frame: true,
		show: false,
		autoHideMenuBar: true,
		icon: path.resolve("./webui/client/assets/logo_big.ico"),
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			offscreen: true
		},
	});

	console.log(`Here we go! Launching Companion Screenshotter!`);

	window.webContents.once("did-finish-load", async () => {
		window.webContents.setZoomLevel(0)
		setTimeout(async () => {
			const image = await window.webContents.capturePage({
				x: 0,
				y: 0,
				width: 1400,
				height: 850,
			});

			fs.writeFile(companionScreenshotPath, image.toPNG(), (err) => {
				if (err) throw err;
				console.log("CompanionScreenshot saved at high resolution!");
				const w = 2796;
				const h = 1290;

				window.setSize(w, h);
				window.loadURL("http://localhost:5754/");
				window.webContents.enableDeviceEmulation({
					screenSize: { width: w, height: h, },
					viewSize: { width: 932, height: 430 },
					screenPosition: 'mobile', // Forces mobile framing
					deviceScaleFactor: 3
				});

				window.webContents.once("did-finish-load", async () => {
					window.webContents.setZoomLevel(5.5)
					setTimeout(async () => {
						const image = await window.webContents.capturePage({
							x: 0,
							y: 0,
							width: w,
							height: h,
						});

						fs.writeFile(screenshotPath, image.toPNG(), async (err) => {
							if (err) throw err;
							console.log("MobileScreenshot saved at high resolution!");
							await makeMockup()
							fs.rmSync(screenshotPath)
							fs.rmSync(outputOnePath)
							window.close();
						});
					}, 4000);
				});
			});
		}, 2500);
	});
	window.loadURL("http://localhost:5754/companion");
});
