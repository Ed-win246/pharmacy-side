import { defineStore } from "pinia";

const STOCK_STORAGE_KEY='pharmacy-stock';

function loadStock(){
    try{
        return JSON.parse(localStorage.getItem(STOCK_STORAGE_KEY) || '[]');
    }catch(error){
        console.error('Failed to load stock available',error);
        return [];
    }
}

function saveStock(stocks){
    localStorage.setItem(STOCK_STORAGE_KEY,JSON.stringify(stocks));
}

export const useStockStore=defineStore('stocks',{
    state:()=>({
        stocks:loadStock(),
    }),
    actions:{

    },
});