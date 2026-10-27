<script setup>
import {ref, reactive, onMounted,computed} from 'vue'
import { Plus, Printer, Trash2, X , EllipsisVertical, Eye, SquarePen,PackageCheck} from 'lucide-vue-next';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { storeToRefs } from 'pinia';

const store = usePurchaseStore();
const { paymentOptions } = storeToRefs(store);
const loggedUser = ref(null)
const showOrderModal = ref(false);//purchase order form
const showReceiptModal = ref(false);
const loadingReceipt = ref(false);
const selectedOrder = ref(null);
const loading = ref(false);
const savingOrder = ref(false);

try {
  loggedUser.value = JSON.parse(localStorage.getItem('user') || 'null')
} catch {
  loggedUser.value = null
}

//loads lists from the server, good for suppliers, units, medicines, payment options
async function loadList(url, target, label){
    try{
        const {data} = await api.get(url);
        target.value = Array.isArray(data) ? data: (data?.data ?? []);
    }catch(error){
        console.error(`Failed to load ${label},`,error);
        toast.error(`Failed to load ${label}`);
    }
}

//purchase order data
const suppliers = ref([])
const medicines = ref([])
const units = ref([])
const purchaseOrders = ref([])


onMounted(()=>{
    void store.fetchPaymentOptions();//payment options for the dropdowns
    void loadList('/suppliers',suppliers,'suppliers');
    void loadList('/medicines',medicines,'products')
    void loadList('/units',units,'units');
    void fetchPurchaseOrders();
})

const orderForm = reactive({
    supplier:'',
    payment_option:'',
    expectedDate:'',
})
//product line
const orderLine = ref([])
let lineId = 0;
// the product line having these feilds
function blankLine(){
    return {
        id:++lineId,
        medicine_name:'',
        unit_name:'',
        quantity:'',
        unit_cost:'',
        total:'',
    }
}
// sorted med in alphabetical order
const sortedMedicines = computed(()=>
[...medicines.value].sort((a,b)=>String(a.name).localeCompare(String(b.name)))
);

//smallest unit
const getUnitName = (med) => med?.unit_name || med?.unit?.unit_name || med?.unit?.name || '';

//smallest unit and the registered units
function UnitsOfMedicines(med){
    const names = [getUnitName(med)];

    (med.unit_details || []).forEach((row)=>{
        const unitId = row.unit_id ?? row.unit?.id;
        const unit = units.value.find((u)=>Number(u.id) === Number(unitId));
        if(unit) names.push(unit.unit_name);
    })

    return [...new Set(names.filter(Boolean))];
}
//products and the registered units
function unitOptionsFor(line){
    const med = medicines.value.find((m)=>m.name === line.medicine_name)
    return med? UnitsOfMedicines(med):[];
}
//on selecting  a new product and the old units nolonger applies, then select the new unit
function onMedicineChange(line){
    const options = unitOptionsFor(line);

    line.unit_name = options.length ==1 ? options[0]:'';
}
function addLine(){
    orderLine.value.push(blankLine());
}

function removeLine(index){
    if(orderLine.value.length === 1){
        orderLine.value[0] = blankLine();
        return;
    }
    orderLine.value.splice(index,1);
}

function openOrderModal(){
    editingId.value = null;// the new purchase modal doesnt open in editing mode
    orderForm.supplier = '';
    orderForm.payment_option = '';
    orderForm.expectedDate = '';
    orderLine.value = [blankLine()];
    showOrderModal.value = true;
}

function closeOrderModal(){
    if(savingOrder.value) return;
    showOrderModal.value = false;
    editingId.value = null;//so that the modal closes
}

function validateOrder(){
    if(!orderForm.supplier) return 'Select a supplier';

    const seen = new Set();
    if (!isEditing.value && orderForm.expectedDate && orderForm.expectedDate < todayLocal()) {//doont edit old dates
        return 'Expected date cannot be before today';
    }

    for(let i =0;i<orderLine.value.length;i++){
        const line = orderLine.value[i];
        const label = `Item ${i+1}`;
        const quantity = Number(line.quantity);


        if(!line.medicine_name) return `${label}: choose a product`;
        if(!unitOptionsFor(line).includes(line.unit_name)) return `${label}:choose a registered product`;
        if(line.quantity === '' || line.quantity === null || !Number.isInteger(quantity)||quantity<1){
            return `${label}:quantity must be greater than 1 or more`;
        }
        const unitCost = Number(line.unit_cost);
        if (line.unit_cost === '' || !Number.isFinite(unitCost) || unitCost < 0) {
            return `${label}: enter a unit cost of 0 or more`;
        }

        const key = `${line.medicine_name.toLowerCase()}|${line.unit_name.toLowerCase()}`;
        if(seen.has(key)) return `${line.medicine_name} ${line.unit_name} is already on this order`;
        seen.add(key);
    }
    return '';
}

