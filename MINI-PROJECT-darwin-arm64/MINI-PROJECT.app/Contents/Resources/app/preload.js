const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
    // Navigation
    navigateTo: (url) => ipcRenderer.invoke('navigate-to', url),
    searchNishanth: (query) => ipcRenderer.invoke('search-nishanth', query),
    goBack: () => ipcRenderer.invoke('go-back'),
    goForward: () => ipcRenderer.invoke('go-forward'),
    refreshPage: () => ipcRenderer.invoke('refresh-page'),
    goHome: () => ipcRenderer.invoke('go-home'),
    
    // Tab management
    createNewTab: (url) => ipcRenderer.invoke('create-new-tab', url),
    switchToTab: (tabId) => ipcRenderer.invoke('switch-to-tab', tabId),
    closeTab: (tabId) => ipcRenderer.invoke('close-tab', tabId),
    
    // Event listeners
    onNavigationStateUpdate: (callback) => {
        ipcRenderer.on('navigation-state-updated', (event, state) => {
            callback(state);
        });
    },
    
    onTabsUpdate: (callback) => {
        ipcRenderer.on('tabs-updated', (event, tabs) => {
            callback(tabs);
        });
    }
});

// Also expose for search engine pages
contextBridge.exposeInMainWorld('electronAPI', {
    navigateTo: (url) => ipcRenderer.invoke('navigate-to', url)
});
