// --- CONFIGURATION ---
const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentOrderTab = 'new';

// --- ၁။ စာမျက်နှာ ထိန်းချုပ်မှု (NAVIGATION) ---
function switchPage(pageId) {
    // Page များအားလုံးကို ဖျောက်ထားမယ်
    document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
    
    // ရွေးချယ်လိုက်သော Page ကို ပြမယ်
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('visible');
    
    // Page Title ကို ပြောင်းမယ်
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
        titleEl.innerText = pageId.replace('-', ' ').replace(/\bw/g, l => l.toUpperCase());
    }
    
    localStorage.setItem('lastPage', pageId);

    // Page အလိုက် Function များ ခေါ်ယူခြင်း
    if (pageId === 'dashboard') calcDashboard();
    if (pageId === 'menu') renderMenuList();
    if (pageId === 'customers') renderCustomerList();
    if (pageId === 'orders') renderOrders(currentOrderTab);
}

// --- ၂။ ORDER STATUS TABS ---
function setOrderStatusTab(status) {
    currentOrderTab = status;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    renderOrders(status);
}

// --- ၃။ IMAGE UPLOAD LOGIC ---
async function uploadImage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await _supabase.storage
        .from('menu-images')
        .upload(fileName, file, { upsert: true });
    
    if (error) {
        console.error("Upload error:", error);
        return null;
    }
    const { data: publicUrlData } = _supabase.storage.from('menu-images').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
}

// --- ၄။ MENU MANAGEMENT (ADD / EDIT / DELETE) ---
document.getElementById('menu-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    const id = document.getElementById('menu-id').value;
    const file = document.getElementById('menu-image-file').files[0];
    let imageUrl = document.getElementById('menu-image-url').value.trim();

    if (file) {
        const uploadedUrl = await uploadImage(file);
        if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const data = {
        name: document.getElementById('menu-name').value.trim(),
        price: parseInt(document.getElementById('menu-price').value),
        stock: parseInt(document.getElementById('menu-stock').value),
        image_url: imageUrl || null
    };

    let response;
    if (id) {
        response = await _supabase.from('menus').update(data).eq('id', id);
    } else {
        response = await _supabase.from('menus').insert([data]);
    }

    submitBtn.disabled = false;
    submitBtn.innerText = originalText;

    if (!response.error) {
        alert(id ? 'Menu updated!' : 'New menu added!');
        resetMenuForm();
        switchPage('menu');
    } else {
        alert(`Error: ${response.error.message}`);
    }
});

function editMenu(id, name, price, stock, url) {
    document.getElementById('menu-id').value = id;
    document.getElementById('menu-name').value = name;
    document.getElementById('menu-price').value = price;
    document.getElementById('menu-stock').value = stock;
    document.getElementById('menu-image-url').value = url || '';
    document.getElementById('form-title').innerText = "Edit Menu Item";
    switchPage('add-menu');
}

async function deleteMenu(id) {
    if (confirm('ဒီဟင်းပွဲကို ဖျက်မှာ သေချာပါသလား?')) {
        const { error } = await _supabase.from('menus').delete().eq('id', id);
        if (!error) renderMenuList();
        else alert('Delete failed: ' + error.message);
    }
}

function resetMenuForm() {
    const form = document.getElementById('menu-form');
    if (form) form.reset();
    document.getElementById('menu-id').value = '';
    document.getElementById('form-title').innerText = "Add New Menu";
}

