import { defineStore } from "pinia";

const UNIT_STORAGE_KEY='pharmacy-units';

function loadUnits(){
    try{
        return JSON.parse(localStorage.getItem(UNIT_STORAGE_KEY) || '[]');
    }catch(error){
        console.error('Failed to load product units',error);
        return [];
    }
}

function saveUnits(units){
    localStorage.setItem(UNIT_STORAGE_KEY,JSON.stringify(units));
}

export const useUnitStore=defineStore('units',{
    state:()=>({
        units:loadUnits(),
    }),
    actions:{
        setUnits(units){
            this.units=units;
            saveUnits(this.units);
        },
        addUnits(unit){
            this.units.unshift(unit);
            saveUnits(this.units);
        },
        updateUnit(id,updatedUnit){
            const index= this.units.findIndex(u=>u.id === id);
            if(index !==-1){
                this.units[index]=updatedUnit;
                saveUnits(this.units);
            }
        },
        removeUnit(id){
            this.units=this.units.filter(u=>u.id !==id);
            saveUnits(this.units);
        },
        clearUnits(){
            this.units=[];
            saveUnits(this.units);
        }
    },
});