async function saveOrder(){
    if (savingOrder.value) return;

    const problem = validateOrder();
    if(problem){
        toast.error(problem);
        return;
    }
    savingOrder.value = true;
    try{
        const items = orderLine.value.map((line) => ({
            medicine: line.medicine_name.trim(),
            medicine_name: line.medicine_name.trim(),
            unit_name: line.unit_name,
            quantity: Number(line.quantity),
            unit_cost: Number(line.unit_cost),
            total_price: Number(line.quantity) * Number(line.unit_cost),
        }));
        const payLoad =  {
            supplier: orderForm.supplier,
            medicine_name: items[0]?.medicine_name,
            payment_option: orderForm.payment_option || null,
            expected_date: orderForm.expectedDate || null,
            items,
        };

        const {data} = isEditing.value
        ? await api.put(`/purchase-orders/${editingId.value}`,payLoad) 
        :await api.post(`/purchase-orders`,payLoad);

    toast.success(data?.message || 'Purchase order placed successfully');
    showOrderModal.value = false;
    editingId.value = null;//dont call the editing modal
    await fetchPurchaseOrders();
    }catch(error){
        console.error('Failed to place purchase order',error);
        const validationErrors = Object.values(error.response?.data?.errors ?? {}).flat();
        toast.error(
            validationErrors[0] ||
            error.response?.data?.message ||
            'Failed to place purchase order'
        );
    }finally{
        savingOrder.value = false;
    }
}

async function fetchPurchaseOrders() {
    loading.value = true;
    try {
        const { data } = await api.get('/purchase-orders');
        purchaseOrders.value = Array.isArray(data) ? data : (data?.data ?? []);
    } catch (error) {
        console.error('Failed to load purchase orders', error);
        toast.error('Failed to load purchase orders');
    } finally {
        loading.value = false;
    }
}

const orderDate = (value) => (value ? new Date(value).toLocaleDateString() : '');
const expectedDate = (value)=>(value? new Date(value).toLocaleDateString():'');

const money = (value) => Number(value || 0).toLocaleString();
const pharmacyName = computed(() =>
    loggedUser.value?.pharmacy_name ||
    loggedUser.value?.pharmacy?.name ||
    loggedUser.value?.facility?.name ||
    'Pharmacy'
);

function itemsForOrder(order) {
    const items = order?.items ?? order?.order_items ?? order?.purchase_order_items ?? order?.lines;
    if (Array.isArray(items)) return items;
    return order?.medicine_name ? [order] : [];
}

function orderTotal(order) {
    return itemsForOrder(order).reduce((sum, item) => {
        const quantity = Number(item.quantity || 0);
        const unitCost = Number(item.unit_cost ?? item.price_per_unit ?? item.buying_price ?? 0);
        return sum + Number(item.total_price ?? item.total ?? quantity * unitCost);
    }, 0);
}

async function openReceipt(order) {
    selectedOrder.value = order;
    showReceiptModal.value = true;
    loadingReceipt.value = false;

    if (itemsForOrder(order).length || !order.id) return;

    loadingReceipt.value = true;
    try {
        const { data } = await api.get(`/purchase-orders/${order.id}`);
        selectedOrder.value = data?.data ?? data;
    } catch (error) {
        console.error('Failed to load purchase order details', error);
        toast.error(error.response?.data?.message || 'Failed to load purchase order details');
    } finally {
        loadingReceipt.value = false;
    }
}

function printReceipt() {
    window.print();
}

function todayLocal() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');

    return `${year}-${month}-${day}`;
}

function formatOrderDateTime(value){
    if(!value) return '-';

    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString(undefined,{
        dateStyle: 'medium',
        timeStyle:'short'
    })
}//edit, update , delete state
const editingId =  ref(null)
const isEditing = computed(()=>editingId.value !== null);
// Load the saved order values into the same form used to create an order.
async function openEditModal(order) {
    let orderDetails = order;
    if (!itemsForOrder(order).length && order.id) {
        try {
            const { data } = await api.get(`/purchase-orders/${order.id}`);
            orderDetails = data?.data ?? data;
        } catch (error) {
            console.error('Failed to load purchase order for editing', error);
            toast.error(error.response?.data?.message || 'Failed to load purchase order for editing');
            return;
        }
    }

    const orderItems = itemsForOrder(orderDetails);
    editingId.value = orderDetails.id ?? order.id;
    orderForm.supplier = orderDetails.supplier?.name ?? orderDetails.supplier_name ?? orderDetails.supplier ?? '';
    orderForm.payment_option = orderDetails.payment_option ?? '';
    orderForm.expectedDate = String(
        orderDetails.expectedDate ?? orderDetails.expected_date ?? orderDetails.expected_delivery_date ?? ''
    ).slice(0, 10);
    orderLine.value = orderItems.map((item) => {
        const medicine = item.medicine ?? item.product;
        const medicineName = item.medicine_name ??
            (typeof medicine === 'string' ? medicine : medicine?.name) ??
            item.name ??
            medicines.value.find((entry) => Number(entry.id) === Number(item.medicine_id ?? item.product_id))?.name ??
            '';
        const unit = item.unit;
        const unitName = item.unit_name ??
            (typeof unit === 'string' ? unit : unit?.unit_name ?? unit?.name) ??
            units.value.find((entry) => Number(entry.id) === Number(item.unit_id))?.unit_name ??
            '';

        return {
            id: ++lineId,
            medicine_name: medicineName,
            quantity: Number(item.quantity ?? 0),
            unit_name: unitName,
            unit_cost: Number(item.unit_cost ?? item.price_per_unit ?? item.buying_price ?? 0),
            total: '',
        };
    });
    if (!orderLine.value.length) orderLine.value = [blankLine()];
    showOrderModal.value = true;
}