async function renderMenuList() {
    const { data: menus, error } = await _supabase.from('menus').select('*').order('name', { ascending: true });
    if (error) return;

    const container = document.getElementById('menu-list');
    container.innerHTML = menus.map(m => `
        <div class="bg-white p-4 rounded-3xl border flex gap-4 items-center shadow-sm">
            <img src="${m.image_url || 'https://via.placeholder.com/80'}" class="w-20 h-20 rounded-2xl object-cover bg-slate-100">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-700 truncate">${m.name}</h4>
                <p class="text-orange-500 font-bold">${m.price.toLocaleString()} Ks</p>
                <p class="text-[10px] text-slate-400">Stock: ${m.stock}</p>
            </div>
            <div class="flex flex-col gap-2">
                <button onclick="editMenu('${m.id}', '${m.name.replace(/'/g, "\\'")}', ${m.price}, ${m.stock}, '${m.image_url || ''}')" 
                        class="p-2 bg-blue-50 text-blue-500 rounded-lg"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="deleteMenu('${m.id}')" 
                        class="p-2 bg-red-50 text-red-500 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- ၅။ CUSTOMER MANAGEMENT ---
async function renderCustomerList() {
    const { data: customers } = await _supabase.from('orders').select('customer_name, customer_phone');
    if (!customers) return;

    const customerMap = {};
    customers.forEach(c => {
        if (!customerMap[c.customer_phone]) {
            customerMap[c.customer_phone] = { name: c.customer_name, phone: c.customer_phone };
        }
    });

    const uniqueCustomers = Object.values(customerMap);
    const container = document.getElementById('customer-list-items');
    container.innerHTML = uniqueCustomers.map(cust => `
        <li onclick="viewCustomerDetail('${cust.phone}')" class="p-4 hover:bg-orange-50 cursor-pointer border-b flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500"><i data-lucide="user" class="w-5 h-5"></i></div>
            <div class="flex-1">
                <p class="font-bold text-sm text-slate-700">${cust.name}</p>
                <p class="text-xs text-slate-400">${cust.phone}</p>
            </div>
        </li>
    `).join('');
    lucide.createIcons();
}

async function viewCustomerDetail(phone) {
    const detailBox = document.getElementById("customer-detail-section");
    detailBox.classList.remove("hidden");
    
    const { data: orders, error } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false });
    
    if (error || !orders || orders.length === 0) return;

    document.getElementById("customer-profile-info").innerHTML = `
        <h3 class="font-black text-xl text-slate-800">${orders[0].customer_name}</h3>
        <p class="text-sm text-slate-500">📞 ${phone}</p>
    `;

    const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0);
    document.getElementById("cust-total-amount").innerText = totalAmount.toLocaleString() + " Ks";
    document.getElementById("cust-total-orders").innerText = orders.length;

    document.getElementById("customer-order-history").innerHTML = orders.map(o => `
        <li onclick="downloadVoucher('${o.id}')" class="bg-white p-4 rounded-2xl border shadow-sm cursor-pointer mb-2">
            <div class="flex justify-between items-center">
                <span class="text-xs text-slate-400">${new Date(o.created_at).toLocaleDateString()}</span>
                <span class="font-bold text-orange-600">${o.total_amount.toLocaleString()} Ks</span>
            </div>
        </li>
    `).join('');
    lucide.createIcons();
}

function hideCustomerDetail() {
    document.getElementById("customer-detail-section").classList.add("hidden");
}

// --- ၆။ ORDERS MANAGEMENT ---
async function renderOrders(status = 'new') {
    const container = document.getElementById('order-cards');
    const { data: orders, error } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(name))')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error || !orders?.length) {
        container.innerHTML = '<p class="text-center py-12 text-slate-400">No orders</p>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const itemsList = order.order_items.map(i => `${i.menus?.name || 'Item'} (x${i.quantity})`).join(', ');
        return `
        <div class="bg-white p-6 rounded-3xl border shadow-sm mb-4">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h4 class="font-bold text-lg">${order.customer_name}</h4>
                    <p class="text-sm text-slate-500">${order.customer_phone}</p>
                </div>
                <div class="text-right">
                    <p class="font-black text-xl text-orange-600">${order.total_amount.toLocaleString()} Ks</p>
                </div>
            </div>
            <div class="bg-slate-50 p-4 rounded-2xl mb-4 border-l-4 border-orange-400">
                <p class="text-sm text-slate-700">${itemsList}</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
                ${status === 'new' ? `
                    <button onclick="updateOrderStatus('${order.id}', 'pending')" class="bg-blue-500 text-white py-3 rounded-xl font-bold">Accept</button>
                    <button onclick="updateOrderStatus('${order.id}', 'finished')" class="bg-green-500 text-white py-3 rounded-xl font-bold">Complete</button>
                ` : `
                    <button onclick="downloadVoucher('${order.id}')" class="col-span-2 bg-orange-500 text-white py-3 rounded-xl font-bold">Print Voucher</button>
                `}
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

async function updateOrderStatus(orderId, newStatus) {
    const { error } = await _supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) renderOrders(currentOrderTab);
}

// --- ၇။ VOUCHER PRINTING ---
async function downloadVoucher(id) {
    const { data: o } = await _supabase.from('orders').select('*, order_items(*, menus(*))').eq('id', id).single();
    if (!o) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });

    doc.setFontSize(14);
    doc.text("မြင်သာကြက်ကင်", 40, 10, { align: "center" });
    doc.setFontSize(8);
    doc.text(`ID: #${o.id.slice(-6)}`, 40, 15, { align: "center" });
    doc.text(`Date: ${new Date(o.created_at).toLocaleString()}`, 10, 25);
    doc.text(`Customer: ${o.customer_name}`, 10, 30);
    
    let y = 40;
    o.order_items.forEach(i => {
        doc.text(`${i.menus?.name} x${i.quantity}`, 10, y);
        doc.text(`${(i.menus?.price * i.quantity).toLocaleString()} Ks`, 70, y, { align: "right" });
        y += 5;
    });

    doc.text("------------------------------------------", 10, y + 2);
    doc.setFontSize(10);
    doc.text(`Total: ${o.total_amount.toLocaleString()} Ks`, 70, y + 8, { align: "right" });
    
    const pdfUrl = URL.createObjectURL(doc.output('blob'));
    window.open(pdfUrl, '_blank');
}

// --- ၈။ DASHBOARD & NOTIFICATIONS ---
async function calcDashboard() {
    const { data: orders } = await _supabase.from('orders').select('total_amount, customer_name, customer_phone');
    if(!orders) return;
    
    document.getElementById('total-orders').innerText = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    document.getElementById('total-revenue').innerText = totalRevenue.toLocaleString() + " Ks";

    const recentList = orders.slice(-5).reverse();
    document.getElementById('dash-recent-orders').innerHTML = recentList.map(o => `
        <li class="flex justify-between items-center bg-white p-3 rounded-2xl border mb-2">
            <span class="font-bold text-sm">${o.customer_name}</span>
            <span class="text-orange-500 font-bold">${o.total_amount.toLocaleString()} Ks</span>
        </li>
    `).join('');
}

function addNotification(msg) {
    const dot = document.getElementById('notif-dot');
    const list = document.getElementById('notif-list');
    if (dot) dot.classList.remove('hidden');
    if (list) {
        const item = document.createElement('div');
        item.className = "p-3 border-b text-xs bg-orange-50";
        item.innerHTML = `<b>New Order!</b><br>${msg}`;
        list.prepend(item);
    }
}

// REAL-TIME
_supabase.channel('orders').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, 
    payload => addNotification(`${payload.new.customer_name} ထံမှ အော်ဒါအသစ် ရောက်ရှိလာပါသည်`)).subscribe();

// INIT
window.onload = () => {
    switchPage(localStorage.getItem('lastPage') || 'dashboard');
};
        
