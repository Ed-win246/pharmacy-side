import { defineStore } from "pinia";

const PRODUCT_STORAGE_KEY= 'pharmacy-products';


function loadProducts(){
    try{
        return JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || '[]');
    }catch(error){
        console.error('Failed to load saved products',error);
        return [];
    }
}

//function for storing products.
function saveProducts(products){
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products));
}

export const useProductStore=defineStore('products',{
   state:()=>({
        products:loadProducts(),
   }),
    actions:{
        setProducts(products){
            this.products=products;
            saveProducts(this.products);
        },
        addProduct(product){
            this.products.unshift(product);
            saveProducts(this.products);
        },
        updateProduct(id, updated){
            const index= this.products.findIndex(p=>pid === id);
            if(index !==-1){
                this.products[index]=updated;
                saveProducts(this.products);
            }
        },
        removeproduct(id){
            this.products=this.products.filter(p=>p.id !==id);
            saveProducts(this.products);
        },
        clearproducts(){
            this.products=[];
            saveProducts(this.products);
        },
   },
});