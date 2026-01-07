const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- ဓါတ်ပုံတင်သည့်စနစ် (Upload Image) ---
async function uploadImage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await _supabase.storage
        .from('menu-images') // Supabase မှာ Bucket တစ်ခု အရင်ဆောက်ပေးဖို့လိုတယ်
        .upload(fileName, file);
    if (error) return null;
    const { data: publicUrl } = _supabase.storage.from('menu-images').getPublicUrl(fileName);
    return publicUrl.publicUrl;
}

// --- အော်ဒါအသစ်ဝင်ရင် အသံပေးရန် ---
function playOrderSound() {
    const sound = document.getElementById('order-sound');
    sound.play().catch(e => console.log("Sound error:", e));
}

// --- MENU FORM HANDLER ---
document.getElementById('menu-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('menu-id').value;
    const file = document.getElementById('menu-image-file').files[0];
    let imageUrl = document.getElementById('menu-image-url').value;

    if (file) {
        const uploadedUrl = await uploadImage(file);
        if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const data = {
        name: document.getElementById('menu-name').value,
        price: Number(document.getElementById('menu-price').value),
        stock: Number(document.getElementById('menu-stock').value),
        image_url: imageUrl
    };

    if (id) {
        await _supabase.from('menus').update(data).eq('id', id);
    } else {
        await _supabase.from('menus').insert([data]);
    }

    resetMenuForm();
    switchPage('menu');
};

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
    if (confirm('Delete this item?')) {
        await _supabase.from('menus').delete().eq('id', id);
        renderMenuList();
    }
}

function resetMenuForm() {
    document.getElementById('menu-form').reset();
    document.getElementById('menu-id').value = '';
}

