const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentOrderTab = 'new';

// --- ၁။ စာမျက်နှာ ထိန်းချုပ်မှု ---
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('visible');
    
    document.getElementById('page-title').innerText = pageId.replace('-', ' ').toUpperCase();
    localStorage.setItem('lastPage', pageId);

    if (pageId === 'dashboard') calcDashboard();
    if (pageId === 'menu') renderMenuList();
    if (pageId === 'customers') renderCustomerList();
    if (pageId === 'orders') renderOrders(currentOrderTab);
}

// --- ၂။ IMAGE UPLOAD LOGIC ---
async function uploadImage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await _supabase.storage
        .from('menu-images')
        .upload(fileName, file);
    if (error) return null;
    const { data: publicUrl } = _supabase.storage.from('menu-images').getPublicUrl(fileName);
    return publicUrl.publicUrl;
}

// --- ၃။ MENU MANAGEMENT ---
document.getElementById('menu-form').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    const id = document.getElementById('menu-id').value;
    const file = document.getElementById('menu-image-file').files[0];
    let imageUrl = document.getElementById('menu-image-url').value;

    if (file) {
        const uploadedUrl = await uploadImage(file);
        if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const menuData = {
        name: document.getElementById('menu-name').value,
        price: Number(document.getElementById('menu-price').value),
        stock: Number(document.getElementById('menu-stock').value),
        image_url: imageUrl
    };

    let error;
    if (id) {
        const res = await _supabase.from('menus').update(menuData).eq('id', id);
        error = res.error;
    } else {
        const res = await _supabase.from('menus').insert([menuData]);
        error = res.error;
    }

    submitBtn.disabled = false;
    submitBtn.innerText = "သိမ်းဆည်းမည်";

    if (!error) {
        alert("အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ");
        resetMenuForm();
        switchPage('menu');
    } else {
        alert("Error: " + error.message);
    }
};

