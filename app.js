const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentOrderTab = 'new';

// --- ၁။ စာမျက်နှာ ထိန်းချုပ်မှု ---
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('visible');
    
    document.getElementById('page-title').innerText = pageId.replace('-', ' ').replace(/\bw/g, l => l.toUpperCase());
    localStorage.setItem('lastPage', pageId);

    if (pageId === 'dashboard') calcDashboard();
    if (pageId === 'menu') renderMenuList();
    if (pageId === 'customers') renderCustomerList();
    if (pageId === 'orders') renderOrders(currentOrderTab);
}

// --- ၂။ ORDER STATUS TABS ---
function setOrderStatusTab(status) {
    currentOrderTab = status;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
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
    const { data: publicUrl } = _supabase.storage.from('menu-images').getPublicUrl(fileName);
    return publicUrl.data.publicUrl;
}

// --- ၄။ MENU MANAGEMENT (Add/Edit/Delete) ---
document.getElementById('menu-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    const id = document.getElementById('menu-id').value;
    const file = document.getElementById('menu-image-file').files[0];
    let imageUrl = document.getElementById('menu-image-url').value.trim();

    // File upload ရှိရင် upload လုပ်
    if (file) {
        imageUrl = await uploadImage(file);
    }

    const data = {
        name: document.getElementById('menu-name').value.trim(),
        price: parseInt(document.getElementById('menu-price').value),
        stock: parseInt(document.getElementById('menu-stock').value),
        image_url: imageUrl || null
    };

    let error;
    if (id) {
        // UPDATE
        const { data: result, error: updateError } = await _supabase
            .from('menus')
            .update(data)
            .eq('id', id)
            .select();
        error = updateError;
        console.log('Update result:', result);
    } else {
        // INSERT
        const { data: result, error: insertError } = await _supabase
            .from('menus')
            .insert([data])
            .select();
        error = insertError;
        console.log('Insert result:', result);
    }

    submitBtn.disabled = false;
    submitBtn.innerText = originalText;

    if (!error) {
        alert(id ? 'Menu updated successfully!' : 'New menu added successfully!');
        resetMenuForm();
        switchPage('menu');
    } else {
        console.error('Supabase error:', error);
        alert(`Error: ${error.message}`);
    }
});

function editMenu(id, name, price, stock, url) {
    document.getElementById('menu-id').value = id;
    document.getElementById('menu-name').value = name;
    document.getElementById('menu-price').value = price;
    document.getElementById('menu-stock').value = stock;
    document.getElementById('menu-image-url').value = url || '';
    document.getElementById('form-title').innerText = "Edit Menu Item";
    document.getElementById('menu-image-file').value = '';
    switchPage('add-menu');
}

async function deleteMenu(id) {
    if (confirm('ဒီဟင်းပွဲကို ဖျက်မှာ သေချာပါသလား?')) {
        const { error } = await _supabase.from('menus').delete().eq('id', id);
        if (!error) {
            renderMenuList();
        } else {
            alert('Delete failed: ' + error.message);
        }
    }
}

function resetMenuForm() {
    document.getElementById('menu-form').reset();
    document.getElementById('menu-id').value = '';
    document.getElementById('form-title').innerText = "Add New Menu";
    document.getElementById('menu-image-file').value = '';
}

