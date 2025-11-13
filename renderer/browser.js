class NishanthBrowserUI {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.initializeElements();
        this.setupEventListeners();
        this.showWelcomeMessage();
    }

    initializeElements() {
        this.backBtn = document.getElementById('back-btn');
        this.forwardBtn = document.getElementById('forward-btn');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.addressBar = document.getElementById('address-bar');
        this.newTabBtn = document.getElementById('new-tab-btn');
        this.menuBtn = document.getElementById('menu-btn');
        this.tabBar = document.getElementById('tab-bar');
        
        // Initially disable navigation buttons
        this.backBtn.disabled = true;
        this.forwardBtn.disabled = true;
    }

    setupEventListeners() {
        // Address bar
        this.addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleInput(this.addressBar.value);
            }
        });

        this.addressBar.addEventListener('focus', (e) => {
            e.target.select();
        });

        // Navigation buttons
        this.backBtn.addEventListener('click', () => {
            window.browserAPI.goBack();
        });

        this.forwardBtn.addEventListener('click', () => {
            window.browserAPI.goForward();
        });

        this.refreshBtn.addEventListener('click', () => {
            window.browserAPI.refreshPage();
        });

        // NEW TAB BUTTON - This is the key functionality you requested
        this.newTabBtn.addEventListener('click', () => {
            console.log('Creating new tab, keeping current tab running in background...');
            window.browserAPI.createNewTab();
        });

        this.menuBtn.addEventListener('click', (e) => {
            this.showContextMenu(e);
        });

        // Listen for tab updates
        if (window.browserAPI.onTabsUpdate) {
            window.browserAPI.onTabsUpdate((tabs) => {
                this.updateTabBar(tabs);
            });
        }

        // Listen for navigation state updates
        if (window.browserAPI.onNavigationStateUpdate) {
            window.browserAPI.onNavigationStateUpdate((state) => {
                this.updateNavigationState(state);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey) {
                switch(e.key) {
                    case 't':
                        e.preventDefault();
                        window.browserAPI.createNewTab();
                        break;
                    case 'w':
                        e.preventDefault();
                        if (this.activeTabId) {
                            window.browserAPI.closeTab(this.activeTabId);
                        }
                        break;
                    case 'r':
                        e.preventDefault();
                        window.browserAPI.refreshPage();
                        break;
                    case 'h':
                        e.preventDefault();
                        window.browserAPI.goHome();
                        break;
                }
            }
        });
    }

    updateTabBar(tabs) {
        this.tabs = tabs;
        this.activeTabId = tabs.find(tab => tab.active)?.id || null;
        
        // Clear existing tabs
        this.tabBar.innerHTML = '';
        
        // Create tab elements
        tabs.forEach(tab => {
            const tabElement = this.createTabElement(tab);
            this.tabBar.appendChild(tabElement);
        });
        
        console.log(`Tab bar updated: ${tabs.length} tabs, active: ${this.activeTabId}`);
    }

    createTabElement(tab) {
        const tabElement = document.createElement('div');
        tabElement.className = `tab ${tab.active ? 'active' : ''}`;
        tabElement.setAttribute('data-tab-id', tab.id);
        
        tabElement.innerHTML = `
            <div class="tab-favicon">${tab.favicon}</div>
            <div class="tab-title">${tab.title}</div>
            <button class="tab-close" title="Close tab">-</button>
        `;
        
        // Tab click to switch
        tabElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                console.log(`Switching to tab ${tab.id}: ${tab.title}`);
                window.browserAPI.switchToTab(tab.id);
            }
        });
        
        // Close button
        const closeBtn = tabElement.querySelector('.tab-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`Closing tab ${tab.id}: ${tab.title}`);
            window.browserAPI.closeTab(tab.id);
        });
        
        return tabElement;
    }

    updateNavigationState(state) {
        // Update address bar
        this.addressBar.value = state.url;
        
        // Update button states
        this.backBtn.disabled = !state.canGoBack;
        this.forwardBtn.disabled = !state.canGoForward;
        
        // Update button appearance
        this.backBtn.style.opacity = state.canGoBack ? '1' : '0.5';
        this.forwardBtn.style.opacity = state.canGoForward ? '1' : '0.5';
    }

    showContextMenu(event) {
        event.preventDefault();
        
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="menu-item" data-action="new-tab">🆕 New Tab</div>
            <div class="menu-item" data-action="close-tab">❌ Close Current Tab</div>
            <div class="menu-separator"></div>
            <div class="menu-item" data-action="home">🏠 Home</div>
            <div class="menu-item" data-action="refresh">🔄 Refresh</div>
            <div class="menu-separator"></div>
            <div class="menu-item" data-action="about">ℹ️ About Nishanth Browser</div>
        `;
        
        menu.style.position = 'fixed';
        menu.style.top = '70px';
        menu.style.right = '10px';
        menu.style.zIndex = '1000';
        
        document.body.appendChild(menu);
        
        menu.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            switch(action) {
                case 'new-tab':
                    window.browserAPI.createNewTab();
                    break;
                case 'close-tab':
                    if (this.activeTabId) {
                        window.browserAPI.closeTab(this.activeTabId);
                    }
                    break;
                case 'home':
                    window.browserAPI.goHome();
                    break;
                case 'refresh':
                    window.browserAPI.refreshPage();
                    break;
                case 'about':
                    alert("Nishanth's Browser v1.0\n\nThe Ultimate Privacy Multi-Tab Browser\n🚫 No Ads • 🔒 No Tracking • 📑 Multi-Tab Support • 💜 Made with Love by Nishanth");
                    break;
            }
            menu.remove();
        });
        
        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.remove();
            }, { once: true });
        }, 100);
    }

    handleInput(input) {
        const trimmed = input.trim();
        
        if (!trimmed) return;

        if (trimmed.includes('.') && !trimmed.includes(' ') && (trimmed.startsWith('http') || trimmed.startsWith('www') || !trimmed.includes(' '))) {
            let url = trimmed;
            if (!url.includes('://')) {
                url = 'https://' + url;
            }
            window.browserAPI.navigateTo(url);
        } else {
            window.browserAPI.searchNishanth(trimmed);
        }
    }

    showWelcomeMessage() {
        setTimeout(() => {
            console.log("🎉 Welcome to Nishanth's Multi-Tab Browser!");
            console.log("📑 Click '+' to create new tabs while keeping current ones running");
            console.log("🔄 Switch between tabs by clicking on them");
            console.log("❌ Close tabs with the × button or Cmd/Ctrl+W");
            console.log("🔍 Powered by Nishanth Search Engine");
            console.log("🛡️ Your privacy is protected across all tabs");
            console.log("💜 Made with love by Nishanth");
        }, 1000);
    }
}

new NishanthBrowserUI();