async function renderMenuList() {
    const { data: menus } = await _supabase.from('menus').select('*').order('name');
    const container = document.getElementById('menu-list');
    container.innerHTML = menus.map(m => `
        <div class="bg-white p-4 rounded-3xl border flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow">
            <img src="${m.image_url || 'https://via.placeholder.com/80'}" class="w-20 h-20 rounded-2xl object-cover bg-slate-100 shadow-inner">
            <div class="flex-1">
                <h4 class="font-bold text-slate-700">${m.name}</h4>
                <p class="text-orange-500 font-bold text-sm">${m.price.toLocaleString()} Ks</p>
                <p class="text-[10px] text-slate-400">Stock: ${m.stock}</p>
            </div>
            <div class="flex flex-col gap-2">
                <button onclick="editMenu('${m.id}', '${m.name.replace(/'/g, "\\'")}', ${m.price}, ${m.stock}, '${m.image_url}')" class="p-2 bg-blue-50 text-blue-500 rounded-lg"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="deleteMenu('${m.id}')" class="p-2 bg-red-50 text-red-500 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function editMenu(id, name, price, stock, url) {
    document.getElementById('menu-id').value = id;
    document.getElementById('menu-name').value = name;
    document.getElementById('menu-price').value = price;
    document.getElementById('menu-stock').value = stock;
    document.getElementById('menu-image-url').value = url;
    document.getElementById('form-title').innerText = "Edit Menu Item";
    switchPage('add-menu');
}

async function deleteMenu(id) {
    if (confirm('ဒီဟင်းပွဲကို ဖျက်မှာ သေချာပါသလား?')) {
        const { error } = await _supabase.from('menus').delete().eq('id', id);
        if(!error) renderMenuList();
    }
}

// --- ၄။ ORDER MANAGEMENT ---
function setOrderStatusTab(status) {
    currentOrderTab = status;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.dataset.status === status) btn.classList.add('active');
    });
    renderOrders(status);
}

async function renderOrders(status) {
    const { data: orders, error } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('status', status)
        .order('created_at', { ascending: false });

    const container = document.getElementById('order-cards');
    if (error || !orders.length) {
        container.innerHTML = `<div class="text-center py-10 text-slate-400">အော်ဒါမရှိသေးပါ (${status})</div>`;
        return;
    }

    container.innerHTML = orders.map(o => `
        <div class="bg-white p-5 rounded-3xl border shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <div onclick="viewCustomerDetail('${o.customer_phone}')" class="cursor-pointer">
                    <h4 class="font-bold text-slate-800 flex items-center gap-1">${o.customer_name} <i data-lucide="external-link" class="w-3 h-3 text-blue-400"></i></h4>
                    <p class="text-xs text-slate-500">${new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-600 uppercase">${status}</span>
                </div>
            </div>
            
            <div class="space-y-2 border-y border-dashed py-3 my-3">
                ${o.order_items.map(i => `
                    <div class="flex justify-between text-sm">
                        <span class="text-slate-600">${i.menus?.name} <span class="text-xs text-slate-400">x${i.quantity}</span></span>
                        <span class="font-bold">${(i.price_at_time * i.quantity).toLocaleString()} Ks</span>
                    </div>
                `).join('')}
            </div>

            <div class="flex justify-between items-center mb-4">
                <span class="text-sm font-bold text-slate-400">Total Amount</span>
                <span class="text-lg font-black text-orange-600">${o.total_amount.toLocaleString()} Ks</span>
            </div>

            <div class="flex gap-2">
                ${status === 'new' ? `
                    <button onclick="updateOrderStatus('${o.id}', 'pending')" class="flex-1 bg-blue-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-100">Accept</button>
                ` : status === 'pending' ? `
                    <button onclick="updateOrderStatus('${o.id}', 'finished')" class="flex-1 bg-green-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-green-100">Complete</button>
                ` : ''}
                <button onclick="downloadVoucher('${o.id}')" class="p-3 bg-slate-100 text-slate-600 rounded-2xl"><i data-lucide="printer"></i></button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

async function updateOrderStatus(id, newStatus) {
    const { error } = await _supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (!error) {
        renderOrders(currentOrderTab);
        calcDashboard();
    }
}

// --- ၅။ CUSTOMER LIST & PROFILE ---
async function renderCustomerList() {
    const { data: orders } = await _supabase.from('orders').select('customer_name, customer_phone');
    if(!orders) return;

    // Unique customers
    const customers = [];
    const map = new Map();
    for (const item of orders) {
        if(!map.has(item.customer_phone)){
            map.set(item.customer_phone, true);
            customers.push(item);
        }
    }

    const container = document.getElementById('customer-list-items');
    container.innerHTML = customers.map(c => `
        <li onclick="viewCustomerDetail('${c.customer_phone}')" class="p-4 hover:bg-orange-50 cursor-pointer flex justify-between items-center transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold">${c.customer_name[0]}</div>
                <div>
                    <p class="font-bold text-sm text-slate-700">${c.customer_name}</p>
                    <p class="text-xs text-slate-400">${c.customer_phone}</p>
                </div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i>
        </li>
    `).join('');
    lucide.createIcons();
}

async function viewCustomerDetail(phone) {
    switchPage('customers');
    const detailBox = document.getElementById("customer-detail-section");
    detailBox.classList.remove("hidden");
    
    const { data: orders } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false });
    
    if(!orders || orders.length === 0) return;

    document.getElementById("customer-profile-info").innerHTML = `
        <div class="flex items-center gap-4 mb-4">
            <div class="w-16 h-16 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-orange-100">
                ${orders[0].customer_name[0]}
            </div>
            <div>
                <h3 class="font-black text-xl text-slate-800">${orders[0].customer_name}</h3>
                <a href="tel:${phone}" class="text-sm text-blue-500 flex items-center gap-1 font-bold">
                    <i data-lucide="phone" class="w-3 h-3"></i> ${phone}
                </a>
            </div>
        </div>
    `;

    const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0);
    document.getElementById("cust-total-amount").innerText = totalRevenue.toLocaleString() + " Ks";
    document.getElementById("cust-total-orders").innerText = orders.length;

    document.getElementById("customer-order-history").innerHTML = `
        <p class="font-bold text-xs text-slate-400 uppercase mb-3">Order History</p>
        ${orders.map(o => `
            <div class="bg-slate-50 p-4 rounded-2xl border border-white shadow-sm mb-3">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">${new Date(o.created_at).toLocaleDateString()} | ${new Date(o.created_at).toLocaleTimeString()}</p>
                        <p class="text-xs font-bold text-slate-600">${o.order_items.map(i => i.menus?.name).join(', ')}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-black text-orange-600">${o.total_amount.toLocaleString()} Ks</p>
                    </div>
                </div>
                <button onclick="downloadVoucher('${o.id}')" class="w-full mt-2 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-100 flex items-center justify-center gap-2">
                    <i data-lucide="printer" class="w-3 h-3"></i> View & Print Voucher
                </button>
            </div>
        `).join('')}
    `;
    lucide.createIcons();
    // Scroll to detail
    detailBox.scrollIntoView({ behavior: 'smooth' });
}

