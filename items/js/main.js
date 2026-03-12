//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

const CONFIG = {
    IMAGE_BASE_URL: 'https://tarkynator.com/data/images/',
    IMAGE_EXTENSION: '-512.webp',
    ITEMS_JSON_URL: '/api/data/shared/item_counters.json',
    LOCALE_JSON_URL: '../items/js/data/en.json',
    LOCALE_JSON_LOCAL_URL: '../fallbacks/shared/item_counters.json',
    SUFFIXES: {
        NAME: ' Name',
        SHORT_NAME: ' ShortName'
    },
    ITEMS_PER_PAGE: 100
};

class ItemsRenderer {
    constructor() {
        this.itemsData = null;
        this.localeData = null;
        this.filteredItems = [];
        this.currentPage = 1;
        this.debounceTimer = null;
        this.totalItems = 0;
        this.totalExtracted = 0;
        this.totalDied = 0;
        // Caching
        this.imageCache = new Map();
        this.lastFetchTime = 0;
        this.CACHE_DURATION = 120000;

        // DOM
        this.elements = {
            itemsGrid: document.getElementById('items-grid'),
            pagination: document.getElementById('pagination'),
            pageNumbers: document.getElementById('page-numbers'),
            searchInput: document.getElementById('item-search'),
            sortSelect: document.getElementById('sort-select'),
            totalItems: document.getElementById('total-items'),
            totalExtracted: document.getElementById('total-extracted'),
            totalDied: document.getElementById('total-died'),
            prevBtn: document.querySelector('.prev-btn'),
            nextBtn: document.querySelector('.next-btn'),
            loader: document.getElementById('loader')
        };

        this.rafId = null;
        this.currentItemsMap = new Map();
    }

    async init() {
        try {
            await this.loadData();
            this.calculateTotals();
            this.renderStatistics();
            this.renderItems();
            this.setupEventListeners();
        } catch (error) {
            this.showError('Error loading: ' + error.message);
        }
    }

    async loadData() {
        const now = Date.now();
        if (now - this.lastFetchTime < this.CACHE_DURATION && this.itemsData && this.localeData) {
            return;
        }

        let itemsPath = isLocalhost ? CONFIG.LOCALE_JSON_LOCAL_URL : CONFIG.ITEMS_JSON_URL;

        const [itemsResponse, localeResponse] = await Promise.all([
            fetch(`${itemsPath}?t=${Date.now()}`),
            fetch(CONFIG.LOCALE_JSON_URL)
        ]);

        if (!itemsResponse.ok || !localeResponse.ok) {
            throw new Error('Could not load item data');
        }

        this.itemsData = await itemsResponse.json();
        this.localeData = await localeResponse.json();

        this.totalItems = Object.keys(this.itemsData).length;
        this.filteredItems = this.prepareItemsData();

        // Set last fetch time
        this.lastFetchTime = now;
    }

    prepareItemsData() {
        return Object.entries(this.itemsData).map(([itemId, stats]) => {
            const localeInfo = this.getItemInfo(itemId);
            const total = stats.extracted + stats.died;
            const extractedRatio = total > 0 ? (stats.extracted / total) * 100 : 0;
            const lastUpdated = stats.last_updated || 0;

            return {
                id: itemId,
                name: localeInfo.name,
                nameLower: localeInfo.name.toLowerCase(),
                shortName: localeInfo.shortName,
                shortNameLower: localeInfo.shortName.toLowerCase(),
                extracted: stats.extracted,
                died: stats.died,
                total: total,
                extractedRatio: extractedRatio,
                lastUpdated: lastUpdated,
                timestamp: lastUpdated
            };
        });
    }

    calculateTotals() {
        this.totalExtracted = this.filteredItems.reduce((sum, item) => sum + item.extracted, 0);
        this.totalDied = this.filteredItems.reduce((sum, item) => sum + item.died, 0);
    }

    renderStatistics() {
        this.elements.totalItems.textContent = this.totalItems.toLocaleString();
        this.elements.totalExtracted.textContent = this.totalExtracted.toLocaleString();
        this.elements.totalDied.textContent = this.totalDied.toLocaleString();
        this.elements.loader.style.display = 'none';
    }