async function renderMenuList() {
    const { data: menus, error } = await _supabase
        .from('menus')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) {
        console.error('Menu fetch error:', error);
        return;
    }

    const container = document.getElementById('menu-list');
    container.innerHTML = menus.map(m => `
        <div class="bg-white p-4 rounded-3xl border flex gap-4 items-center shadow-sm hover:shadow-md transition-all">
            <img src="${m.image_url || 'https://via.placeholder.com/80x80/ddd?text=No+Image'}" 
                 class="w-20 h-20 rounded-2xl object-cover bg-slate-100 shadow-inner" 
                 onerror="this.src='https://via.placeholder.com/80x80/ddd?text=No+Image'">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-700 truncate">${m.name}</h4>
                <p class="text-orange-500 font-bold text-sm">${m.price.toLocaleString()} Ks</p>
                <p class="text-[10px] text-slate-400">Stock: ${m.stock}</p>
            </div>
            <div class="flex flex-col gap-2">
                <button onclick="editMenu('${m.id}', '${m.name.replace(/'/g, "\\'")}', ${m.price}, ${m.stock}, '${m.image_url || ''}')" 
                        class="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-all">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button onclick="deleteMenu('${m.id}')" 
                        class="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- ၅။ CUSTOMER MANAGEMENT ---
async function renderCustomerList() {
    const { data: customers } = await _supabase
        .from('orders')
        .select('customer_name, customer_phone')
        .order('created_at', { ascending: false })
        .limit(50);

    const customerMap = {};
    customers.forEach(c => {
        if (!customerMap[c.customer_phone]) {
            customerMap[c.customer_phone] = { name: c.customer_name, phone: c.customer_phone };
        }
    });

    const customerList = Object.values(customerMap);
    
    const container = document.getElementById('customer-list-items');
    container.innerHTML = customerList.map(cust => `
        <li onclick="viewCustomerDetail('${cust.phone}')" 
            class="p-4 hover:bg-orange-50 cursor-pointer border-b last:border-b-0 transition-all flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <i data-lucide="user" class="w-5 h-5 text-orange-500"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="font-bold text-sm text-slate-700">${cust.name}</p>
                <p class="text-xs text-slate-400 truncate">${cust.phone}</p>
            </div>
        </li>
    `).join('');
    
    lucide.createIcons();
}

function hideCustomerDetail() {
    document.getElementById("customer-detail-section").classList.add("hidden");
}

async function viewCustomerDetail(phone) {
    const detailBox = document.getElementById("customer-detail-section");
    detailBox.classList.remove("hidden");
    
    const { data: orders, error } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false });
    
    if (error || !orders || orders.length === 0) {
        alert('No orders found for this customer');
        return;
    }

    // Profile info
    document.getElementById("customer-profile-info").innerHTML = `
        <div class="flex items-center justify-center gap-3 mb-2">
            <div class="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <i data-lucide="user" class="w-8 h-8 text-white"></i>
            </div>
        </div>
        <h3 class="font-black text-xl text-slate-800">${orders[0].customer_name}</h3>
        <p class="text-sm text-slate-500">📞 ${phone}</p>
    `;

    // Stats
    const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0);
    document.getElementById("cust-total-amount").innerText = totalAmount.toLocaleString() + " Ks";
    document.getElementById("cust-total-orders").innerText = orders.length;

    // Order history
    document.getElementById("customer-order-history").innerHTML = orders.slice(0, 10).map(o => {
        const date = new Date(o.created_at).toLocaleDateString('my-MM');
        const time = new Date(o.created_at).toLocaleTimeString('my-MM', { hour: '2-digit', minute: '2-digit' });
        const items = o.order_items.map(i => `${i.menus?.name || 'Item'} (x${i.quantity})`).join(', ');
        
        return `
            <li onclick="showOrderDetail('${o.id}')" class="bg-white p-4 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-bold text-sm text-slate-700">#${o.id.slice(-8)}</p>
                        <p class="text-xs text-slate-400">${date} ${time}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-black text-orange-600 text-sm">${o.total_amount.toLocaleString()} Ks</p>
                        <p class="text-[10px] text-slate-500">${o.status}</p>
                    </div>
                </div>
                <p class="text-xs text-slate-500 line-clamp-2">${items}</p>
            </li>
        `;
    }).join('');

    lucide.createIcons();
}

function showOrderDetail(orderId) {
    // Order detail modal or voucher download
    downloadVoucher(orderId);
}

// --- ၆။ ORDER MANAGEMENT ---
async function renderOrders(status = 'new') {
    const { data: orders, error } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Orders fetch error:', error);
        return;
    }

    const container = document.getElementById('order-cards');
    container.innerHTML = orders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('my-MM');
        const time = new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const itemsList = order.order_items.map(item => 
            `<div class="flex justify-between text-xs py-1">
                <span>${item.menus?.name || 'Item'}</span>
                <span>${item.quantity}x${item.menus?.price?.toLocaleString() || 0} = ${(item.menus?.price * item.quantity || 0).toLocaleString()}Ks</span>
            </div>`
        ).join('');

        const getStatusColor = (status) => {
            if (status === 'new') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            if (status === 'pending') return 'bg-blue-50 text-blue-700 border-blue-200';
            return 'bg-green-50 text-green-700 border-green-200';
        };

        return `
            <div class="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="font-bold text-lg">${order.customer_name}</h4>
                        <p class="text-sm text-slate-500">${order.customer_phone}</p>
                        <p class="text-xs text-slate-400">${date} ${time}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-black text-2xl text-orange-600">${order.total_amount.toLocaleString()} Ks</p>
                        <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-1 ${getStatusColor(order.status)} border">
                            <i data-lucide="${order.status === 'new' ? 'clock' : order.status === 'pending' ? 'package' : 'check-circle'}" class="w-3 h-3"></i>
                            ${order.status.toUpperCase()}
                        </div>
                    </div>
                </div>
                
                <div class="bg-slate-50 p-3 rounded-2xl mb-4 text-sm">
                    <h5 class="font-bold mb-2 text-slate-700">Order Items:</h5>
                    <div class="space-y-1">${itemsList}</div>
                </div>
                
                <div class="flex gap-2 pt-4 border-t">
                    ${order.status === 'new' ? `
                        <button onclick="updateOrderStatus('${order.id}', 'pending')" 
                                class="flex-1 bg-blue-500 text-white py-3 px-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                            <i data-lucide="package" class="w-4 h-4 mr-1"></i>Accept
                        </button>
                        <button onclick="updateOrderStatus('${order.id}', 'finished')" 
                                class="flex-1 bg-green-500 text-white py-3 px-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                            <i data-lucide="check-circle" class="w-4 h-4 mr-1"></i>Complete
                        </button>
                    ` : `
                        <button onclick="downloadVoucher('${order.id}')" 
                                class="flex-1 bg-orange-500 text-white py-3 px-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                            <i data-lucide="printer" class="w-4 h-4 mr-1"></i>Print Voucher
                        </button>
                    `}
                    <button onclick="viewCustomerDetail('${order.customer_phone}'); switchPage('customers');" 
                            class="flex-1 bg-slate-500 text-white py-3 px-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                        <i data-lucide="user" class="w-4 h-4 mr-1"></i>Customer
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

async function updateOrderStatus(orderId, newStatus) {
    if (confirm(`Mark order as ${newStatus}?`)) {
        const { error } = await _supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);
        
        if (!error) {
            renderOrders(currentOrderTab);
            addNotification(`Order #${orderId.slice(-8)} marked as ${newStatus}`, 'order');
        } else {
            alert('Update failed: ' + error.message);
        }
    }
}

