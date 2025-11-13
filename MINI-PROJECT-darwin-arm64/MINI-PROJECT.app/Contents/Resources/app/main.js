/*  MINI-PROJECT main process  */
const {
    app, BrowserWindow, BrowserView,
    Menu, ipcMain, session, nativeImage
  } = require('electron');
  const path = require('path');
  
  class MiniProjectBrowser {
    constructor () {
      this.win          = null;
      this.tabs         = new Map();           // id → { id, view, url, title }
      this.activeTabId  = null;
      this.nextTabId    = 1;
    }
  
    /* ---------- helpers ---------- */
    searchPage () {
      return `file://${path.join(__dirname, 'search-engine/index.html')}`;
    }
    currentTab () {
      return this.activeTabId && this.tabs.get(this.activeTabId);
    }
  
    /* ---------- window ---------- */
    async createWindow () {
      /* custom UA for external API calls */
      session.defaultSession.webRequest.onBeforeSendHeaders((d, cb) => {
        d.requestHeaders['User-Agent'] = 'MINI-PROJECT 1.0';
        cb({ requestHeaders: d.requestHeaders });
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
          nodeIntegration: false,
          webSecurity: false
        }
      });
  
      await this.win.loadFile('renderer/index.html');
      this.win.once('ready-to-show', () => {
        this.win.show();
        this.createTab(this.searchPage());
      });
  
      this.win.on('resize', () => this.updateBounds());
      this.win.on('closed', () => { this.win = null; });
      this.setApplicationMenu();
    }
  
    /* ---------- tab management ---------- */
    createTab (url = this.searchPage()) {
      const id   = this.nextTabId++;
      const view = new BrowserView({
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      });
  
      const tab = { id, view, url, title: 'New Tab' };
      this.tabs.set(id, tab);
  
      view.webContents.on('did-navigate',        (_e,u)=>{ tab.url=u;   this.syncTab(id); });
      view.webContents.on('did-navigate-in-page',(_e,u)=>{ tab.url=u;   this.syncTab(id); });
      view.webContents.on('page-title-updated',  (_e,t)=>{ tab.title=t; this.syncTab(id); });
      view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  
      view.webContents.loadURL(url);
      this.switchToTab(id);
      return id;
    }
  
    switchToTab (id) {
      if (!this.tabs.has(id)) return;
      if (this.activeTabId) this.win.setBrowserView(null);
  
      const tab = this.tabs.get(id);
      this.win.setBrowserView(tab.view);
      this.activeTabId = id;
  
      this.updateBounds();
      this.updateNavState();
      this.pushTabList();
    }
  
    closeTab (id) {
      if (!this.tabs.has(id)) return;
      this.tabs.get(id).view.webContents.destroy();
      this.tabs.delete(id);
  
      if (this.activeTabId === id) {
        const next = [...this.tabs.keys()].pop() || this.createTab();
        this.switchToTab(next);
      }
    }
  
    updateBounds () {
      const t = this.currentTab(); if (!t) return;
      const { width, height } = this.win.getBounds();
      t.view.setBounds({ x: 0, y: 110, width, height: height - 134 });
      t.view.setAutoResize({ width: true, height: true });
    }
  
    /* ---------- navigation wrappers ---------- */
    goBack    () { const t=this.currentTab(); t&&t.view.webContents.canGoBack()    && t.view.webContents.goBack(); }
    goForward () { const t=this.currentTab(); t&&t.view.webContents.canGoForward() && t.view.webContents.goForward(); }
    refresh   () { const t=this.currentTab(); t&&t.view.webContents.reload(); }
    navigate  (u) { const t=this.currentTab(); t&&t.view.webContents.loadURL(u); }
  
    /* ---------- renderer sync ---------- */
    syncTab (id) {
      if (id === this.activeTabId) this.updateNavState();
      this.pushTabList();
    }
    updateNavState () {
      const t=this.currentTab(); if (!t) return;
      this.win.webContents.send('navigation-state-updated', {
        url:t.url, title:t.title,
        canGoBack:t.view.webContents.canGoBack(),
        canGoForward:t.view.webContents.canGoForward()
      });
    }
    pushTabList () {
      this.win.webContents.send('tabs-updated',
        [...this.tabs.values()].map(tab=>({
          id:tab.id, title:tab.title, url:tab.url,
          active: tab.id===this.activeTabId
        }))
      );
    }
  
    /* ---------- menu ---------- */
    setApplicationMenu () {
      const template=[{
        label:'MINI-PROJECT',
        submenu:[
          { role:'about', label:'About MINI-PROJECT' },
          { type:'separator' },
          { label:'New Tab',   accelerator:'CmdOrCtrl+T', click:()=>this.createTab() },
          { label:'Close Tab', accelerator:'CmdOrCtrl+W', click:()=>this.closeTab(this.activeTabId) },
          { type:'separator' },
          { role:'quit', label:'Quit MINI-PROJECT' }
        ]
      }];
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
  
    /* ---------- IPC ---------- */
    registerIPC () {
      ipcMain.handle('create-new-tab', (_e,u)=>this.createTab(u));
      ipcMain.handle('switch-to-tab',  (_e,id)=>this.switchToTab(id));
      ipcMain.handle('close-tab',      (_e,id)=>this.closeTab(id));
      ipcMain.handle('navigate-to',    (_e,u) =>this.navigate(u));
      ipcMain.handle('go-back',        ()=>this.goBack());
      ipcMain.handle('go-forward',     ()=>this.goForward());
      ipcMain.handle('refresh-page',   ()=>this.refresh());
      ipcMain.handle('go-home',        ()=>this.navigate(this.searchPage()));
      ipcMain.handle('search',         (_e,q) =>this.navigate(this.searchPage()+`?q=${encodeURIComponent(q)}`));
    }
  }
  
  /* ───────── app life-cycle ───────── */
  const browser = new MiniProjectBrowser();
  
  app.whenReady().then(() => {
    app.setName('MINI-PROJECT');                        // runtime label
    app.setAboutPanelOptions({ applicationName:'MINI-PROJECT' });
  
    browser.createWindow();
    browser.registerIPC();
  
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) browser.createWindow();
    });
  });
  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  