    getItemLocale(itemId, suffix) {
        const key = itemId + suffix;
        return this.localeData[key] || null;
    }

    getItemInfo(itemId) {
        return {
            name: this.getItemLocale(itemId, CONFIG.SUFFIXES.NAME) || 'Unknown Item',
            shortName: this.getItemLocale(itemId, CONFIG.SUFFIXES.SHORT_NAME) || ''
        };
    }

    getImageUrl(itemId) {
        if (this.imageCache.has(itemId)) {
            return this.imageCache.get(itemId);
        }

        const url = `${CONFIG.IMAGE_BASE_URL}${itemId}${CONFIG.IMAGE_EXTENSION}`;
        this.imageCache.set(itemId, url);
        return url;
    }

    sortItems(items) {
        const sortBy = this.elements.sortSelect.value;

        return [...items].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'extracted':
                    return b.extracted - a.extracted;
                case 'died':
                    return b.died - a.died;
                case 'total':
                    return b.total - a.total;
                case 'latest':
                    return (b.timestamp || 0) - (a.timestamp || 0);
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    }

    filterItems(items) {
        const searchTerm = this.elements.searchInput.value.trim().toLowerCase();

        if (!searchTerm) {
            return items;
        }

        return items.filter(item => {
            return item.nameLower.includes(searchTerm) ||
                item.shortNameLower.includes(searchTerm);
        });
    }

    createItemCard(item) {
        // Filter bad items
        const badItems = new Set([
            'Roubles',
            'Dollars',
            'Euros',
            'Сity key',
            '1.25 mm aramid insert and titanium plates',
            'Unknown Item',
            'Armor steel',
            '6.5 mm aramid insert and titanium plates',
            'Working hard drive',
            '13 mm aramid insert and ceramic plates',
            'Aluminum insert',
            `Accountant's notes`,
            'Aramid insert'
        ]);

        if (badItems.has(item.name)) {
            return null;
        }

        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.itemId = item.id;

        const formattedDate = this.formatLastUpdated(item.lastUpdated);
        const isRecent = this.isRecentlyUpdated(item.lastUpdated);

        card.innerHTML = `
            <div class="item-header">
                <img src="${this.getImageUrl(item.id)}" alt="${item.name}" class="item-image">
                <div class="item-info">
                    <h3 class="item-name" title="${item.name}">
                        ${item.name.length > 40 ? item.name.substring(0, 40) + '...' : item.name}
                    </h3>
                    <div class="item-shortname">${item.shortName}</div>
                </div>
                ${item.lastUpdated ? `
                    <div class="last-updated ${isRecent ? 'recent-update' : ''}">
                        <span class="update-indicator">${formattedDate}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="item-stats">
                <div class="stat">
                    <div class="stat-value-i extracted-stat">${formatSalesNum(item.extracted).toLocaleString()}</div>
                    <div class="stat-label-i">Extracted</div>
                </div>
                <div class="stat">
                    <div class="stat-value-i died-stat">${formatSalesNum(item.died).toLocaleString()}</div>
                    <div class="stat-label-i">Lost</div>
                </div>
                <div class="stat">
                    <div class="stat-value-i">${formatSalesNum(item.total).toLocaleString()}</div>
                    <div class="stat-label-i">Total</div>
                </div>
                
                <div class="stat-ratio">
                    <div class="ratio-bar">
                        <div class="ratio-progress" 
                             style="width: ${item.extractedRatio}%"></div>
                    </div>
                    <div class="ratio-label">
                        <span class="extracted-ratio">
                            ${item.extractedRatio.toFixed(1)}% Extracted
                        </span>
                        <span class="died-ratio">
                            ${(100 - item.extractedRatio).toFixed(1)}% Lost
                        </span>
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    renderPagination(totalPages) {
        this.elements.pageNumbers.innerHTML = '';

        this.elements.prevBtn.disabled = this.currentPage === 1;
        this.elements.nextBtn.disabled = this.currentPage === totalPages;

        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('div');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            this.elements.pageNumbers.appendChild(pageBtn);
        }
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;

        this.currentPage = page;
        this.renderItems();
    }

