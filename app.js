const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
}
// --- ၄။ NOTIFICATION & REAL-TIME ---
function addNotification(msg, type = 'order') {
    const dot = document.getElementById('notif-dot');
    const list = document.getElementById('notif-list');
    dot.classList.remove('hidden');

    const newNotif = document.createElement('div');
    newNotif.className = `p-3 mb-2 rounded-xl text-[11px] cursor-pointer border ${type === 'order' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`;
    newNotif.innerHTML = `<b>${type === 'order' ? '🔔 New Order' : '⚠️ Stock Alert'}</b><br>${msg}`;
    
    newNotif.onclick = () => {
        if(type === 'order') { switchPage('orders'); setOrderStatusTab('new'); } 
        else { switchPage('menu'); }
        document.getElementById('notif-dropdown').classList.add('hidden');
    };

    if (list.innerHTML.includes('သတိပေးချက်မရှိ')) list.innerHTML = '';
    list.insertBefore(newNotif, list.firstChild);
}
// --- ၂။ IMAGE UPLOAD LOGIC ---
async function uploadImage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await _supabase.storage
        .from('menu-images')
        .upload(fileName, file);
    if (error) {
        console.error("Upload error:", error);
        return null;
    }
    const { data: publicUrl } = _supabase.storage.from('menu-images').getPublicUrl(fileName);
    return publicUrl.publicUrl;
}

// --- ၃။ MENU MANAGEMENT (Add/Edit/Delete) ---
document.getElementById('menu-form').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    const id = document.getElementById('menu-id').value;
    const file = document.getElementById('menu-image-file').files[0];
    let imageUrl = document.getElementById('menu-image-url').value;

    // အကယ်၍ ဖုန်းထဲက ပုံရွေးထားရင် Upload တင်မယ်
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

    let error;
    if (id) {
        const res = await _supabase.from('menus').update(data).eq('id', id);
        error = res.error;
    } else {
        const res = await _supabase.from('menus').insert([data]);
        error = res.error;
    }

    submitBtn.disabled = false;
    submitBtn.innerText = "Save Item";

    if (!error) {
        resetMenuForm();
        switchPage('menu');
    } else {
        alert("Error saving menu item.");
    }
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
    if (confirm('ဒီဟင်းပွဲကို ဖျက်မှာ သေချာပါသလား?')) {
        await _supabase.from('menus').delete().eq('id', id);
        renderMenuList();
    }
}

function resetMenuForm() {
    document.getElementById('menu-form').reset();
    document.getElementById('menu-id').value = '';
    document.getElementById('form-title').innerText = "Add New Item";
}

async function renderMenuList() {
    const { data: menus } = await _supabase.from('menus').select('*').order('name');
    const container = document.getElementById('menu-list');
    container.innerHTML = menus.map(m => `
        <div class="bg-white p-4 rounded-3xl border flex gap-4 items-center shadow-sm">
            <img src="${m.image_url || 'https://via.placeholder.com/80'}" class="w-20 h-20 rounded-2xl object-cover bg-slate-100 shadow-inner">
            <div class="flex-1">
                <h4 class="font-bold text-slate-700">${m.name}</h4>
                <p class="text-orange-500 font-bold text-sm">${m.price.toLocaleString()} Ks</p>
                <p class="text-[10px] text-slate-400">Stock: ${m.stock}</p>
            </div>
            <div class="flex flex-col gap-2">
                <button onclick="editMenu('${m.id}', '${m.name}', ${m.price}, ${m.stock}, '${m.image_url}')" class="p-2 bg-blue-50 text-blue-500 rounded-lg"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="deleteMenu('${m.id}')" class="p-2 bg-red-50 text-red-500 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- ၄။ VOUCHER & CUSTOMER DETAIL ---
async function downloadVoucher(id) {
    const { data: o } = await _supabase.from('orders').select('*, order_items(*, menus(*))').eq('id', id).single();
    if (!o) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });

    doc.setFontSize(14);
    doc.text("Minsa Grilled Chicken", 40, 10, { align: "center" });
    doc.setFontSize(9);
    doc.text(`ID: #${o.id.slice(0, 8)}`, 10, 20);
    doc.text(`Date: ${new Date(o.created_at).toLocaleDateString()}`, 10, 25);
    doc.text(`Customer: ${o.customer_name}`, 10, 30);
    doc.text("------------------------------------------", 10, 35);

    let y = 42;
    o.order_items.forEach(i => {
        doc.text(`${i.menus?.name || 'Item'} x ${i.quantity}`, 10, y);
        doc.text(`${((i.menus?.price || 0) * i.quantity).toLocaleString()} Ks`, 70, y, { align: "right" });
        y += 7;
    });

    doc.text("------------------------------------------", 10, y);
    doc.setFontSize(11);
    doc.text(`Total: ${o.total_amount.toLocaleString()} Ks`, 70, y + 10, { align: "right" });
    
    window.open(doc.output('bloburl'), '_blank');
}

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
        <div class="bg-white p-4 rounded-2xl border mb-3 shadow-sm">
            <div class="flex justify-between font-bold text-orange-600 mb-2">
                <span class="text-xs">#${o.id.slice(0,8)}</span>
                <span class="text-sm">${o.total_amount.toLocaleString()} Ks</span>
            </div>
            <div class="text-[11px] text-slate-500 mb-2">
                ${o.order_items.map(i => `• ${i.menus?.name} (x${i.quantity})`).join('<br>')}
            </div>
            <button onclick="downloadVoucher('${o.id}')" class="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                <i data-lucide="printer" class="w-3 h-3"></i> Print Voucher
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- ၅။ REAL-TIME & DASHBOARD ---
async function calcDashboard() {
    const { data: orders } = await _supabase.from('orders').select('*');
    if(!orders) return;
    document.getElementById('total-orders').innerText = orders.length;
    document.getElementById('total-revenue').innerText = orders.reduce((s,o) => s + o.total_amount, 0).toLocaleString() + " Ks";
    
    const { data: recent } = await _supabase.from('orders').select('*').order('created_at', {ascending: false}).limit(5);
    document.getElementById('dash-recent-orders').innerHTML = recent.map(o => `
        <li onclick="viewCustomerDetail('${o.customer_phone}')" class="flex justify-between items-center bg-white p-3 rounded-2xl border mb-2 shadow-sm cursor-pointer">
            <span class="font-bold text-xs">${o.customer_name}</span>
            <span class="text-orange-500 font-black text-xs">${o.total_amount.toLocaleString()} Ks</span>
        </li>`).join('');
}

// INIT
window.onload = () => {
    const lastPage = localStorage.getItem('lastPage') || 'dashboard';
    switchPage(lastPage);
};

