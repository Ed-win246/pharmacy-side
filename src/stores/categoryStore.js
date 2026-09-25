import { defineStore } from "pinia";

const CATEGORY_STORAGE_KEY='pharmacy-categories';

function loadCategories(){
    try{
        return JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY) || '[]');
    }catch(error){
        console.error('Failed to load product categories',error);
        return [];
    }
}

function saveCategories(categories){
    localStorage.setItem(CATEGORY_STORAGE_KEY,JSON.stringify(categories));
}

export const useCategoryStore=defineStore('categories',{
   state:()=>({
    categories:loadCategories(),
   }), 
   actions:{
        setCategories(categories){
            this.categories=categories;
            saveCategories(this.categories);
        },
        addCategory(category){
            this.categories.unshift(category);
            saveCategories(this.categories);
        },
        updateCategory(id, updatedCategory){
            const index=this.categories.findIndex(c=>c.id === id);
            if(index !==-1){
                this.categories[index]=updatedCategory;
                saveCategories(this.categories);
            }
        },
        removeCategory(id){
            this.categories=this.categories.filter(c=>c.id !==id);
            saveCategories(this.categories);
        },
        clearCategories(){
            this.categories=[];
            saveCategories(this.categories);
        },
   },
});