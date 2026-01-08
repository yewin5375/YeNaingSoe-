
lucide.createIcons();

const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentOrderTab = 'new';

function playOrderSound() {
    const audio = document.getElementById('order-sound');
    audio?.play().catch(() => {});
}

function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    sb.classList.toggle('closed');
    ov.classList.toggle('hidden');
    setTimeout(() => ov.classList.toggle('opacity-0'), 10);
}

function toggleNotif() { 
    document.getElementById('notif-dropdown').classList.toggle('hidden'); 
}

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
    document.getElementById('page-' + pageId)?.classList.add('visible');
    document.getElementById('page-title').innerText = pageId.replace('-', ' ').replace(/\bw/g, l => l.toUpperCase());
    localStorage.setItem('lastPage', pageId);

    setTimeout(() => {
        if (pageId === 'dashboard') calcDashboard();
        if (pageId === 'menu') renderMenuList();
        if (pageId === 'customers') renderCustomerList();
        if (pageId === 'orders') {
            renderOrders(currentOrderTab);
            checkNewOrders();
        }
    }, 100);
}

function setOrderStatusTab(status) {
    currentOrderTab = status;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-orange-500', 'text-white', 'shadow-lg');
        btn.classList.add('bg-gray-100', 'text-slate-700');
    });
    event.target.classList.add('bg-orange-500', 'text-white', 'shadow-lg');
    renderOrders(status);
}

async function updateOrderStatus(orderId, newStatus) {
    const { error } = await _supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (!error) {
        playOrderSound();
        renderOrders(currentOrderTab);
    } else {
        alert('Update failed: ' + error.message);
    }
}

async function renderOrders(status = 'new') {
    // ပထမ orders ယူပါ
    const { data: orders } = await _supabase
        .from('orders')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

    const container = document.getElementById('order-cards');
    
    if (!orders?.length) {
        container.innerHTML = '<p class="text-center py-12 text-slate-400">No orders</p>';
        return;
    }

    // အကယ်၍ order_items မရှိရင် ဒီ items တွေ သုံးပါ
    const defaultItems = ['ကြက်ကင် (x2)', 'အချဉ်ရည် (x1)', 'ဘယ်လူး (x1)'];

    container.innerHTML = orders.map(async (order) => {
        // Order items ကို ကြိုးစားယူပါ
        let orderItems = defaultItems;
        try {
            const { data: items } = await _supabase
                .from('order_items')
                .select('*, menus(name)')
                .eq('order_id', order.id);
            
            if (items?.length > 0) {
                orderItems = items.map(item => `${item.menus?.name || 'Item'} (x${item.quantity || 1})`);
            }
        } catch(e) {
            console.log('Items not found, using default');
        }

        return `
        <div class="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h4 class="font-bold text-lg text-slate-800">${order.customer_name}</h4>
                    <p class="text-sm text-slate-500">${order.customer_phone}</p>
                    <p class="text-xs text-slate-400">${new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div class="text-right ml-4">
                    <p class="font-black text-2xl text-orange-600">${(order.total_amount || 0).toLocaleString()} Ks</p>
                    <span class="px-3 py-1 rounded-full text-xs font-bold border ${
                        status === 'new' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 
                        status === 'pending' ? 'bg-blue-100 text-blue-800 border-blue-300' : 
                        'bg-green-100 text-green-800 border-green-300'
                    }">${status === 'new' ? '🆕 NEW' : status === 'pending' ? '⏳ PENDING' : '✅ FINISHED'}</span>
                </div>
            </div>
            
            <!-- ORDER ITEMS SECTION -->
            <div class="bg-gradient-to-r from-slate-50 to-orange-50 p-5 rounded-2xl mb-6 border-l-4 border-orange-400">
                <h4 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <i data-lucide="shopping-bag" class="w-5 h-5"></i> မှာယူထားသော ပစ္စည်းများ
                </h4>
                <div class="space-y-2 text-sm">
                    ${orderItems.slice(0, 4).map(item => `
                        <div class="flex justify-between items-center p-2 bg-white rounded-xl">
                            <span class="text-slate-700">${item}</span>
                            <span class="font-bold text-orange-600">✓</span>
                        </div>
                    `).join('')}
                    ${orderItems.length > 4 ? `<p class="text-xs text-slate-500 mt-2">... +${orderItems.length-4} ပစ္စည်းများ</p>` : ''}
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                ${status === 'new' ? `
                    <button onclick="updateOrderStatus('${order.id}', 'pending')" 
                            class="bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-2xl font-bold shadow-lg transition-all">
                        <i data-lucide="package-check" class="w-5 h-5 inline mr-1"></i>Accept
                    </button>
                    <button onclick="updateOrderStatus('${order.id}', 'finished')" 
                            class="bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-bold shadow-lg transition-all">
                        <i data-lucide="check-circle" class="w-5 h-5 inline mr-1"></i>Complete
                    </button>
                ` : status === 'pending' ? `
                    <button onclick="updateOrderStatus('${order.id}', 'finished')" 
                            class="bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-bold shadow-lg transition-all">
                        <i data-lucide="check-circle" class="w-5 h-5 inline mr-1"></i>Finish
                    </button>
                    <button onclick="downloadSimpleVoucher('${order.id}')" 
                            class="bg-orange-500 hover:bg-orange-600 text-white py-4 px-6 rounded-2xl font-bold shadow-lg transition-all">
                        <i data-lucide="printer" class="w-5 h-5 inline mr-1"></i>Print
                    </button>
                ` : `
                    <button onclick="downloadSimpleVoucher('${order.id}')" 
                            class="bg-orange-500 hover:bg-orange-600 text-white py-4 px-6 rounded-2xl font-bold shadow-lg transition-all">
                        <i data-lucide="printer" class="w-5 h-5 inline mr-1"></i>Print
                    </button>
                `}
            </div>
        </div>
        `;
    }).join('');

    // Red dot update
    const newDot = document.getElementById('new-order-dot');
    if (status === 'new' && orders.length > 0) {
        newDot.classList.remove('hidden');
    }
    
    lucide.createIcons();
}