    renderItems() {
        const filtered = this.filterItems(this.filteredItems);
        const sorted = this.sortItems(filtered);

        this.totalPages = Math.ceil(sorted.length / CONFIG.ITEMS_PER_PAGE);
        const startIndex = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + CONFIG.ITEMS_PER_PAGE, sorted.length);
        const itemsToShow = sorted.slice(startIndex, endIndex);

        // Update DOM partially
        this.updateItemsGrid(itemsToShow);
        this.renderPagination(this.totalPages);
    }

    updateItemsGrid(itemsToShow) {
        if (itemsToShow.length === 0) {
            this.elements.itemsGrid.innerHTML = `
                <div class="no-items">
                    <h3>No items found</h3>
                    <p>Try adjusting your search or filter</p>
                </div>
            `;
            this.currentItemsMap.clear();
            return;
        }

        const newItemsMap = new Map();
        const fragment = document.createDocumentFragment();

        // Create new cards
        itemsToShow.forEach(item => {
            const card = this.createItemCard(item);
            if (card) {
                newItemsMap.set(item.id, card);
                fragment.appendChild(card);
            }
        });

        // Find diff
        const itemsToRemove = [];
        const itemsToAdd = [];

        this.currentItemsMap.forEach((card, itemId) => {
            if (!newItemsMap.has(itemId)) {
                itemsToRemove.push(card);
            }
        });

        newItemsMap.forEach((card, itemId) => {
            if (!this.currentItemsMap.has(itemId)) {
                itemsToAdd.push(card);
            }
        });

        if (itemsToRemove.length === 0 && itemsToAdd.length > 0) {
            this.elements.itemsGrid.appendChild(fragment);
        }
        else if (itemsToRemove.length > 5 || itemsToAdd.length > 5) {
            this.elements.itemsGrid.innerHTML = '';
            this.elements.itemsGrid.appendChild(fragment);
        }
        // If not many cards to change, partially replace them
        else {
            // Delete old cards
            itemsToRemove.forEach(card => {
                if (card.parentNode === this.elements.itemsGrid) {
                    this.elements.itemsGrid.removeChild(card);
                }
            });

            // Add new if any
            itemsToAdd.forEach(card => {
                this.elements.itemsGrid.appendChild(card);
            });
        }

        this.currentItemsMap = newItemsMap;
    }

    setupEventListeners() {
        this.elements.searchInput.addEventListener('input', () => {
            if (this.rafId) cancelAnimationFrame(this.rafId);

            this.rafId = requestAnimationFrame(() => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.currentPage = 1;
                    this.renderItems();
                }, 300);
            });
        });

        this.elements.sortSelect.addEventListener('change', () => {
            this.currentPage = 1;
            this.renderItems();
        });

        this.elements.prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            }
        });

        this.elements.nextBtn.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.goToPage(this.currentPage + 1);
            }
        });

        // Auto-refresh every 30 seconds
        setInterval(async () => {
            try {
                await this.loadData();
                this.calculateTotals();
                this.renderStatistics();
                this.renderItems();
            } catch (error) {
                console.error('Auto-refresh failed:', error);
            }
        }, 30000);
    }

    showError(message) {
        this.elements.itemsGrid.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Items</h3>
                <p>${message}</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    formatLastUpdated(unixTimestamp) {
        if (typeof unixTimestamp !== "number" || unixTimestamp <= 0) {
            return "Unknown";
        }

        const date = new Date(unixTimestamp * 1000);
        const now = new Date();

        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return diffMins === 0 ? 'Just now' : `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    }

    isRecentlyUpdated(dateString) {
        if (!dateString) return false;

        const now = new Date();
        const date = new Date(dateString * 1000);
        const diffHours = (now - date) / 3600000;

        return diffHours < 5;
    }

    // Deprecated
    // Never called due static page
    destroy() {
        clearTimeout(this.debounceTimer);
        if (this.rafId) cancelAnimationFrame(this.rafId);

        this.imageCache.clear();
        this.currentItemsMap.clear();

        this.elements.searchInput.value = '';
        this.elements.sortSelect.value = 'name';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const renderer = new ItemsRenderer();
    renderer.init();
});