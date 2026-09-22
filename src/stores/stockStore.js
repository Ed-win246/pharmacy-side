import { defineStore } from 'pinia';

const STORAGE_KEY = 'pharmacy-stock-items';

function loadItems() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
        console.error('Failed to load saved stock items', error);
        return [];
    }
}

function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const useStockStore = defineStore('stockStore', {
    state: () => ({
        items: loadItems(),
    }),

    actions: {
        addItem(item) {
            this.items.push(item);
            saveItems(this.items);
        },

        removeItem(index) {
            this.items.splice(index,1);
            saveItems(this.items);
        },

        clearItems() {
            this.items = [];
            saveItems(this.items);
        },
    },
});

