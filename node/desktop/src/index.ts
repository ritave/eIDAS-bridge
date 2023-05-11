import { app, BrowserWindow, Tray, Menu, shell } from "electron";
import path from "path";
import { HttpServer } from "./host-server";
import { WsServer } from "./ws-server";
import { promisify } from "util";
import pem, {
  CertificateCreationOptions,
  CertificateCreationResult,
} from "pem";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

let tray: Tray;
let server: HttpServer;
let wsServer: WsServer;

const makeTrayMenu = (opts: { server?: string; ws?: string } = {}) => {
  let serverItem: Electron.MenuItemConstructorOptions;
  if (opts.server) {
    serverItem = {
      label: `Server: ${opts.server}`,
      type: "normal",
      click: () => shell.openExternal(opts.server),
    };
  } else {
    serverItem = { label: "Server: inactive", type: "normal", enabled: false };
  }
  return Menu.buildFromTemplate([
    serverItem,
    {
      label: `Socket: ${opts.ws ?? "loading"}`,
      type: "normal",
      enabled: false,
    },
    { type: "separator" },
    { label: "Quit", role: "quit", click: () => app.quit() },
  ]);
};

const createTray = (): void => {
  tray = new Tray(path.join(__dirname, "faviconTemplate.png"));
  const contextMenu = makeTrayMenu();
  tray.setContextMenu(contextMenu);
  tray.setToolTip("eIDAS Bridge");
};

const makeCert = () =>
  (
    promisify(pem.createCertificate) as (
      _: CertificateCreationOptions
    ) => Promise<CertificateCreationResult>
  )({
    days: 7,
    selfSigned: true,
  });

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  //createWindow();
  createTray();
  //const cert = await makeCert();
  wsServer = new WsServer();
  server = new HttpServer();
  await Promise.all([
    server.start({ port: 8080, public: path.join(__dirname, "web") }),
    wsServer.start({ port: 8081 }),
  ]);

  tray.setContextMenu(
    makeTrayMenu({
      server: `http://localhost:8080`,
      ws: "http://localhost:8081",
    })
  );
});

app.on("before-quit", async () => {
  await Promise.all([server.close(), wsServer.close()]);
  tray.destroy();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
/* app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
}); */

/* app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); */

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
