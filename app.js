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

// အော်ဒါကတ်များ ဆွဲထုတ်သည့်// --- 1. ORDERS LOGIC (စနစ်တကျ ပြင်ဆင်ပြီး) ---
async function renderOrderCards(status) {
    const container = document.getElementById("order-cards");
    container.innerHTML = `<div class="text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div></div>`;

    // order_items ရော menus table ပါ join ဆွဲထားပါတယ်
    const { data: orders, error } = await _supabase
        .from('orders')
        .select(`
            *,
            order_items (
                quantity,
                menus (name, price)
            )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error || !orders) {
        container.innerHTML = "<p class='text-center py-10 text-slate-400'>အော်ဒါများ ဆွဲထုတ်ရာတွင် အမှားရှိနေပါသည်</p>";
        return;
    }

    container.innerHTML = orders.map(o => {
        // Item စာရင်းကို သေချာအောင် ပြန်စီခြင်း
        const itemsHtml = o.order_items.map(i => `
            <div class="flex justify-between text-[11px] border-b border-dashed border-slate-200 py-1">
                <span>${i.menus?.name} (x${i.quantity})</span>
                <span>${(i.menus?.price * i.quantity).toLocaleString()} Ks</span>
            </div>
        `).join('');

        return `
        <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-3">
            <div class="flex justify-between items-start" onclick="viewCustomerDetail('${o.customer_phone}')">
                <div>
                    <h4 class="font-bold text-lg">${o.customer_name}</h4>
                    <p class="text-xs text-slate-400">📞 ${o.customer_phone}</p>
                </div>
                <div class="text-right">
                    <div class="font-black text-orange-500">${o.total_amount.toLocaleString()} Ks</div>
                    <p class="text-[9px] text-slate-300">${new Date(o.created_at).toLocaleString()}</p>
                </div>
            </div>
            
            <div class="bg-slate-50 p-3 rounded-2xl space-y-1">
                <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Order Details</p>
                ${itemsHtml}
            </div>

            <div class="flex gap-2 pt-1">
                ${status === 'new' ? `<button onclick="updateStatus('${o.id}', 'pending')" class="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl text-xs">Accept Order</button>` : ''}
                ${status === 'pending' ? `<button onclick="updateStatus('${o.id}', 'finished')" class="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl text-xs">Finish Order</button>` : ''}
                <button onclick="downloadVoucher('${o.id}')" class="bg-slate-100 p-3 rounded-xl"><i data-lucide="printer" class="w-4 h-4"></i></button>
            </div>
        </div>
        `;
    }).join('');
    lucide.createIcons();
} Function (နာမည်ကို သေချာအောင် ပြန်စစ်ပါ)


// Accept/Finish နှိပ်ရင် Status ပြောင်းဖို့
async function updateStatus(id, nextStatus) {
    const { error } = await _supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    if (!error) {
        // Tab ပြောင်းသွားအောင် active ဖြစ်နေတဲ့ status ကို ပြန်ရှာပြီး render လုပ်ပေးမယ်
        const currentActiveStatus = document.querySelector('.tab-btn.active').getAttribute('data-status');
        await renderOrderCards(currentActiveStatus);
        calcDashboard();
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

// --- 2. VOUCHER PRINT & DOWNLOAD (PDF) ---
async function downloadVoucher(orderId) {
    const { data: o } = await _supabase.from('orders').select('*, order_items(*, menus(*))').eq('id', orderId).single();
    if (!o) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] }); // 80mm thermal paper size

    doc.setFontSize(14);
    doc.text("Minsa Grilled Chicken", 40, 10, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Order ID: #${o.id.slice(0, 8)}`, 10, 20);
    doc.text(`Date: ${new Date(o.created_at).toLocaleDateString()}`, 10, 25);
    doc.text(`Customer: ${o.customer_name}`, 10, 30);
    doc.text("------------------------------------------", 10, 35);

    let y = 42;
    o.order_items.forEach(i => {
        doc.text(`${i.menus.name} x ${i.quantity}`, 10, y);
        doc.text(`${(i.menus.price * i.quantity).toLocaleString()} Ks`, 70, y, { align: "right" });
        y += 7;
    });

    doc.text("------------------------------------------", 10, y);
    doc.setFontSize(12);
    doc.text(`Total: ${o.total_amount.toLocaleString()} Ks`, 70, y + 10, { align: "right" });
    
    // Auto Print Dialog
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
}

// --- 3. CUSTOMER DETAIL (အသေးစိတ်ပြသရန်) ---
async function viewCustomerDetail(phone) {
    switchPage('customers');
    const detailBox = document.getElementById("customer-detail-section");
    detailBox.classList.remove("hidden");
    
    const { data: orders } = await _supabase.from('orders').select('*, order_items(*, menus(*))').eq('customer_phone', phone).order('created_at', { ascending: false });
    
    if(!orders || orders.length === 0) return;

    document.getElementById("customer-profile-info").innerHTML = `
        <h3 class="font-bold text-lg">${orders[0].customer_name}</h3>
        <p class="text-xs text-slate-400">📞 ${phone}</p>
    `;

    document.getElementById("cust-total-amount").innerText = orders.reduce((s, o) => s + o.total_amount, 0).toLocaleString() + " Ks";
    document.getElementById("cust-total-orders").innerText = orders.length;

    document.getElementById("customer-order-history").innerHTML = orders.map(o => `
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[11px] mb-2">
            <div class="flex justify-between font-bold text-orange-600 mb-1">
                <span>#${o.id.slice(0,8)}</span>
                <span>${o.total_amount.toLocaleString()} Ks</span>
            </div>
            <div class="text-slate-500 italic mb-1">
                ${o.order_items.map(i => `${i.menus?.name} (x${i.quantity})`).join(', ')}
            </div>
            <div class="text-[9px] text-slate-300 text-right">${new Date(o.created_at).toLocaleString()}</div>
        </div>
    `).join('');
}
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

