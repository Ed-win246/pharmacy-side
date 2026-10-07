import { defineStore } from "pinia";
import toast from "@tsirosgeorge/toastnotification";
import api from "@/lib/api";

const PURCHASE_STORAGE_KEY = 'pharmacy-purchases';

function loadPurchases() {
    if (typeof localStorage === 'undefined') return [];

    try {
        return JSON.parse(localStorage.getItem(PURCHASE_STORAGE_KEY) || '[]');
    } catch (error) {
        console.error('Failed to load system purchases', error);
        return [];
    }
}

function savePurchases(purchases) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(purchases));
}

export const usePurchaseStore = defineStore('purchases', {
    state: () => ({
        purchases: loadPurchases(),
        paymentOptions: [],
        details: [],
        loading: false,
        paying: false,
    }),

    getters: {
        hasPurchases: (state) => state.purchases.length > 0,
    },

    actions: {
        async fetchPurchases() {
            this.loading = true;

            try {
                const { data } = await api.get('purchases');
                this.purchases = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                        ? data.data
                        : [];
                savePurchases(this.purchases);
            } catch (error) {
                console.error('Failed to load system purchases', error);
                toast.error('Failed to load system purchases');
            } finally {
                this.loading = false;
            }
        },

        async fetchPaymentOptions() {
            if (this.paymentOptions.length) return;

            try {
                const { data } = await api.get('/paymentOptions');
                this.paymentOptions = Array.isArray(data) ? data : data?.data ?? [];
            } catch (error) {
                console.error('Failed to load payment options', error);
                toast.error('Failed to load payment options');
            }
        },

        async fetchDetails(id) {
            try {
                const { data } = await api.get(`/purchase/${id}`);
                this.details = data && typeof data === 'object' ? data : {};
                return true;
            } catch (error) {
                console.error('Failed to load purchase', error);
                toast.error('Failed to load purchase details');
                return false;
            }
        },

        async pay(id, payload) {
            this.paying = true;

            try {
                const response = await api.post(`/purchases/${id}/payments`, payload);
                if (response?.status === 204 || response?.status === 200) {
                    toast.success('Payment recorded successfully');
                }
                await this.fetchPurchases();
                return true;
            } catch (error) {
                const errs = error.response?.data?.errors;
                toast.error(errs ? Object.values(errs).flat()[0] : 'Failed to submit payment');
                return false;
            } finally {
                this.paying = false;
            }
        },
    },
});