const menu = reactive({ open: false, order: null, top: 0, left: 0 });
let menuTimer = null;

function openMenu(event, order){
    clearTimeout(menuTimer);
    const r = event.currentTarget.getBoundingClientRect();
    const menuHeight = 112;
    menu.order = order;
    menu.left = Math.max(8, r.right - 144);
    menu.top = r.bottom + menuHeight > window.innerHeight ? r.top - menuHeight - 4 : r.bottom + 4;
    menu.open = true;
}
function keepMenu(){ clearTimeout(menuTimer); }
function scheduleCloseMenu(){
    clearTimeout(menuTimer);
    menuTimer = setTimeout(() => { menu.open = false; }, 150);
}
function closeMenu(){ clearTimeout(menuTimer); menu.open = false; }

//delete logic
const showDeleteModal = ref(false);
const orderToDelete = ref(null);
const deleting = ref(false);

function askDelete(order){
    closeMenu();
    showDeleteModal.value = true;
    orderToDelete.value = order;
}

async function deleteItem(item){
    if(deleting.value) return;
    if(itemsForOrder(orderToDelete.value).length <= 1){
        toast.error('An order needs atleast one product..');
        return;
    }
   // if(!confirm(`Remove ${item.medicine_name} from this order`)) return;

   deleting.value = true;
   try{
    const orderId = orderToDelete.value.id;
    const {data} = await api.delete(`/purchase-orders/${orderId}/items/${item.id}`);
    toast.success(data?.message || 'Order product removed from the order list');
    await fetchPurchaseOrders();
    orderToDelete.value = purchaseOrders.value.find((o)=> o.id === orderId)??null;
    if(!orderToDelete.value ) showDeleteModal.value = false; 
   }catch(error){
    toast.error(error.response?.data?.message || 'Failed to remove order product');
   }finally{
    deleting.value = false;
   }
}//status logic 
const activeTab = ref('all')
const tabs = [
    {key:'all', label:'All'},
    {key:'pending',label:'Pending'},
    {key:'partial',label:'Partial'},
    {key:'completed',label:'Completed'},
]

const statusOf = (o)=>o.status ?? 'pending'

const filteredOrders = computed(() =>
    activeTab.value === 'all'
        ? purchaseOrders.value
        : purchaseOrders.value.filter((order) => statusOf(order) === activeTab.value)
)

const tabCount=(key)=>
    key === 'all'
    ?purchaseOrders.value.length
    :purchaseOrders.value.filter((o)=>statusOf(o) === key).length

function receivedSummary(order){
    const items = itemsForOrder(order);
    const ordered = items.reduce((s,i)=>s + Number(i.quantity || 0),0);
    const received = items.reduce((s,i)=>s + Number(i.quantity_received || 0),0);
    return `${received}/${ordered}`;
} 
//receive logic
const showReceieveModal = ref(false)
const receiving = ref(false)
const receiveOrder = ref(null)
const receiveLines = ref([])

const remainingOf = (l)=>l.ordered - l.received
function receiveBatchStorageKey(orderId, itemId) {
    return `purchase-order:${orderId}:item:${itemId}:batch-number`;
}

function rememberedReceiveBatch(orderId, itemId) {
    try {
        return localStorage.getItem(receiveBatchStorageKey(orderId, itemId)) || '';
    } catch (error) {
        console.error('Failed to retrieve saved batch number', error);
        toast.error('Could not retrieve the saved batch number');
        return '';
    }
}

function openReceiveModal(order){
    closeMenu();
    receiveOrder.value = order;
    receiveLines.value = itemsForOrder(order).map((i)=>({
        id:i.id,
        medicine_name:i.medicine_name,
        unit_name:i.unit_name,
        ordered:Number(i.quantity || 0),
        received:Number(i.quantity_received || 0),
        receive_now:0,
        batch_number:i.batch_number || rememberedReceiveBatch(order.id, i.id),
    }));
    showReceieveModal.value = true;
}


