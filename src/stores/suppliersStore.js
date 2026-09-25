import { defineStore } from "pinia";

const SUPPLY_STORAGE_KEY='pharmacy-suppliers';

function loadSuppliers(){
    try{
        return JSON.parse(localStorage.getItem(SUPPLY_STORAGE_KEY) || '[]');
    }catch(error){
        console.error('Failed to load suppliers',error);
        return [];
    }
}

function saveSuppliers(suppliers){
    localStorage.setItem(SUPPLY_STORAGE_KEY,JSON.stringify(suppliers));
}

export const useSuppliersStore= defineStore('suppliers',{
   state:()=>({
        suppliers:loadSuppliers(),
   }),
   actions:{
        setSuppliers(suppliers){
            this.suppliers=suppliers;
            saveSuppliers(this.suppliers);
        },
        addSupplier(supplier){
            this.suppliers.unshift(supplier);
            saveSuppliers(this.suppliers);
        },
        updateSupplier(id,updatedSupplier){
            const index= this.suppliers.findIndex(s=>s.id === id);
            if(index !==-1){
                this.suppliers[index]=updatedSupplier;
                saveSuppliers(this.suppliers);
            }
        },
        removeSupplier(id){
            this.suppliers=this.suppliers.filter(s=>s.id !==id);
            saveSuppliers(this.suppliers);
        },
        clearSuppliers(){
            this.suppliers=[];
            saveSuppliers(this.suppliers);
        },
   } ,
});