// --- MENU RENDER ---
async function renderMenuList() {
    const { data: menus } = await _supabase.from('menus').select('*').order('name');
    const container = document.getElementById('menu-list');
    container.innerHTML = menus.map(m => `
        <div class="bg-white p-4 rounded-3xl border flex gap-4 items-center shadow-sm">
            <img src="${m.image_url || 'https://via.placeholder.com/80'}" class="w-20 h-20 rounded-2xl object-cover bg-slate-100 shadow-inner">
            <div class="flex-1">
                <h4 class="font-bold text-slate-700">${m.name}</h4>
                <p class="text-orange-500 font-bold text-sm">${m.price} Ks</p>
                <div class="flex items-center gap-1 mt-1">
                    <span class="w-1.5 h-1.5 rounded-full ${m.stock < 5 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}"></span>
                    <span class="text-[10px] text-slate-400">Stock: ${m.stock}</span>
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <button onclick="editMenu('${m.id}', '${m.name}', ${m.price}, ${m.stock}, '${m.image_url}')" class="p-2 bg-blue-50 text-blue-500 rounded-lg"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="deleteMenu('${m.id}')" class="p-2 bg-red-50 text-red-500 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- ORDER LISTENERS (Real-time) ---
_supabase.channel('orders')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
    playOrderSound();
    calcDashboard();
    renderOrderCards('new');
    document.getElementById('notif-dot').classList.remove('hidden');
    // Notification list update
    const nList = document.getElementById('notif-list');
    nList.innerHTML = `<div class="p-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold">🔔 New Order from ${payload.new.customer_name}!</div>` + nList.innerHTML;
  })
  .subscribe();

// --- DASHBOARD & CUSTOMERS --- (အရင်ကအတိုင်း Logic များပါဝင်သည်)
// (နေရာလွတ်သက်သာစေရန် အနှစ်ချုပ်ရေးပေးထားပါသည်)
async function calcDashboard() {
    const { data: orders } = await _supabase.from('orders').select('*').order('created_at', { ascending: false });
    if(!orders) return;
    document.getElementById('total-orders').innerText = orders.length;
    document.getElementById('total-revenue').innerText = orders.reduce((s,o) => s + o.total_amount, 0).toLocaleString() + " Ks";
    const recentUl = document.getElementById('dash-recent-orders');
    recentUl.innerHTML = orders.slice(0,5).map(o => `
        <li onclick="viewCustomerDetail('${o.customer_phone}')" class="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
            <span class="font-bold">${o.customer_name}</span>
            <span class="text-orange-500 font-black">${o.total_amount} Ks</span>
        </li>
    `).join('');
    checkStockAlerts();
}

// (renderOrderCards, renderCustomerList, viewCustomerDetail, checkStockAlerts တို့ကို အရင် code အတိုင်း ဆက်လက်အသုံးပြုနိုင်သည်)


// --- ORDERS & DEEP LINK ---
// --- ORDER TAB SYSTEM ---
async function setOrderStatusTab(status) {
    // ၁။ Tab ခလုတ်များ၏ အရောင်ကို ပြောင်းလဲခြင်း
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-status') === status) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // ၂။ သက်ဆိုင်ရာ အော်ဒါကတ်များကို ဆွဲထုတ်ပြသခြင်း
    await renderOrderCards(status);
}

// အော်ဒါကတ်များ ဆွဲထုတ်သည့် Function (နာမည်ကို သေချာအောင် ပြန်စစ်ပါ)
async function renderOrderCards(status) {
    const container = document.getElementById("order-cards");
    container.innerHTML = `<div class="text-center py-10">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        <p class="text-xs text-slate-400 mt-2">Loading orders...</p>
    </div>`;

    const { data: orders, error } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<p class="text-center text-red-500 py-10">Error loading orders</p>`;
        return;
    }

    if (!orders || orders.length === 0) {
        container.innerHTML = `<div class="text-center py-20 text-slate-300 italic">
            <i data-lucide="package-open" class="mx-auto w-12 h-12 mb-2"></i>
            <p>အော်ဒါမရှိသေးပါ</p>
        </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = orders.map(o => `
        <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-3">
            <div class="flex justify-between items-start" onclick="viewCustomerDetail('${o.customer_phone}')">
                <div>
                    <h4 class="font-bold text-lg">${o.customer_name}</h4>
                    <p class="text-xs text-slate-400">📞 ${o.customer_phone}</p>
                </div>
                <div class="text-right font-black text-orange-500">${o.total_amount} Ks</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-600 border border-slate-100">
                ${o.order_items.map(i => `• ${i.menus?.name} (x${i.quantity})`).join('<br>')}
            </div>
            <div class="flex gap-2">
                ${status === 'new' ? `<button onclick="updateStatus('${o.id}', 'pending')" class="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition shadow-lg shadow-orange-100">Accept Order</button>` : ''}
                ${status === 'pending' ? `<button onclick="updateStatus('${o.id}', 'finished')" class="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition shadow-lg shadow-green-100">Finish Order</button>` : ''}
                ${status === 'finished' ? `<div class="w-full text-center py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-bold uppercase">Completed Order</div>` : ''}
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
}

// Status ပြောင်းလဲသည့် Function
async function updateStatus(id, nextStatus) {
    const { error } = await _supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    if (!error) {
        // အောင်မြင်ရင် လက်ရှိ Tab ကို Refresh လုပ်မယ်
        const currentTab = document.querySelector('.tab-btn.active').getAttribute('data-status');
        renderOrderCards(currentTab);
        calcDashboard(); // Dashboard က အရေအတွက်တွေကိုပါ update လုပ်မယ်
    }
}


// --- MENU & STOCK ---
async function renderMenuList() {
    const { data: menus } = await _supabase.from('menus').select('*').order('name');
    const container = document.getElementById("menu-list");
    container.innerHTML = menus.map(m => `
        <div class="bg-white p-4 rounded-3xl border flex gap-4 items-center">
            <img src="${m.image_url || 'https://via.placeholder.com/60'}" class="w-16 h-16 rounded-2xl object-cover bg-slate-100 shadow-inner">
            <div class="flex-1">
                <h4 class="font-bold text-sm text-slate-700">${m.name}</h4>
                <p class="text-orange-500 font-bold text-xs">${m.price} Ks</p>
                <div class="flex items-center gap-1 mt-1">
                    <span class="w-1.5 h-1.5 rounded-full ${m.stock < 5 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}"></span>
                    <span class="text-[10px] text-slate-400">Stock: ${m.stock}</span>
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <button onclick="editMenu('${m.id}', '${m.name}', ${m.price}, ${m.stock}, '${m.image_url}')" class="p-2 bg-blue-50 text-blue-500 rounded-lg"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="deleteMenu('${m.id}')" class="p-2 bg-red-50 text-red-500 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

async function checkStockAlerts() {
    const { data: lowItems } = await _supabase.from('menus').select('name, stock').lt('stock', 5);
    const dot = document.getElementById("notif-dot");
    const list = document.getElementById("notif-list");

    if (lowItems && lowItems.length > 0) {
        dot.classList.remove("hidden");
        list.innerHTML = lowItems.map(m => `
            <div class="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-[11px] flex justify-between">
                <span>⚠️ Stock Low: <b>${m.name}</b></span>
                <b>Only ${m.stock} left!</b>
            </div>
        `).join('');
    } else {
        dot.classList.add("hidden");
        list.innerHTML = "<p class='text-slate-400 text-center py-4'>သတိပေးချက်မရှိသေးပါ</p>";
    }
}

// --- CUSTOMERS SYSTEM ---
async function renderCustomerList() {
    const { data: orders } = await _supabase.from('orders').select('customer_name, customer_phone');
    const listUl = document.getElementById("customer-list-items");
    
    // Unique Customers by Phone
    const customers = [];
    const map = new Map();
    for (const item of orders) {
        if(!map.has(item.customer_phone)){
            map.set(item.customer_phone, true);
            customers.push(item);
        }
    }

    listUl.innerHTML = customers.map(c => `
        <li onclick="viewCustomerDetail('${c.customer_phone}')" class="py-3 px-2 flex justify-between items-center active:bg-slate-50 transition">
            <span class="font-bold text-sm text-slate-600">${c.customer_name}</span>
            <span class="text-[10px] text-slate-400 font-mono">${c.customer_phone}</span>
        </li>
    `).join('');
}

async function viewCustomerDetail(phone) {
    switchPage('customers'); // Deep Link
    const detailBox = document.getElementById("customer-detail-section");
    detailBox.classList.remove("hidden");
    
    const { data: orders } = await _supabase.from('orders').select('*').eq('customer_phone', phone).order('created_at', { ascending: false });
    
    if(!orders) return;
    
    const totalSpent = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
    
    document.getElementById("customer-profile-info").innerHTML = `
        <h3 class="font-black text-xl text-slate-800">${orders[0].customer_name}</h3>
        <p class="text-xs text-slate-400 font-mono italic">${phone}</p>
    `;
    
    document.getElementById("cust-total-amount").textContent = totalSpent.toLocaleString() + " Ks";
    document.getElementById("cust-total-orders").textContent = orders.length;

    const historyUl = document.getElementById("customer-order-history");
    historyUl.innerHTML = orders.map(o => `
        <li class="p-3 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
            <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase">#${o.id.slice(0,5)}</p>
                <p class="text-[10px] text-slate-300">${new Date(o.created_at).toLocaleDateString()}</p>
            </div>
            <div class="text-right">
                <p class="font-black text-xs text-orange-600">${o.total_amount} Ks</p>
                <p class="text-[9px] uppercase font-bold text-slate-300">${o.status}</p>
            </div>
        </li>
    `).join('');
    
    detailBox.scrollIntoView({ behavior: 'smooth' });
}

// Form Handlers
document.getElementById("menu-form").onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById("menu-id").value;
    const data = {
        name: document.getElementById("menu-name").value,
        price: Number(document.getElementById("menu-price").value),
        stock: Number(document.getElementById("menu-stock").value),
        image_url: document.getElementById("menu-image-url").value
    };

    if (id) await _supabase.from('menus').update(data).eq('id', id);
    else await _supabase.from('menus').insert([data]);

    document.getElementById("menu-form").reset();
    document.getElementById("menu-id").value = "";
    renderMenuList();
};

function editMenu(id, name, price, stock, url) {
    document.getElementById("menu-id").value = id;
    document.getElementById("menu-name").value = name;
    document.getElementById("menu-price").value = price;
    document.getElementById("menu-stock").value = stock;
    document.getElementById("menu-image-url").value = url;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteMenu(id) {
    if(confirm('Delete item?')) {
        await _supabase.from('menus').delete().eq('id', id);
        renderMenuList();
    }
}

// INIT
calcDashboard();
renderOrderCards('new');

