const { app, BrowserWindow, BrowserView, Menu, ipcMain, session } = require('electron');
const path = require('path');

// Use only real ad/tracker domains from public blocklists.
const KNOWN_AD_DOMAINS = [
  "doubleclick.net",
  "googlesyndication.com",
  "adservice.google.com",
  "adservice.google.co",
  "amazon-adsystem.com",
  "taboola.com",
  "outbrain.com",
  "adsafeprotected.com",
  "casalemedia.com",
  "pubmatic.com",
  "openx.net",
  "adnxs.com",
  "rubiconproject.com",
  "adform.net",
  "adroll.com",
  "criteo.com",
  "ml314.com",
  "criteo.net",
  "advertising.com",
  "moatads.com",
  "gumgum.com"
];

// Ad unit selectors for DOM removal - only proven/essential spots, not generic matches!
const SAFE_AD_SELECTORS = [
  // Youtube-specific ad UI (UI, not content!)
  "#player-ads",
  ".ytd-display-ad-renderer",
  ".ytd-promoted-sparkles-web-renderer",
  ".ytd-promoted-video-renderer",
  ".ytd-ad-slot-renderer",
  "#masthead-ad",
  "ytd-companion-slot-renderer",
  // News sites
  ".adsbygoogle",
  ".ad-slot",
  ".ad-unit",
  "#ad_container",
  "#ads-container",
  ".banner-ads",
  // Some OTT overlays (presentation only)
  '[aria-label="Go Ads free"]'
];

let contextMenu;
(async () => {
  ({ default: contextMenu } = await import('electron-context-menu'));
})();

class MiniProjectBrowser {
  constructor() {
    this.win = null;
    this.tabs = new Map();
    this.activeTabId = null;
    this.nextTabId = 1;
  }

  searchPage() {
    return `file://${path.join(__dirname, 'search-engine/index.html')}`;
  }

  currentTab() {
    return this.activeTabId && this.tabs.get(this.activeTabId);
  }

  async createWindow() {
    // Strict domain-level ad/tracker blocking only
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url.toLowerCase();
      callback({
        cancel: KNOWN_AD_DOMAINS.some(domain => url.includes(domain))
      });
    });

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = 'MINI-PROJECT 1.0';
      callback({ requestHeaders: details.requestHeaders });
    });

    this.win = new BrowserWindow({
      width: 1400,
      height: 900,
      title: 'MINI-PROJECT',
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#1e1e2f',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    await this.win.loadFile('renderer/index.html');
    this.win.once('ready-to-show', () => {
      this.win.show();
      this.createTab(this.searchPage());
    });

    this.win.on('resize', () => this.updateBounds());
    this.win.on('closed', () => { this.win = null; });
    this.buildMenus();
  }

  createTab(url = this.searchPage()) {
    const id = this.nextTabId++;
    const view = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    const tab = { id, view, url, title: 'New Tab' };
    this.tabs.set(id, tab);

    view.webContents.on('did-navigate', (_e, u) => { tab.url = u; this.syncTab(id); });
    view.webContents.on('did-navigate-in-page', (_e, u) => { tab.url = u; this.syncTab(id); });
    view.webContents.on('page-title-updated', (_e, t) => { tab.title = t; this.syncTab(id); });

    view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // Carefully remove only well-known ad units, not generics!
    view.webContents.on('did-finish-load', async () => {
      const script = `
        (() => {
          const selectors = ${JSON.stringify(SAFE_AD_SELECTORS)};
          function cleanAds() {
            selectors.forEach(sel => {
              document.querySelectorAll(sel).forEach(el => el.remove());
            });
          }
          cleanAds();
          const observer = new MutationObserver(cleanAds);
          observer.observe(document.body, { childList: true, subtree: true });
        })();
      `;
      view.webContents.executeJavaScript(script, true);
    });

    view.webContents.loadURL(url);
    this.switchToTab(id);
    return id;
  }

  switchToTab(id) {
    if (!this.tabs.has(id)) return;
    if (this.activeTabId) this.win.setBrowserView(null);

    const tab = this.tabs.get(id);
    this.win.setBrowserView(tab.view);
    this.activeTabId = id;

    this.updateBounds();
    this.updateNavState();
    this.pushTabList();
  }

  closeTab(id) {
    if (!this.tabs.has(id)) return;
    this.tabs.get(id).view.webContents.destroy();
    this.tabs.delete(id);
    if (this.activeTabId === id) {
      const next = [...this.tabs.keys()].pop() || this.createTab();
      this.switchToTab(next);
    }
  }

  updateBounds() {
    const t = this.currentTab();
    if (!t) return;
    const { width, height } = this.win.getBounds();
    t.view.setBounds({ x: 0, y: 110, width, height: height - 134 });
    t.view.setAutoResize({ width: true, height: true });
  }

  goBack() { const t = this.currentTab(); t&&t.view.webContents.canGoBack() && t.view.webContents.goBack(); }
  goForward() { const t = this.currentTab(); t&&t.view.webContents.canGoForward() && t.view.webContents.goForward(); }
  refresh() { const t = this.currentTab(); t&&t.view.webContents.reload(); }
  navigate(u) { const t = this.currentTab(); t&&t.view.webContents.loadURL(u); }

  syncTab(id) { if (id === this.activeTabId) this.updateNavState(); this.pushTabList(); }
  updateNavState() {
    const t = this.currentTab();
    if (!t) return;
    this.win.webContents.send('navigation-state-updated', {
      url: t.url,
      title: t.title,
      canGoBack: t.view.webContents.canGoBack(),
      canGoForward: t.view.webContents.canGoForward()
    });
  }
  pushTabList() {
    this.win.webContents.send('tabs-updated',
      [...this.tabs.values()].map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        active: tab.id === this.activeTabId
      }))
    );
  }

  buildMenus() {
    const template = [
      ...(process.platform === 'darwin' ? [{
        label: 'MINI-PROJECT',
        submenu: [
          { role: 'about' }, { type: 'separator' }, { role: 'quit', label: 'Quit MINI-PROJECT' }
        ]
      }] : []),
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' }, { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
          { role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }
        ]
      },
      {
        label: 'Tabs',
        submenu: [
          { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => this.createTab() },
          { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => this.closeTab(this.activeTabId) }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  registerIPC() {
    ipcMain.handle('create-new-tab', (_e, u) => this.createTab(u));
    ipcMain.handle('switch-to-tab', (_e, id) => this.switchToTab(id));
    ipcMain.handle('close-tab', (_e, id) => this.closeTab(id));
    ipcMain.handle('navigate-to', (_e, u) => this.navigate(u));
    ipcMain.handle('go-back', () => this.goBack());
    ipcMain.handle('go-forward', () => this.goForward());
    ipcMain.handle('refresh-page', () => this.refresh());
    ipcMain.handle('go-home', () => this.navigate(this.searchPage()));
    ipcMain.handle('search', (_e, q) => this.navigate(this.searchPage() + `?q=${encodeURIComponent(q)}`));
  }
}

const browser = new MiniProjectBrowser();

app.whenReady().then(async () => {
  app.setName('MINI-PROJECT');
  app.setAboutPanelOptions({ applicationName: 'MINI-PROJECT' });

  while (!contextMenu) await new Promise(r => setTimeout(r, 10));
  contextMenu({ showSaveImageAs: true });

  await browser.createWindow();
  browser.registerIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) browser.createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
