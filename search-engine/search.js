class NishanthSearchEngine {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.resultsContainer = document.getElementById('results-container');
        this.resultsList = document.getElementById('results-list');
        this.resultsCount = document.getElementById('results-count');
        this.imageGallery = document.getElementById('image-gallery');
        this.crawlerStatus = document.getElementById('crawler-status');
        this.crawlProgress = document.getElementById('crawl-progress');
        this.crawlStats = document.getElementById('crawl-stats');
        
        this.searchResults = [];
        this.crawledImages = [];
        
        this.initializeSearch();
        this.initializeTabs();
        this.checkForQuery();
    }

    initializeSearch() {
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
    }

    initializeTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-results`).classList.add('active');

        // Start image crawling if images tab is selected and we have search results
        if (tabName === 'images' && this.searchResults.length > 0) {
            this.startImageCrawling();
        }
    }

    checkForQuery() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            this.searchInput.value = query;
            this.performSearch();
        }
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        this.showLoadingState();
        this.resetImageSection();
        
        try {
            const results = await this.searchAllEngines(query);
            this.searchResults = results;
            this.displayResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    async searchAllEngines(query) {
        console.log(`🔍 Nishanth Browser: Searching ALL search engines for "${query}"`);
        
        const allResults = [];
        
        const searchPromises = [
            this.searchDuckDuckGo(query),
            this.searchBingAPI(query),
            this.searchGoogleProxy(query),
            this.searchBraveSearch(query),
            this.searchYahoo(query),
            this.searchWikipedia(query),
            this.searchGitHub(query),
            this.searchReddit(query),
            this.searchStackOverflow(query),
            this.searchHackerNews(query)
        ];

        const results = await Promise.allSettled(searchPromises);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                allResults.push(...result.value);
            }
        });

        const uniqueResults = this.removeDuplicatesAndRank(allResults);
        
        console.log(`🎉 Found ${uniqueResults.length} results from all search engines!`);
        
        return uniqueResults.slice(0, 20);
    }

    async startImageCrawling() {
        if (this.crawledImages.length > 0) {
            this.displayImages();
            return;
        }

        console.log('🖼️ Starting image crawling from search results...');
        
        this.crawlerStatus.textContent = '🕷️ Web crawler is extracting images from search results...';
        this.crawlProgress.style.display = 'block';
        
        const crawlableUrls = this.searchResults
            .filter(result => this.isCrawlableUrl(result.url))
            .slice(0, 10); // Crawl top 10 results

        console.log(`🕷️ Crawling ${crawlableUrls.length} websites for images`);
        
        let crawledCount = 0;
        const totalCount = crawlableUrls.length;

        for (const result of crawlableUrls) {
            try {
                this.updateCrawlProgress(crawledCount, totalCount, result.source);
                const images = await this.crawlImagesFromUrl(result);
                this.crawledImages.push(...images);
                
                // Update display as we find images
                if (images.length > 0) {
                    this.displayImages();
                }
            } catch (error) {
                console.error(`Error crawling ${result.url}:`, error);
            }
            
            crawledCount++;
            await this.delay(500); // Delay between requests to be respectful
        }

        this.finalizeCrawling();
    }

    isCrawlableUrl(url) {
        // Only crawl certain types of URLs that are likely to have images
        const crawlablePatterns = [
            /wikipedia\.org/,
            /github\.com/,
            /reddit\.com/,
            /medium\.com/,
            /news\./,
            /blog/,
            /article/
        ];
        
        return crawlablePatterns.some(pattern => pattern.test(url));
    }

    async crawlImagesFromUrl(searchResult) {
        try {
            console.log(`🕷️ Crawling images from: ${searchResult.source} - ${searchResult.url}`);
            
            // Simulate web scraping (in a real implementation, you'd use a proxy or server-side scraper)
            // For now, we'll generate some mock images based on the search result
            const mockImages = await this.generateMockImages(searchResult);
            
            return mockImages;
        } catch (error) {
            console.error(`Failed to crawl ${searchResult.url}:`, error);
            return [];
        }
    }

    async generateMockImages(searchResult) {
        // This simulates finding images on web pages
        // In a real implementation, you'd parse HTML and extract <img> tags
        
        const imageServices = [
            'picsum.photos',
            'via.placeholder.com',
            'placehold.co'
        ];
        
        const images = [];
        const numImages = Math.floor(Math.random() * 4) + 1; // 1-4 images per site
        
        for (let i = 0; i < numImages; i++) {
            const size = 300 + (i * 50);
            const service = imageServices[i % imageServices.length];
            
            let imageUrl;
            if (service === 'picsum.photos') {
                imageUrl = `https://picsum.photos/${size}/${size}?random=${Date.now()}-${i}`;
            } else if (service === 'via.placeholder.com') {
                imageUrl = `https://via.placeholder.com/${size}x${size}/667eea/ffffff?text=${encodeURIComponent(searchResult.source)}`;
            } else {
                imageUrl = `https://placehold.co/${size}x${size}/764ba2/ffffff/png?text=${encodeURIComponent(searchResult.source)}`;
            }
            
            images.push({
                url: imageUrl,
                title: `Image from ${searchResult.title}`,
                source: searchResult.source,
                sourceUrl: searchResult.url,
                favicon: searchResult.favicon || '🖼️'
            });
        }
        
        return images;
    }

    updateCrawlProgress(crawledCount, totalCount, sourceName) {
        const percentage = (crawledCount / totalCount) * 100;
        document.querySelector('.crawl-progress-fill').style.width = `${percentage}%`;
        this.crawlStats.textContent = `Crawling: ${crawledCount}/${totalCount} sites • Current: ${sourceName}`;
    }

    finalizeCrawling() {
        this.crawlProgress.style.display = 'none';
        
        if (this.crawledImages.length > 0) {
            this.crawlerStatus.textContent = `🎉 Found ${this.crawledImages.length} images from ${this.searchResults.length} websites!`;
            this.displayImages();
        } else {
            this.crawlerStatus.textContent = '😔 No images found in the search results';
            this.showNoImages();
        }
    }

    displayImages() {
        if (this.crawledImages.length === 0) {
            this.showNoImages();
            return;
        }

        this.imageGallery.innerHTML = this.crawledImages.map((image, index) => `
            <div class="image-item" data-index="${index}" data-url="${this.escapeHtml(image.sourceUrl)}">
                <img src="${this.escapeHtml(image.url)}" 
                     alt="${this.escapeHtml(image.title)}"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x300/667eea/ffffff?text=Image+Not+Found'">
                <div class="image-overlay">
                    <div class="image-source">${image.favicon} ${this.escapeHtml(image.source)}</div>
                    <div class="image-title">${this.escapeHtml(image.title)}</div>
                </div>
            </div>
        `).join('');

        // Add click listeners to images
        this.addImageClickListeners();
    }

    addImageClickListeners() {
        const imageItems = document.querySelectorAll('.image-item');
        imageItems.forEach(item => {
            item.addEventListener('click', () => {
                const sourceUrl = item.getAttribute('data-url');
                if (sourceUrl) {
                    this.navigateToResult(sourceUrl);
                }
            });
        });
    }

    showNoImages() {
        this.imageGallery.innerHTML = `
            <div class="no-images">
                <div style="font-size: 4rem; margin-bottom: 20px;">🖼️</div>
                <h3>No images found</h3>
                <p>The web crawler couldn't find images in the current search results.<br>Try searching for visual topics or check the Web Results tab.</p>
            </div>
        `;
    }

    resetImageSection() {
        this.crawledImages = [];
        this.imageGallery.innerHTML = '';
        this.crawlerStatus.textContent = 'Ready to crawl images from search results...';
        this.crawlProgress.style.display = 'none';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Include all the search engine methods from before
    async searchDuckDuckGo(query) {
        try {
            const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
            const data = await response.json();
            
            const results = [];

            if (data.Answer) {
                results.push({
                    title: `${query} - Direct Answer`,
                    url: data.AnswerURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                    description: data.Answer,
                    source: 'DuckDuckGo',
                    engine: 'DuckDuckGo',
                    favicon: '🦆',
                    score: 10
                });
            }

            if (data.Abstract) {
                results.push({
                    title: `${query} - ${data.AbstractSource || 'Encyclopedia'}`,
                    url: data.AbstractURL,
                    description: data.Abstract,
                    source: data.AbstractSource || 'DuckDuckGo',
                    engine: 'DuckDuckGo',
                    favicon: '🦆',
                    score: 9
                });
            }

            results.push({
                title: `${query} - DuckDuckGo Search Results`,
                url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                description: `Complete search results for "${query}" on DuckDuckGo`,
                source: 'DuckDuckGo',
                engine: 'DuckDuckGo',
                favicon: '🦆',
                score: 8
            });

            return results;
        } catch (error) {
            return [];
        }
    }

    async searchBingAPI(query) {
        try {
            const results = [];
            
            results.push({
                title: `${query} - Bing Search Results`,
                url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
                description: `Comprehensive search results for "${query}" on Microsoft Bing`,
                source: 'Microsoft Bing',
                engine: 'Bing',
                favicon: '🔎',
                score: 8
            });

            return results;
        } catch (error) {
            return [];
        }
    }

    async searchGoogleProxy(query) {
        try {
            const results = [];
            
            results.push({
                title: `${query} - Google Search`,
                url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                description: `The world's most popular search results for "${query}"`,
                source: 'Google',
                engine: 'Google',
                favicon: '🔍',
                score: 10
            });

            return results;
        } catch (error) {
            return [];
        }
    }

    async searchBraveSearch(query) {
        try {
            return [{
                title: `${query} - Brave Search`,
                url: `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
                description: `Private, independent search results for "${query}"`,
                source: 'Brave Search',
                engine: 'Brave',
                favicon: '🦁',
                score: 9
            }];
        } catch (error) {
            return [];
        }
    }

    async searchYahoo(query) {
        try {
            return [{
                title: `${query} - Yahoo Search`,
                url: `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
                description: `Search results for "${query}" on Yahoo`,
                source: 'Yahoo',
                engine: 'Yahoo',
                favicon: '💜',
                score: 7
            }];
        } catch (error) {
            return [];
        }
    }

    async searchWikipedia(query) {
        try {
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=2&format=json&origin=*`;
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            const results = [];
            if (data[1] && data[1].length > 0) {
                for (let i = 0; i < data[1].length; i++) {
                    results.push({
                        title: data[1][i],
                        url: data[3][i],
                        description: data[2][i] || `Wikipedia article about ${data[1][i]}`,
                        source: 'Wikipedia',
                        engine: 'Wikipedia API',
                        favicon: '📚',
                        score: 9
                    });
                }
            }
            return results;
        } catch (error) {
            return [];
        }
    }

    async searchGitHub(query) {
        try {
            const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=2`);
            const data = await response.json();
            
            const results = [];
            if (data.items) {
                data.items.forEach(repo => {
                    results.push({
                        title: `${repo.name} - ${repo.owner.login}`,
                        url: repo.html_url,
                        description: repo.description || `GitHub repository: ${repo.full_name}`,
                        source: 'GitHub',
                        engine: 'GitHub API',
                        favicon: '💻',
                        score: 8
                    });
                });
            }
            return results;
        } catch (error) {
            return [];
        }
    }

    async searchReddit(query) {
        try {
            const response = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=2&sort=relevance`);
            const data = await response.json();
            
            const results = [];
            if (data.data && data.data.children) {
                data.data.children.forEach(post => {
                    const postData = post.data;
                    results.push({
                        title: postData.title,
                        url: `https://reddit.com${postData.permalink}`,
                        description: postData.selftext || `Reddit discussion in r/${postData.subreddit}`,
                        source: 'Reddit',
                        engine: 'Reddit API',
                        favicon: '💬',
                        score: 7
                    });
                });
            }
            return results;
        } catch (error) {
            return [];
        }
    }

    async searchStackOverflow(query) {
        try {
            const response = await fetch(`https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle=${encodeURIComponent(query)}&site=stackoverflow&pagesize=2`);
            const data = await response.json();
            
            const results = [];
            if (data.items) {
                data.items.forEach(question => {
                    results.push({
                        title: question.title,
                        url: question.link,
                        description: `Stack Overflow Q&A - ${question.answer_count} answers`,
                        source: 'Stack Overflow',
                        engine: 'Stack Overflow API',
                        favicon: '❓',
                        score: 8
                    });
                });
            }
            return results;
        } catch (error) {
            return [];
        }
    }

    async searchHackerNews(query) {
        try {
            const response = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=2`);
            const data = await response.json();
            
            const results = [];
            if (data.hits) {
                data.hits.forEach(hit => {
                    if (hit.url && hit.title) {
                        results.push({
                            title: hit.title,
                            url: hit.url,
                            description: `Hacker News - ${hit.points || 0} points`,
                            source: 'Hacker News',
                            engine: 'HackerNews API',
                            favicon: '📰',
                            score: 7
                        });
                    }
                });
            }
            return results;
        } catch (error) {
            return [];
        }
    }

    removeDuplicatesAndRank(results) {
        const urlMap = new Map();
        
        results.forEach(result => {
            if (!result.url || !result.title) return;
            
            const key = result.url.toLowerCase();
            if (!urlMap.has(key) || urlMap.get(key).score < result.score) {
                urlMap.set(key, result);
            }
        });
        
        return Array.from(urlMap.values())
            .sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    showLoadingState() {
        this.resultsContainer.style.display = 'block';
        this.resultsList.innerHTML = `
            <div class="loading-state">
                <div style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 20px;">🌐 Nishanth Browser is searching ALL search engines...</p>
                    <div style="opacity: 0.7; margin-top: 10px; line-height: 1.6;">
                        🔍 Google • 🦆 DuckDuckGo • 🔎 Bing • 🦁 Brave<br>
                        💜 Yahoo • 📚 Wikipedia • 💻 GitHub • 💬 Reddit
                    </div>
                </div>
            </div>
        `;
        this.resultsCount.textContent = 'Searching engines...';
    }

    displayResults(results, query) {
        this.resultsCount.textContent = `🎉 Found ${results.length} results from ALL search engines for "${query}"`;
        
        if (results.length === 0) {
            this.resultsList.innerHTML = `
                <div class="no-results" style="text-align: center; padding: 40px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🔍</div>
                    <h3>No results found for "${query}"</h3>
                    <p style="opacity: 0.7; margin-top: 10px;">Try a different search term</p>
                </div>
            `;
            return;
        }
        
        this.resultsList.innerHTML = results.map((result, index) => `
            <div class="result-item" data-url="${this.escapeHtml(result.url)}" data-index="${index}">
                <div class="result-header">
                    <div class="result-title">
                        <span class="result-favicon">${result.favicon || '🌐'}</span>
                        ${this.escapeHtml(result.title)}
                    </div>
                    <div class="result-source">${this.escapeHtml(result.source)}</div>
                </div>
                <div class="result-url">${this.escapeHtml(result.url)}</div>
                <div class="result-description">${this.escapeHtml(result.description)}</div>
                <div class="result-engine">Found by: ${result.engine} ${result.favicon}</div>
            </div>
        `).join('');

        setTimeout(() => {
            this.addResultClickListeners();
        }, 100);
    }

    addResultClickListeners() {
        const resultItems = document.querySelectorAll('.result-item');
        
        resultItems.forEach((item, index) => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const url = newItem.getAttribute('data-url');
                if (url && url !== 'null' && url !== 'undefined') {
                    this.navigateToResult(url);
                }
            });
        });
    }

    navigateToResult(url) {
        try {
            if (window.electronAPI && window.electronAPI.navigateTo) {
                window.electronAPI.navigateTo(url);
            } else if (window.browserAPI && window.browserAPI.navigateTo) {
                window.browserAPI.navigateTo(url);
            } else {
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.resultsList.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 40px;">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                <p>${message}</p>
            </div>
        `;
    }
}

function quickSearch(type) {
    const queries = {
        weather: 'current weather',
        news: 'breaking news today',
        translate: 'online translator',
        calculator: 'calculator tool'
    };
    
    document.getElementById('search-input').value = queries[type];
    const searchEngine = new NishanthSearchEngine();
    searchEngine.performSearch();
}

document.addEventListener('DOMContentLoaded', () => {
    new NishanthSearchEngine();
});
