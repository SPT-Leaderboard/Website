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

        // DOM
        this.elements = {
            itemsGrid: document.getElementById('items-grid'),
            pagination: document.getElementById('pagination'),
            pageNumbers: document.getElementById('page-numbers'),
            searchInput: document.getElementById('item-search'),
            sortSelect: document.getElementById('sort-select'),
            filterSelect: document.getElementById('filter-select'),
            totalItems: document.getElementById('total-items'),
            totalExtracted: document.getElementById('total-extracted'),
            totalDied: document.getElementById('total-died'),
            prevBtn: document.querySelector('.prev-btn'),
            nextBtn: document.querySelector('.next-btn')
        };
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
        let itemsPath = isLocalhost ? CONFIG.LOCALE_JSON_LOCAL_URL : CONFIG.ITEMS_JSON_URL;

        const [itemsResponse, localeResponse] = await Promise.all([
            fetch(itemsPath),
            fetch(CONFIG.LOCALE_JSON_URL)
        ]);

        if (!itemsResponse.ok || !localeResponse.ok) {
            throw new Error('Could not load item data');
        }

        this.itemsData = await itemsResponse.json();
        this.localeData = await localeResponse.json();

        this.totalItems = Object.keys(this.itemsData).length;
        this.filteredItems = this.prepareItemsData();
    }

    prepareItemsData() {
        return Object.entries(this.itemsData).map(([itemId, stats]) => {
            const localeInfo = this.getItemInfo(itemId);
            const total = stats.extracted + stats.died;
            const extractedRatio = total > 0 ? (stats.extracted / total) * 100 : 0;

            return {
                id: itemId,
                name: localeInfo.name,
                shortName: localeInfo.shortName,
                extracted: stats.extracted,
                died: stats.died,
                total: total,
                extractedRatio: extractedRatio,
                lastUpdated: stats.last_updated ?? null
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
        return `${CONFIG.IMAGE_BASE_URL}${itemId}${CONFIG.IMAGE_EXTENSION}`;
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
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    }

    filterItems(items) {
        const filterBy = this.elements.filterSelect.value;
        const searchTerm = this.elements.searchInput.value.toLowerCase();

        return items.filter(item => {
            // Search
            const matchesSearch = searchTerm === '' ||
                item.name.toLowerCase().includes(searchTerm) ||
                item.shortName.toLowerCase().includes(searchTerm);

            if (!matchesSearch) return false;

            // Filters
            switch (filterBy) {
                case 'extracted':
                    return item.extracted > 0;
                case 'died':
                    return item.died > 0;
                default:
                    return true;
            }
        });
    }

    createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';

        const formattedDate = this.formatLastUpdated(item.lastUpdated);
        const isRecent = this.isRecentlyUpdated(item.lastUpdated);

        // Ignore bad items
        if (item.name === 'Unknown Item' ||
            item.name === 'Armor steel' ||
            item.name === '6.5 mm aramid insert and titanium plates' ||
            item.name === 'Working hard drive') return;
        

        card.innerHTML = `
            <div class="item-header">
                <img src="${this.getImageUrl(item.id)}"  alt="${item.name}"  class="item-image">
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
                    <div class="stat-value-i extracted-stat">${item.extracted.toLocaleString()}</div>
                    <div class="stat-label">Extracted</div>
                </div>
                <div class="stat">
                    <div class="stat-value-i died-stat">${item.died.toLocaleString()}</div>
                    <div class="stat-label">Lost</div>
                </div>
                <div class="stat">
                    <div class="stat-value-i">${item.total.toLocaleString()}</div>
                    <div class="stat-label">Total</div>
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

        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 10);

        return card;
    }

    renderPagination(totalPages) {
        this.elements.pageNumbers.innerHTML = '';

        // prev page
        this.elements.prevBtn.disabled = this.currentPage === 1;

        // next page
        this.elements.nextBtn.disabled = this.currentPage === totalPages;

        // page numbers
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
        const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
        const itemsToShow = sorted.slice(startIndex, endIndex);

        this.elements.itemsGrid.innerHTML = '';

        if (itemsToShow.length === 0) {
            this.elements.itemsGrid.innerHTML = `
                <div class="no-items">
                    <h3>No items found</h3>
                    <p>Try adjusting your search or filter</p>
                </div>
            `;
        } else {
            itemsToShow.forEach(item => {
                this.elements.itemsGrid.appendChild(this.createItemCard(item));
            });
        }

        this.renderPagination(this.totalPages);
    }

    setupEventListeners() {
        // bouncy debounce for search
        this.elements.searchInput.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.currentPage = 1;
                this.renderItems();
            }, 300);
        });

        this.elements.sortSelect.addEventListener('change', () => {
            this.currentPage = 1;
            this.renderItems();
        });

        this.elements.filterSelect.addEventListener('change', () => {
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
            await this.loadData();
            this.calculateTotals();
            this.renderStatistics();
            this.renderItems();
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

        return diffHours < 24;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const renderer = new ItemsRenderer();
    renderer.init();
});