// --- ၆။ VOUCHER PRINT ---
async function downloadVoucher(id) {
    const { data: o } = await _supabase.from('orders').select('*, order_items(*, menus(*))').eq('id', id).single();
    if (!o) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });

    doc.setFontSize(14);
    doc.text("မြင်သာကြက်ကင်", 40, 10, { align: "center" });
    doc.setFontSize(8);
    doc.text(`ID: #${o.id.slice(0, 8)}`, 10, 20);
    doc.text(`Date: ${new Date(o.created_at).toLocaleString()}`, 10, 24);
    doc.text(`Customer: ${o.customer_name} (${o.customer_phone})`, 10, 28);
    doc.text("------------------------------------------", 10, 32);

    let y = 38;
    o.order_items.forEach(i => {
        doc.text(`${i.menus?.name || 'Item'}`, 10, y);
        doc.text(`x${i.quantity}`, 45, y);
        doc.text(`${(i.price_at_time * i.quantity).toLocaleString()} Ks`, 70, y, { align: "right" });
        y += 6;
    });

    doc.text("------------------------------------------", 10, y);
    doc.setFontSize(10);
    doc.text(`Total: ${o.total_amount.toLocaleString()} Ks`, 70, y + 8, { align: "right" });
    doc.setFontSize(8);
    doc.text("Thank You!", 40, y + 16, { align: "center" });
    
    window.open(doc.output('bloburl'), '_blank');
}

// --- ၇။ DASHBOARD & REAL-TIME ---
async function calcDashboard() {
    const { data: orders } = await _supabase.from('orders').select('*');
    if(!orders) return;
    document.getElementById('total-orders').innerText = orders.length;
    document.getElementById('total-revenue').innerText = orders.reduce((s,o) => s + o.total_amount, 0).toLocaleString() + " Ks";
    
    const { data: recent } = await _supabase.from('orders').select('*').order('created_at', {ascending: false}).limit(5);
    document.getElementById('dash-recent-orders').innerHTML = recent.map(o => `
        <li onclick="viewCustomerDetail('${o.customer_phone}')" class="flex justify-between items-center bg-white p-3 rounded-2xl border mb-2 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
            <span class="font-bold text-xs">${o.customer_name}</span>
            <span class="text-orange-500 font-black text-xs">${o.total_amount.toLocaleString()} Ks</span>
        </li>`).join('');
}

// Phone Notification Helper
function showPhoneNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body, icon: 'https://via.placeholder.com/100' });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

function playSound() {
    const audio = document.getElementById('order-sound');
    audio.play().catch(e => console.log("Sound error:", e));
}

// Listen for New Orders
_supabase.channel('custom-insert-channel')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
    playSound();
    showPhoneNotification("New Order!", `${payload.new.customer_name} ထံမှ အော်ဒါအသစ် ရောက်ရှိလာပါသည်`);
    addNotification(`${payload.new.customer_name} ထံမှ အော်ဒါအသစ် ရောက်ရှိလာပါသည်`, 'order');
    if(currentOrderTab === 'new') renderOrders('new');
    calcDashboard();
  })
  .subscribe();

// Notification Permission Request
if (Notification.permission === 'default') Notification.requestPermission();

// INIT
window.onload = () => {
    const lastPage = localStorage.getItem('lastPage') || 'dashboard';
    switchPage(lastPage);
};
        
