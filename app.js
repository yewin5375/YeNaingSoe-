const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- ၁။ စာမျက်နှာ ကူးပြောင်းခြင်းနှင့် အခြေအနေမှတ်သားခြင်း ---
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('visible');
    
    document.getElementById('page-title').innerText = pageId.replace('-', ' ').toUpperCase();
    
    // Sidebar ပိတ်ရန်
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb && !sb.classList.contains('closed')) {
        sb.classList.add('closed');
        ov.classList.add('hidden');
    }

    // Refresh လုပ်ရင် လက်ရှိစာမျက်နှာမှာပဲ ရှိနေဖို့
    localStorage.setItem('lastPage', pageId);

    // Page အလိုက် Data ဆွဲထုတ်ရန်
    if (pageId === 'dashboard') calcDashboard();
    if (pageId === 'menu') renderMenuList();
    if (pageId === 'customers') renderCustomerList();
    if (pageId === 'orders') {
        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-status') || 'new';
        renderOrderCards(activeTab);
    }
}

// --- ၂။ အော်ဒါစီမံခန့်ခွဲမှု (Order Logic) ---
async function setOrderStatusTab(status) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-status') === status) tab.classList.add('active');
        else tab.classList.remove('active');
    });
    await renderOrderCards(status);
}

async function renderOrderCards(status) {
    const container = document.getElementById("order-cards");
    if (!container) return;
    container.innerHTML = `<div class="text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div></div>`;

    const { data: orders, error } = await _supabase
        .from('orders')
        .select('*, order_items (*, menus (*))')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error || !orders) {
        container.innerHTML = "<p class='text-center py-10 text-slate-400'>Error loading data.</p>";
        return;
    }

    container.innerHTML = orders.map(o => {
        const itemsHtml = o.order_items.map(i => `
            <div class="flex justify-between text-[11px] border-b border-dashed py-1">
                <span>${i.menus?.name || 'Deleted Item'} (x${i.quantity})</span>
                <span>${((i.menus?.price || 0) * i.quantity).toLocaleString()} Ks</span>
            </div>
        `).join('');

        return `
        <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-3">
            <div class="flex justify-between items-start" onclick="viewCustomerDetail('${o.customer_phone}')">
                <div><h4 class="font-bold text-lg">${o.customer_name}</h4><p class="text-xs text-slate-400">📞 ${o.customer_phone}</p></div>
                <div class="text-right font-black text-orange-500">${o.total_amount.toLocaleString()} Ks</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-2xl">${itemsHtml}</div>
            <div class="flex gap-2">
                ${status === 'new' ? `<button onclick="updateStatus('${o.id}', 'pending')" class="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl text-xs">Accept</button>` : ''}
                ${status === 'pending' ? `<button onclick="updateStatus('${o.id}', 'finished')" class="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl text-xs">Finish</button>` : ''}
                <button onclick="downloadVoucher('${o.id}')" class="bg-slate-100 p-3 rounded-xl"><i data-lucide="printer" class="w-4 h-4"></i></button>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

async function updateStatus(id, nextStatus) {
    await _supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-status');
    renderOrderCards(activeTab);
    calcDashboard();
}

// --- ၃။ Dashboard & Stats ---
async function calcDashboard() {
    const { data: orders } = await _supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!orders) return;
    document.getElementById('total-orders').innerText = orders.length;
    document.getElementById('total-revenue').innerText = orders.reduce((s, o) => s + o.total_amount, 0).toLocaleString() + " Ks";
    
    const recentUl = document.getElementById('dash-recent-orders');
    recentUl.innerHTML = orders.slice(0, 5).map(o => `
        <li onclick="viewCustomerDetail('${o.customer_phone}')" class="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border mb-2">
            <span class="font-bold">${o.customer_name}</span>
            <span class="text-orange-500 font-black">${o.total_amount.toLocaleString()} Ks</span>
        </li>`).join('');
    checkStockAlerts();
}

// --- ၄။ Menu Management ---
async function renderMenuList() {
    const { data: menus } = await _supabase.from('menus').select('*').order('name');
    const container = document.getElementById('menu-list');
    container.innerHTML = menus.map(m => `
        <div class="bg-white p-4 rounded-3xl border flex gap-4 items-center">
            <img src="${m.image_url || 'https://via.placeholder.com/80'}" class="w-16 h-16 rounded-2xl object-cover">
            <div class="flex-1">
                <h4 class="font-bold text-sm">${m.name}</h4>
                <p class="text-orange-500 font-bold text-xs">${m.price} Ks</p>
                <p class="text-[10px] text-slate-400">Stock: ${m.stock}</p>
            </div>
            <button onclick="editMenu('${m.id}', '${m.name}', ${m.price}, ${m.stock}, '${m.image_url}')" class="p-2 bg-blue-50 text-blue-500 rounded-lg"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
            <button onclick="deleteMenu('${m.id}')" class="p-2 bg-red-50 text-red-500 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`).join('');
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
    if (confirm('Delete?')) {
        await _supabase.from('menus').delete().eq('id', id);
        renderMenuList();
    }
}

// --- ၅။ Customer Profile & History ---
async function renderCustomerList() {
    const { data: orders } = await _supabase.from('orders').select('customer_name, customer_phone');
    const listUl = document.getElementById("customer-list-items");
    const uniqueCust = Array.from(new Set(orders.map(o => o.customer_phone)))
        .map(phone => orders.find(o => o.customer_phone === phone));

    listUl.innerHTML = uniqueCust.map(c => `
        <li onclick="viewCustomerDetail('${c.customer_phone}')" class="py-3 px-2 flex justify-between border-b active:bg-slate-100">
            <span class="font-bold text-sm">${c.customer_name}</span>
            <span class="text-[10px] text-slate-400">${c.customer_phone}</span>
        </li>`).join('');
}

async function viewCustomerDetail(phone) {
    switchPage('customers');
    const detailBox = document.getElementById("customer-detail-section");
    detailBox.classList.remove("hidden");
    
    const { data: orders } = await _supabase.from('orders').select('*, order_items(*, menus(*))').eq('customer_phone', phone).order('created_at', { ascending: false });
    
    document.getElementById("customer-profile-info").innerHTML = `<h3 class="font-bold">${orders[0].customer_name}</h3><p class="text-xs text-slate-400">${phone}</p>`;
    document.getElementById("cust-total-amount").innerText = orders.reduce((s, o) => s + o.total_amount, 0).toLocaleString() + " Ks";
    document.getElementById("cust-total-orders").innerText = orders.length;

    document.getElementById("customer-order-history").innerHTML = orders.map(o => `
        <div class="bg-slate-50 p-3 rounded-2xl mb-2 border text-[11px]">
            <div class="flex justify-between font-bold text-orange-600"><span>#${o.id.slice(0,5)}</span><span>${o.total_amount.toLocaleString()} Ks</span></div>
            <div class="text-slate-500">${o.order_items.map(i => i.menus?.name).join(', ')}</div>
        </div>`).join('');
}

// --- ၆။ အထွေထွေ (Notifications, Sound, Stock) ---
async function checkStockAlerts() {
    const { data: lowItems } = await _supabase.from('menus').select('name, stock').lt('stock', 5);
    const dot = document.getElementById("notif-dot");
    const list = document.getElementById("notif-list");
    if (lowItems?.length > 0) {
        dot.classList.remove("hidden");
        list.innerHTML = lowItems.map(m => `<div class="p-2 bg-red-50 text-red-600 rounded mb-1 text-[10px]">⚠️ Low Stock: ${m.name} (${m.stock})</div>`).join('');
    }
}

async function downloadVoucher(id) {
    const { data: o } = await _supabase.from('orders').select('*, order_items(*, menus(*))').eq('id', id).single();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
    doc.text("Minsa Grilled Chicken", 40, 10, { align: "center" });
    doc.text(`Total: ${o.total_amount} Ks`, 10, 30);
    window.open(doc.output('bloburl'), '_blank');
}

// --- INIT ---
window.onload = () => {
    const lastPage = localStorage.getItem('lastPage') || 'dashboard';
    switchPage(lastPage);
};

// Real-time listener
_supabase.channel('orders').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
    const sound = document.getElementById('order-sound');
    if (sound) sound.play().catch(() => {});
    calcDashboard();
    if(localStorage.getItem('lastPage') === 'orders') renderOrderCards('new');
}).subscribe();