// --- ၇။ VOUCHER PRINT ---
async function downloadVoucher(id) {
    const { data: o } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('id', id)
        .single();
    
    if (!o) {
        alert('Order not found');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 200] });

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text("မြင်သာကြက်ကင်", 40, 10, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Order ID: #${o.id.slice(-8)}`, 40, 22, { align: "center" });
    doc.text(`Date: ${new Date(o.created_at).toLocaleString('my-MM')}`, 40, 28, { align: "center" });
    doc.text(`Customer: ${o.customer_name}`, 40, 34, { align: "center" });
    doc.text(`Phone: ${o.customer_phone}`, 40, 40, { align: "center" });
    
    doc.text("═" + "═".repeat(50), 5, 48, { align: "left" });

    // Items
    let y = 55;
    o.order_items.forEach(i => {
        const itemName = i.menus?.name || 'Item';
        const itemTotal = (i.menus?.price || 0) * i.quantity;
        doc.text(`${itemName} x${i.quantity}`, 10, y);
        doc.text(`${itemTotal.toLocaleString()} Ks`, 70, y, { align: "right" });
        y += 8;
    });

    // Total
    doc.text("═" + "═".repeat(50), 5, y, { align: "left" });
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${o.total_amount.toLocaleString()} Ks`, 70, y + 12, { align: "right" });
    doc.setFontSize(10);
    doc.text("Thank you for your order!", 40, y + 25, { align: "center" });

    // Save and open
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
}

// --- ၈။ NOTIFICATION & DASHBOARD ---
function addNotification(msg, type = 'order') {
    const dot = document.getElementById('notif-dot');
    const list = document.getElementById('notif-list');
    dot.classList.remove('hidden');

    const newNotif = document.createElement('div');
    newNotif.className = `p-3 mb-2 rounded-xl text-[11px] cursor-pointer border transition-all ${
        type === 'order' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 
                          'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
    }`;
    newNotif.innerHTML = `<b>${type === 'order' ? '🔔 New Order' : '⚠️ Stock Alert'}</b><br>${msg}`;
    
    newNotif.onclick = () => {
        if(type === 'order') { 
            switchPage('orders'); 
            setOrderStatusTab('new'); 
        } else { 
            switchPage('menu'); 
        }
        document.getElementById('notif-dropdown').classList.add('hidden');
    };

    if (list.innerHTML.includes('သတိပေးချက်မရှိ')) list.innerHTML = '';
    list.insertBefore(newNotif, list.firstChild);
}

async function calcDashboard() {
    const { data: orders } = await _supabase.from('orders').select('total_amount').order('created_at', { ascending: false });
    if(!orders || orders.length === 0) return;
    
    document.getElementById('total-orders').innerText = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
    document.getElementById('total-revenue').innerText = totalRevenue.toLocaleString() + " Ks";
    
    const { data: recent } = await _supabase
        .from('orders')
        .select('customer_name, customer_phone, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
    
    document.getElementById('dash-recent-orders').innerHTML = recent.map(o => `
        <li onclick="viewCustomerDetail('${o.customer_phone}')" 
            class="flex justify-between items-center bg-white p-3 rounded-2xl border mb-2 shadow-sm cursor-pointer hover:shadow-md transition-all">
            <span class="font-bold text-sm">${o.customer_name}</span>
            <span class="text-orange-500 font-black text-sm">${o.total_amount.toLocaleString()} Ks</span>
        </li>
    `).join('');
}

// --- INIT ---
window.onload = () => {
    lucide.createIcons();
    const lastPage = localStorage.getItem('lastPage') || 'dashboard';
    switchPage(lastPage);
    
    // Real-time subscriptions
    _supabase
        .channel('orders')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'orders' }, 
            (payload) => {
                console.log('Order change:', payload);
                addNotification(`Order ${payload.eventType} #${payload.new.id.slice(-8)}`);
                if (['dashboard', 'orders'].includes(localStorage.getItem('lastPage'))) {
                    switchPage(localStorage.getItem('lastPage'));
                }
            }
        )
        .subscribe();
};