async function saveReceive(){
    if(receiving.value) return;

    for(const l of receiveLines.value){
        const n = Number(l.receive_now)
        if(!Number.isInteger(n) || n<0) return toast.error(`${l.medicine_name}:enter a whole number`)
        if(n>remainingOf(l)) return toast.error(`${l.medicine_name}:only${remainingOf(l)} left to receive`)
        if(n>0 && !String(l.batch_number).trim()) return toast.error(`${l.medicine_name}: enter a batch number`)
    }
    if(!receiveLines.value.some((l)=>Number(l.receive_now)>0)){
        return toast.error('Enter at least one recieved quantity for a product');
    }
    receiving.value = true;
    try{
        const {data} = await api.post(`purchase-orders/${receiveOrder.value.id}/receive`,{
            items:receiveLines.value
            .filter((l)=>Number(l.receive_now)>0)
            .map((l)=>({
                id:l.id,
                receive_now:Number(l.receive_now),
                batch_number:l.batch_number.trim(),
            })),
        });
        try {
            receiveLines.value
                .filter((l)=>Number(l.receive_now)>0)
                .forEach((l)=>localStorage.setItem(
                    receiveBatchStorageKey(receiveOrder.value.id, l.id),
                    l.batch_number.trim(),
                ));
        } catch (error) {
            console.error('Failed to remember received batch number', error);
            toast.error('Stock was received, but batch number couldnt be got');
        }
        toast.success(data?.message || 'Stock received successfully');
        showReceieveModal.value = false;
        await fetchPurchaseOrders();
        if(activeTab.value !== 'all' )activeTab.value = data?.data?.status??activeTab.value;
    }catch(error){
        const errors= Object.values(error.response?.data?.errors??{}).flat();
        toast.error(errors[0] || error.response?.data?.message || 'Failed to receive stock ');
    }finally{
        receiving.value = false;
    }
}    
</script>
<template>
    <div class="min-h-screen w-full">
        <div class="h-full flex flex-col pb-5 p-2">
            <div class="flex items-center justify-between  px-2 py-1">
                <div>
                    <h2 class="font-medium text-sm uppercase flex items-center gap-2">Purchase Orders</h2>
                </div>
                <div >
                    <h2 class="font-medium text-sm">
                        <router-link to="/dashboard" class="font-medium">Dashboard</router-link>
                        <span class="text-gray-400">/ Purchase Orders</span>
                    </h2>
                </div>
            </div>
            <div class="flex flex-wrap items-center justify-end pt-2 px-4">
                <button @click="openOrderModal"
                type="button"
                class="rounded-sm border bg-green-600 px-3 py-1.5 text-xs font-medium transition cursor-pointer flex items-center justify-center text-white">
                <Plus class="w-4 h-4 shrink-0 "/>New Purchase Order
                </button>
            </div>
            
            <div class="flex gap-2 px-4 mt-4">
                <button v-for="t in tabs" :key="t.key" 
                    type="button"  
                    @click="activeTab = t.key"
                    :class="activeTab === t.key
                    ?'bg-[#7393B3] text-black'
                    :'text-black text-gray-500 border border-gray-300'"
                    class="rounded-sm px-4 py-1.5 font-medium text-xs cursor-pointer">
                    {{ t.label }} ({{ tabCount(t.key) }})
                </button>
            </div>
            
            <div class="mt-2 bg-white shadow-sm rounded-sm overflow-x-auto mt-4">
                <table class="w-full text-left text-xs">
                    <thead class="tracking-wide border-b border-gray-200 text-black">
                        <tr>
                            <th class="px-4 py-3 font-medium">#</th>
                            <th class="px-4 py-3 font-medium">OrderID</th>
                            <th class="px-4 py-3 font-medium">Supplier</th>
                            <th class="px-4 py-3 font-medium">Product</th>
                            <th class="px-4 py-3 font-medium">Order date</th>
                            <th class="px-4 py-3 font-medium">Expected Date</th>
                            <th class="px-4 py-3 font-medium">Status</th>
                            <th class="px-4 py-3 font-medium">Received</th>
                            <th class="px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                        <tr v-if="loading">
                            <td class="px-4 py-12 text-center " colspan="7">
                                Loading purchase orders...
                            </td>
                        </tr>
                        <tr v-else-if="filteredOrders.length === 0">
                            <td class="px-4 py-12 text-center" colspan="7">
                                {{ activeTab === 'all' ? 'No purchases found..' : `No ${activeTab} orders found` }}
                            </td>
                        </tr>
                        <tr v-for="(p,index) in filteredOrders" :key="p.id ?? index">
                            <td class="px-4 py-3 font-medium">{{ index + 1 }}</td>
                            <td class="px-4 py-3 font-medium">{{ p.order_id ?? p.order_number ?? p.id ?? '—' }}</td>
                            <td class="px-4 py-3 font-medium">{{ p.supplier?.name ?? p.supplier ?? '—' }}</td>
                            <td class="px-4 py-3 font-medium">
                                <div v-if="itemsForOrder(p).length" class="flex flex-col gap-1">
                                    <span v-for="(item, itemIndex) in itemsForOrder(p)"
                                        :key="item.id ?? `${item.medicine_name ?? item.name}-${itemIndex}`">
                                        {{ item.medicine_name ?? item.product?.name ?? item.name ?? '—' }}
                                    </span>
                                </div>
                                <span v-else>{{ p.medicine_name ?? '—' }}</span>
                            </td>
                            <td class="px-4 py-3 font-medium">{{ orderDate(p.order_date ?? p.orderDate ?? p.created_at) }}</td>
                            <td class="px-4 py-3 font-medium">{{ expectedDate(p.expected_date ?? p.expectedDate) }}</td>
                            <td class="px-4 py-3">
                                <span class="rounded-sm px-2 py-0.5 text-xs font-medium capitalize"
                                    :class="{
                                        'bg-yellow-100 text-yellow-700': statusOf(p) === 'pending',
                                        'bg-blue-100 text-blue-700': statusOf(p) === 'partial',
                                        'bg-green-100 text-green-700': statusOf(p) === 'completed',
                                    }">
                                    {{ statusOf(p) }}
                                </span>
                            </td>
                            <!-- <td class="px-4 py-3 font-medium">{{ receivedSummary(p) }}</td> -->
                             <td class="px-4 py-3 font-medium">
                                <div v-if="itemsForOrder(p).length" class="flex flex-col gap-1">
                                    <span v-for="(item, itemIndex) in itemsForOrder(p)" :key="item.id ?? itemIndex">
                                    {{ Number(item.quantity_received ?? 0) }}/{{ Number(item.quantity ?? 0) }}
                                    {{ item.unit_name ?? item.unit?.unit_name ?? '' }}
                                    </span>
                                </div>
                                <span v-else>{{ receivedSummary(p) }}</span>
                            </td>
                            <td class="px-4 py-3">
                                <button type="button"
                                    @mouseenter="openMenu($event, p)"
                                    @mouseleave="scheduleCloseMenu"
                                    @click="openMenu($event, p)"
                                    class="rounded-sm bg-[#0b0b45] px-3 py-1.5 text-xs font-medium text-white hover:bg-opacity-90 cursor-pointer">
                                    <EllipsisVertical class="w-4 h-4"/>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="menu.open" 
                :style="{top: menu.top + 'px', left:menu.left  + 'px'}"
                @mouseenter="keepMenu" @mouseleave="scheduleCloseMenu"
                class="fixed  z-50 w-36 rounded-sm border border-gray-200 bg-white shadow-lg ">
                <button type="button" @click="openReceipt(menu.order); closeMenu()"
                class="flex w-full items-center px-3 py-1.5  gap-2 text-xs text-blue-600 cursor-pointer hover:bg-gray-100">
                <Eye class="w-4 h-4"/>View
                </button>
                <button type="button" v-if="statusOf(menu.order) !== 'completed'" @click="openReceiveModal(menu.order)"
                class="flex w-full items-center px-3 py-1.5  gap-2 text-xs text-green-600 cursor-pointer hover:bg-gray-100">
                <PackageCheck class="w-4 h-4"/> Adjust
               </button>
                <button type="button" @click="openEditModal(menu.order); closeMenu()"
                class="flex w-full items-center px-3 py-1.5  gap-2 text-xs text-green-600 cursor-pointer hover:bg-gray-100">
                <SquarePen class="w-4 h-4"/>Update
                </button>
                <button type="button" @click="askDelete(menu.order); closeMenu()"
                class="flex w-full items-center px-3 py-1.5  gap-2 text-xs text-red-600  cursor-pointer hover:bg-gray-100">
                <Trash2 class="w-4 h-4"/>Delete
                </button>
            </div>

            <!--delete modal-->
            <div v-if="showDeleteModal && orderToDelete" class="fixed inset-0 z-50 bg-black/50 backdrop-md flex items-center justify-center ">
                <div class="bg-white max-w-4xl shadow-sm  max-h-[80vh] rounded-sm w-full overflow-y-auto space-y-4 p-4">
                    <div class="flex items0center justify-between border-b border-gray-200 pb-3">
                        <h3 class="text-sm font-medium">
                            Delete Purchase Order   <span class="font-medium text-xs">{{ orderToDelete.order_number ?? orderToDelete.id }}</span>
                        </h3>
                        <button @click="showDeleteModal = false" class="text-gray-400 cursor-pointer">
                            <X class="w-4 h-4 "/>
                        </button>
                    </div>

                    <table class="text-left w-full text-sm">
                        <thead class="border-b border-gray-200 text-xs text-gray-600">
                            <tr>
                                <th class="px-4 py-3 font-medium">#</th>
                                <th class="px-4 py-3 font-medium">Product</th>
                                <th class="px-4 py-3 font-medium">Base Unit</th>
                                <th class="px-4 py-3 font-medium">Quantity</th>
                                <th class="px-4 py-3 font-medium">Unit Cost</th>
                                <th class="px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                            <tr v-for="(item, index) in itemsForOrder(orderToDelete)" :key="item.id">
                                <td class="px-4 py-3 font-medium">{{ index + 1 }}</td>
                                <td class="px-4 py-3 font-medium">{{ item.medicine_name }}</td>
                                <td class="px-4 py-3 font-medium">{{ item.unit_name }}</td>
                                <td class="px-4 py-3 font-medium">{{ item.quantity }}</td>
                                <td class="px-4 py-3 font-medium">{{ money(item.unit_cost) }}</td>
                                <td class="px-4 py-3">
                                    <button @click="deleteItem(item)" type="button" :disabled="deleting"
                                    class="bg-red-600 text-white px-3 py-1.5 rounded-sm flex items-center cursor-pointer">
                                    <Trash2 class="w-4 h-4"/></button> 
                                </td>
                            </tr>
                        </tbody>
                    </table>
                           <div class="flex items-center justify-end border-t border-gray-200">
                            <button @click="showDeleteModal = false" type="button"
                            class="bg-gray-600 text-white px-3 py-1.5 rounded-sm mt-2 text-sm cursor-pointer">Cancel
                            </button>
                        </div>
                </div>
            </div>

            <div v-if="showOrderModal" class="inset-0 fixed z-50 backdrop-md items-center justify-center flex bg-black/50">
                <div class="w-full max-w-6xl  bg-white shadow-sm overflow-y-auto space-y-4 p-4 rounded-sm">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h3 class="text-sm font-medium">
                            {{ isEditing ? 'Edit Purchase Order' : 'Create Purchase Order' }}
                        </h3>
                        <button @click="closeOrderModal" class="text-gray-500 cursor-pointer" type="button"
                            aria-label="Close purchase order">
                            <X class="w-4 h-4" />
                        </button>
                    </div>

                      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label for="po-supplier" class="block text-sm font-medium text-gray-700">Supplier</label>
                            <select id="po-supplier" v-model="orderForm.supplier"
                                class="mt-2 w-full rounded-md border border-gray-400 px-3 py-2 text-sm">
                                <option value="">Select option</option>
                                <option v-for="s in suppliers" :key="s.name" :value="s.name">{{ s.name }}</option>
                            </select>
                        </div>
                        <div>
                            <label for="po-payment" class="block text-sm font-medium text-gray-700">
                                Payment Option 
                            </label>
                            <select id="po-payment" v-model="orderForm.payment_option"
                                class="mt-2 w-full rounded-md border border-gray-400 px-3 py-2 text-sm">
                                <option value="">Select option</option>
                                <option v-for="opt in paymentOptions" :key="opt.name" :value="opt.name">{{ opt.name }}</option>
                            </select>
                        </div>
                        <div>
                            <label for="po-expected-date" class="block text-sm font-medium text-gray-700">Expected Date</label>
                            <input id="po-expected-date" v-model="orderForm.expectedDate" type="date" :min="todayLocal()"
                                class="mt-2 w-full rounded-md border border-gray-400 px-3 py-2 text-sm" />
                        </div>
                    </div>

                    
                    <div>
                        <h3 class="mb-2 text-sm font-medium text-gray-700">Products to order</h3>
                        <table class="w-full text-left text-sm">
                            <thead class="border-b border-gray-200 text-xs tracking-wide text-gray-600">
                                <tr>
                                    <th class="px-2 py-2 font-medium">#</th>
                                    <th class="px-2 py-2 font-medium">Product</th>
                                    <th class="px-2 py-2 font-medium">Base Unit</th>
                                    <th class="px-2 py-2 font-medium">Quantity</th>
                                    <th class="px-2 py-2 font-medium">Unit Cost</th>
                                    <th class="px-2 py-2 font-medium">Total</th>
                                    <th class="px-2 py-2 font-medium">Remove</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="(line, index) in orderLine" :key="line.id">
                                    <td class="px-2 py-2 text-xs font-medium">{{ index + 1 }}</td>
                                    <td class="px-2 py-2">
                                        <select v-model="line.medicine_name" @change="onMedicineChange(line)"
                                            class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs">
                                            <option value="" disabled>Select product</option>
                                            <option v-for="m in sortedMedicines" :key="m.id" :value="m.name">{{ m.name }}</option>
                                        </select>
                                    </td>
                                    <td class="px-2 py-2">
                                        <select v-model="line.unit_name" :disabled="!line.medicine_name"
                                            class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs disabled:bg-gray-100 disabled:text-gray-400">
                                            <option value="" disabled>{{ line.medicine_name ? 'Select unit' : 'Choose a product first' }}</option>
                                            <option v-for="u in unitOptionsFor(line)" :key="u" :value="u">{{ u }}</option>
                                        </select>
                                    </td>
                                    <td class="px-2 py-2">
                                        <input type="number" min="1" v-model.number="line.quantity" placeholder="0"
                                            class="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-xs" />
                                    </td>
                                       <td class="px-2 py-2">
                                        <input type="number" min="0" step="any" v-model.number="line.unit_cost" placeholder="0 Ush"
                                            class="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-xs" />
                                    </td>
                                       <td class="px-2 py-2">
                                        <span class="text-xs font-medium">
                                            {{ money(Number(line.quantity || 0) * Number(line.unit_cost || 0)) }}
                                        </span>
                                    </td>
                                    <td class="px-2 py-2">
                                        <button @click="removeLine(index)" type="button" aria-label="Remove this product"
                                            class="inline-flex cursor-pointer items-center rounded-sm bg-red-600 p-2 text-white hover:bg-red-700">
                                            <Trash2 class="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="flex items-center justify-center">
                            <button @click="addLine" type="button"
                                class="mt-3 flex cursor-pointer items-center gap-1.5 rounded-sm border border-green-600 px-3 py-1.5 text-xs font-medium text-green-700 justify-center">
                                <Plus class="h-3.5 w-3.5" /> Add another product
                            </button>
                          </div>
                    </div>

                    <div class="flex flex-col-reverse justify-end gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center">
                        <button @click="closeOrderModal" :disabled="savingOrder" type="button"
                            class="w-full rounded-sm bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 sm:w-auto">
                            Cancel
                        </button>
                        <button @click="saveOrder" :disabled="savingOrder" type="button"
                            class="flex w-full items-center justify-center gap-2 rounded-sm bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto">
                            {{ savingOrder ? 'Saving...': (isEditing?'Update Order' : 'Create Purchase Order') }}
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="showReceiptModal && selectedOrder"
                class="receipt-overlay no-print fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-md">
                <div class="receipt-print max-h-[80vh] w-full max-w-6xl overflow-y-auto rounded-sm bg-white p-6 shadow-xl">
                    <div class="receipt-no-print mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 class="text-sm font-semibold">Purchase Order Receipt</h3>
                        <button @click="showReceiptModal = false" type="button" aria-label="Close receipt"
                            class="cursor-pointer text-gray-500 hover:text-black">
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <header class="mb-6 border-b border-gray-300 pb-4 text-center">
                        <h1 class="text-xl font-bold uppercase">{{ pharmacyName }}</h1>
                        <p class="mt-1 text-sm font-semibold">PURCHASE ORDER</p>
                    </header>

                    <div v-if="loadingReceipt" class="py-8 text-center text-sm text-gray-500">
                        Loading order details...
                    </div>
                    <template v-else>
                        <div class="mb-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                            <div class="flex flex-col items-start gap-1">
                                    <p>
                                    <span class="font-semibold">Order date:</span>
                                    {{ formatOrderDateTime(selectedOrder.created_at ?? selectedOrder.order_date ?? selectedOrder.orderDate) }}
                                </p>
                                <p>
                                    <span class="font-semibold">Expected date:</span>
                                    {{ expectedDate(selectedOrder.expected_date ?? selectedOrder.expectedDate) || '—' }}
                                </p>
               
                            </div>
                            
                            <div class="flex flex-col items-start gap-2 sm:items-end">
                                  <p>
                                    <span class="font-semibold">Supplier:</span>
                                    {{ selectedOrder.supplier?.name ?? selectedOrder.supplier ?? '—' }}
                                </p>
                                <p>
                                    <span class="font-semibold">Order ID:</span>
                                    {{ selectedOrder.order_id ?? selectedOrder.order_number ?? selectedOrder.id ?? '—' }}
                                </p>
                            </div>
                      
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr class="border-y border-gray-300">
                                        <th class="px-2 py-2">#</th>
                                        <th class="px-2 py-2">Product</th>
                                        <th class="px-2 py-2">Quantity</th>
                                        <th class="px-2 py-2">Base Unit</th>
                                        <th class="px-2 py-2">Price/Unit</th>
                                        <th class="px-2 py-2">Total price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-if="itemsForOrder(selectedOrder).length === 0">
                                        <td colspan="6" class="px-2 py-6 text-center text-gray-500">
                                            No item details were returned for this order.
                                        </td>
                                    </tr>
                                    <tr v-for="(item, index) in itemsForOrder(selectedOrder)"
                                        :key="item.id ?? `${item.medicine_name}-${index}`"
                                        class="border-b border-gray-200">
                                        <td class="px-2 py-2">{{ index + 1 }}</td>
                                        <td class="px-2 py-2">
                                            {{ item.medicine_name ?? item.product?.name ?? item.name ?? '—' }}
                                        </td>
                                        <td class="px-2 py-2">{{ item.quantity ?? 0 }}</td>
                                        <td class="px-2 py-2">{{ item.unit_name ?? item.unit?.name ?? item.unit ?? '—' }}</td>
                                        <td class="px-2 py-2">
                                            {{ money(item.unit_cost ?? item.price_per_unit ?? item.buying_price ?? 0) }}
                                        </td>
                                        <td class="px-2 py-2">
                                            {{ money(item.total_price ?? item.total ?? (Number(item.quantity || 0) * Number(item.unit_cost ?? item.price_per_unit ?? item.buying_price ?? 0))) }}
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr class="font-semibold">
                                        <td colspan="5" class="px-2 py-3 text-right">Total</td>
                                        <td class="px-2 py-3">{{ money(orderTotal(selectedOrder)) }}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div class="receipt-no-print mt-6 flex justify-end gap-2 border-t border-gray-200 pt-4">
                            <button @click="showReceiptModal = false" type="button"
                                class="rounded-sm bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600">
                                Close
                            </button>
                            <button @click="printReceipt" type="button"
                                class="inline-flex items-center gap-2 rounded-sm bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
                                <Printer class="h-4 w-4" /> Print
                            </button>
                        </div>
                    </template>
                </div>
            </div>

            <!--receive modal-->
            <div v-if="showReceieveModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div class="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-sm bg-white p-4 shadow-lg">
                    <div class="mb-4 flex items-center justify-between border-b border-gray-300 pb-3">
                        <h3 class="text-xl font-medium">
                            Receive Stock For <span class="text-xs">{{ receiveOrder?.order_number ?? receiveOrder?.id ?? '' }}</span>
                        </h3>
                        <button type="button" @click="showReceieveModal = false" class="text-gray-400">
                            <X class="w-4 h-4" />
                        </button>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead class="border-b border-gray-200 text-xs">
                                <tr>
                                    <th class="px-4 py-3 font-medium">#</th>
                                    <th class="px-4 py-3 font-medium">Product</th>
                                    <th class="px-4 py-3 font-medium">Base Unit</th>
                                    <th class="px-4 py-3 font-medium">Ordered</th>
                                    <th class="px-4 py-3 font-medium">Received so far</th>
                                    <th class="px-4 py-3 font-medium">Remaining</th>
                                    <th class="px-4 py-3 font-medium">Receive Now</th>
                                    <th class="px-4 py-3 font-medium">Batch Number</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200">
                                <tr v-for="(l, index) in receiveLines" :key="l.id">
                                    <td class="px-4 py-3 font-medium">{{ index + 1 }}</td>
                                    <td class="px-4 py-3 font-medium">{{ l.medicine_name }}</td>
                                    <td class="px-4 py-3 font-medium">{{ l.unit_name }}</td>
                                    <td class="px-4 py-3 font-medium">{{ l.ordered }}</td>
                                    <td class="px-4 py-3 font-medium">{{ l.received }}</td>
                                    <td class="px-4 py-3 font-medium">{{ remainingOf(l) }}</td>
                                    <td class="px-4 py-3">
                                        <input
                                            v-model.number="l.receive_now"
                                            type="number"
                                            min="0"
                                            :max="remainingOf(l)"
                                            :disabled="remainingOf(l) === 0"
                                            class="w-24 rounded-sm border border-gray-200 px-4 py-1.5 text-xs"
                                        >
                                    </td>
                                    <td class="px-4 py-3">
                                        <input type="text"
                                        v-model="l.batch_number"
                                        class="w-24 rounded-sm border border-gray-200 px-4 py-1.5 text-xs">
                                    </td>
                                </tr>
                                <tr v-if="receiveLines.length === 0">
                                    <td colspan="7" class="px-4 py-6 text-center text-gray-500">No items to receive.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-4 flex justify-end gap-2 border-t border-gray-200 pt-4">
                        <button
                            @click="showReceieveModal = false"
                            type="button"
                            class="rounded-sm bg-gray-500 px-4 py-2 text-sm text-white cursor-pointer"
                        >Cancel</button>
                        <button
                            @click="saveReceive"
                            :disabled="receiving"
                            type="button"
                            class="rounded-sm bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50 cursor-pointer"
                        >
                            {{ receiving ? 'Saving...' : 'Receive' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
@media print {
    @page {
        margin: 14mm;
    }

    body * {
        visibility: hidden !important;
    }

    .receipt-overlay,
    .receipt-overlay * {
        visibility: visible !important;
    }

    .receipt-overlay {
        position: static !important;
        display: block !important;
        background: transparent !important;
        padding: 0 !important;
    }

    .receipt-print {
        position: absolute !important;
        inset: 0 auto auto 0 !important;
        width: 100% !important;
        max-width: none !important;
        max-height: none !important;
        overflow: visible !important;
        box-shadow: none !important;
    }

    .receipt-no-print {
        display: none !important;
    }
}
</style>