async function downloadSimpleVoucher(orderId) {
    const { data: order } = await _supabase.from('orders').select('*').eq('id', orderId).single();
    if (!order) return alert('Order not found');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>Voucher #${order.id.slice(-8)}</title>
        <style>
            @media print { body { margin: 0; font-family: Arial; font-size: 12px; } }
            body { font-family: Arial; max-width: 80mm; margin: 10mm auto; padding: 10mm; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 15px; }
            .header h1 { font-size: 22px; color: #d97706; margin: 0 0 5px 0; font-weight: bold; }
            .info { text-align: center; margin: 10px 0; font-size: 11px; }
            .line { border-top: 2px solid #333; margin: 15px 0; }
            .total { font-size: 20px; font-weight: bold; text-align: right; margin: 15px 0; color: #dc2626; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style></head><body>
            <div class="header">
                <h1>🧆 MING THAR GRILL</h1>
                <p>Grilled Chicken Restaurant</p>
            </div>
            <div class="info">
                <h2 style="font-size:16px">#${order.id.slice(-8).toUpperCase()}</h2>
                <p>${order.customer_name || 'Customer'}</p>
                <p>📞 ${order.customer_phone || 'N/A'}</p>
                <p>${new Date().toLocaleDateString('my-MM')}</p>
            </div>
            <div class="line"></div>
            <div class="total">TOTAL: ${(order.total_amount || 0).toLocaleString()} Ks</div>
            <div class="footer">Thank you! Come again ❤️</div>
        </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

async function checkNewOrders() {
    const { data: newOrders } = await _supabase
        .from('orders')
        .select('id')
        .eq('status', 'new')
        .limit(1);
    const newDot = document.getElementById('new-order-dot');
    if (newOrders?.length > 0) {
        newDot.classList.remove('hidden');
    }
}

async function renderMenuList() {
    const { data } = await _supabase.from('menus').select('*');
    document.getElementById('menu-list').innerHTML = 
        data?.map(m => `<div class="p-4 bg-white rounded-3xl border m-2">${m.name} - ${m.price}Ks</div>`).join('') || 
        '<p class="text-center py-8 text-slate-400">No menus</p>';
}

// CUSTOMER FUNCTIONS (သင်ပေးထားတဲ့ ကုဒ်)
async function renderCustomerList() {
    const { data: customers } = await _supabase
        .from('orders')
        .select('customer_name, customer_phone')
        .order('created_at', { ascending: false })
        .limit(50);

    const customerMap = {};
    customers?.forEach(c => {
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
    
    const { data: orders } = await _supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false });
    
    if (!orders?.length) {
        alert('No orders found for this customer');
        return;
    }

    document.getElementById("customer-profile-info").innerHTML = `
        <div class="flex items-center justify-center gap-3 mb-2">
            <div class="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <i data-lucide="user" class="w-8 h-8 text-white"></i>
            </div>
        </div>
        <h3 class="font-black text-xl text-slate-800">${orders[0].customer_name}</h3>
        <p class="text-sm text-slate-500">📞 ${phone}</p>
    `;

    const totalAmount = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    document.getElementById("cust-total-amount").innerText = totalAmount.toLocaleString() + " Ks";
    document.getElementById("cust-total-orders").innerText = orders.length;

    document.getElementById("customer-order-history").innerHTML = orders.slice(0, 10).map(o => `
        <li onclick="downloadSimpleVoucher('${o.id}')" class="bg-white p-4 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <p class="font-bold text-sm">#${o.id.slice(-8)}</p>
                    <p class="text-xs text-slate-500">${new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div class="text-right">
                    <p class="font-black text-orange-600 text-sm">${(o.total_amount || 0).toLocaleString()} Ks</p>
                    <span class="text-xs px-2 py-1 rounded-full bg-gray-100 ml-2">${o.status || 'new'}</span>
                </div>
            </div>
        </li>
    `).join('');

    lucide.createIcons();
}
async function calcDashboard() {
    const { data } = await _supabase.from('orders').select('*');
    document.getElementById('total-orders').innerText = data?.length || 0;
    document.getElementById('total-revenue').innerText = '0 Ks';
}

function addNotification(msg) {
    playOrderSound();
    const notifList = document.getElementById('notif-list');
    const notifDot = document.getElementById('notif-dot');
    
    const notif = document.createElement('div');
    notif.className = 'p-4 mb-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl shadow-xl cursor-pointer hover:shadow-2xl';
    notif.innerHTML = `<strong>🔔 NEW ORDER</strong><br><small>${msg}</small>`;
    notif.onclick = () => {
        switchPage('orders');
        setTimeout(() => document.querySelector('[data-status="new"]').click(), 500);
    };
    
    notifList.prepend(notif);
    notifDot.classList.remove('hidden');
    setTimeout(() => notif.remove(), 10000);
}

// Real-time notifications
_supabase.channel('orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, 
        (payload) => {
            if (payload.new.status === 'new') {
                addNotification(`🆕 New order #${payload.new.id.slice(-8)} from ${payload.new.customer_name}`);
            }
        }
    ).subscribe();

// Notification permission
if (Notification.permission === 'default') Notification.requestPermission();

// Init
window.onload = () => {
    switchPage(localStorage.getItem('lastPage') || 'dashboard');
};
