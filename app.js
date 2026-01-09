const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Supabase Client ကို တစ်ခါတည်းပဲ ဆောက်ရမယ် (Realtime config ပါပြီးသား)
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: { params: { eventsPerSecond: 10 } }
});

let notifications = []; 
let currentOrderTab = 'new';

// --- ၂။ NOTIFICATION SYSTEM ---
function addNotification(message, type) {
    const now = new Date();
    const timeString = now.getHours() + ":" + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    
    notifications.unshift({
        message: message,
        time: timeString,
        type: type,
        read: false
    });
    renderNotificationList();
}

function renderNotificationList() {
    const listContainer = document.getElementById('notification-list');
    if (!listContainer) return;
    listContainer.innerHTML = notifications.map(n => `
        <div class="p-3 border-b hover:bg-slate-50 cursor-pointer ${n.read ? 'opacity-60' : 'bg-blue-50/50'}">
            <p class="text-sm font-medium text-slate-700">${n.message}</p>
            <span class="text-[10px] text-slate-400">${n.time}</span>
        </div>
    `).join('');
}

// --- ၃။ REALTIME LISTENER (ပြင်ဆင်ပြီးသား) ---
function listenOrders() {
    console.log("Realtime စနစ် စတင်နေပြီ...");
    
    _supabase
        .channel('admin_orders_channel') 
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'orders' 
        }, (payload) => {
            console.log("အော်ဒါအသစ် ရောက်လာပြီ!", payload);

            // ၁။ အသံမြည်စေရန်
            const audio = document.getElementById('order-sound');
            if(audio) {
                audio.play().catch(err => console.log("Audio Error:", err));
            }

            // ၂။ Notification List ထဲ စာထည့်မယ်
            const msg = `${payload.new.customer_name} ထံမှ အော်ဒါအသစ် ရောက်ရှိလာပါသည်`;
            addNotification(msg, 'order');

            // ၃။ ခေါင်းလောင်းမှာ ဂဏန်းတိုးမယ်
            const dot = document.getElementById('admin-notif-count');
            if(dot) {
                let count = parseInt(dot.innerText) || 0;
                dot.innerText = count + 1;
                dot.classList.remove('hidden');
            }

            // ၄။ ဖုန်း Notification Bar မှာ စာပြရန်
            if (Notification.permission === "granted") {
                new Notification("မှာယူမှုအသစ်!", {
                    body: msg,
                    icon: 'https://cdn-icons-png.flaticon.com/512/1532/1532688.png'
                });
            }
            
            // ၅။ UI Update (အော်ဒါစာရင်းကို တန်းပြရန်)
            if(typeof renderOrders === 'function') renderOrders(currentOrderTab);
            if(typeof calcDashboard === 'function') calcDashboard();
        })
        .subscribe((status) => {
            console.log("Supabase Connection Status:", status);
        });
}

// ၃။ Page ဖွင့်တာနဲ့ စတင်အလုပ်လုပ်ခိုင်းရန်
document.addEventListener('DOMContentLoaded', () => {
    // Notification ခွင့်ပြုချက် တောင်းခြင်း
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
    
    // Realtime စောင့်ကြည့်ခြင်းကို စတင်ခြင်း
    listenOrders();
});
    

    // --- ၃။ Function ကို စတင်အလုပ်လုပ်ခိုင်းရန် (အရေးကြီးသည်) ---
    // ဒါလေးကိုပါ ထည့်မှ Page ဖွင့်တာနဲ့ Realtime စောင့်ကြည့်မှာပါ
    document.addEventListener('DOMContentLoaded', () => {
        listenOrders(); 
        
        // Browser က Notification ပြခွင့်တောင်းရန်
        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    });

    // မင်းရဲ့ တခြား Function တွေ (renderMenuList, etc...) က ဒီအောက်မှာ ဆက်ရှိနေမယ်


let currentOrderTab = 'new';

// --- ၁။ စာမျက်နှာ ထိန်းချုပ်မှု ---
function switchPage(pageId) {
    // page- ရှေ့ဆက်ပါသော ID များအားလုံးကို ဖျောက်ရန်
    document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
    
    // မှန်ကန်သော page ကို ပြရန်
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.classList.add('visible');
    }
    
    // Title ပြောင်းရန်
    const titleElement = document.getElementById('page-title');
    if (titleElement) {
        titleElement.innerText = pageId.replace('-', ' ').toUpperCase();
    }
    
    localStorage.setItem('lastPage', pageId);

    // Data များ ဆွဲတင်ရန်
    if (pageId === 'dashboard') calcDashboard();
    if (pageId === 'menu') renderMenuList();
    if (pageId === 'customers') renderCustomerList();
    if (pageId === 'orders') setOrderStatusTab(currentOrderTab); 
}


// --- ၂။ IMAGE UPLOAD LOGIC ---
async function uploadImage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await _supabase.storage
        .from('menus')
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
            <img src="${m.image_url ? m.image_url : 'https://via.placeholder.com/150?text=No+Image'}" 
     class="w-20 h-20 rounded-2xl object-cover bg-slate-100 shadow-inner"
     onerror="this.src='https://via.placeholder.com/150?text=Error'">
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

// အပေါ်က config တွေ အဟောင်းအတိုင်းထားပါ...
async function renderOrders(statusTab) {
    const container = document.getElementById('order-cards'); // HTML ထဲက id နဲ့ ကိုက်ရပါမယ်
    if (!container) return;

    container.innerHTML = `<p class="text-center py-10 opacity-50">Loading orders...</p>`;

    const { data: orders, error } = await _supabase
        .from('orders')
        .select(`
            *,
            customer_users (
                is_trusted,
                is_blocked,
                order_count
            ),
            order_items (
                quantity,
                price_at_time,
                menus ( name )
            )
        `)
        .eq('status', statusTab)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        return;
    }

    if (orders.length === 0) {
        container.innerHTML = `<p class="text-center py-10 opacity-50">ယခုအချိန်တွင် ${statusTab} အော်ဒါမရှိသေးပါ။</p>`;
        return;
    }

    container.innerHTML = orders.map(order => {
        // Customer Status ကို Badge လေးနဲ့ ပြမယ်
        let trustBadge = '';
        const user = order.customer_users;
        
        if (user?.is_blocked) {
            trustBadge = `<span class="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded-md font-bold">BLOCKED 🚫</span>`;
        } else if (user?.is_trusted) {
            trustBadge = `<span class="bg-green-100 text-green-600 text-[10px] px-2 py-1 rounded-md font-bold">TRUSTED ✅</span>`;
        } else if (user?.order_count > 0) {
            trustBadge = `<span class="bg-blue-100 text-blue-600 text-[10px] px-2 py-1 rounded-md font-bold">OLD (${user.order_count})</span>`;
        } else {
            trustBadge = `<span class="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-md font-bold">NEW CUSTOMER 🆕</span>`;
        }

        const itemsHtml = order.order_items.map(item => `
            <div class="flex justify-between text-sm mb-1">
                <span>${item.menus?.name || 'Unknown'} x ${item.quantity}</span>
                <span class="font-bold">${(item.price_at_time * item.quantity).toLocaleString()} MMK</span>
            </div>
        `).join('');

        return `
        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 mb-4">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-black text-lg">${order.customer_name}</h4>
                    <p class="text-xs text-slate-400">${order.customer_phone}</p>
                    <div class="mt-2">${trustBadge}</div>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</p>
                    <p class="text-xl font-black text-orange-600">${order.total_amount.toLocaleString()} Ks</p>
                </div>
            </div>

            <div class="py-3 border-y border-dashed border-slate-200">
                ${itemsHtml}
            </div>

            <div class="flex justify-between items-center text-xs text-slate-500">
                <p>📅 ${order.pickup_date} | ⏰ ${order.pickup_time}</p>
            </div>

            <div class="flex gap-2 pt-2">
                ${order.status === 'new' ? `
                    <button onclick="updateStatus('${order.id}', 'pending')" class="flex-1 bg-orange-500 text-white font-bold py-3 rounded-2xl hover:bg-orange-600 transition">Accept Order</button>
                    <button onclick="updateStatus('${order.id}', 'rejected')" class="px-4 bg-slate-100 text-slate-400 font-bold py-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition">Reject</button>
                ` : ''}
                ${order.status === 'pending' ? `
                    <button onclick="updateStatus('${order.id}', 'finished')" class="flex-1 bg-green-500 text-white font-bold py-3 rounded-2xl">Mark as Done</button>
                ` : ''}
            </div>
        </div>`;
    }).join('');
}

// Status ပြောင်းလဲရန် function
async function updateStatus(orderId, newStatus) {
    const { error } = await _supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) return alert(error.message);
    
    // Status အောင်မြင်စွာ ပြောင်းပြီးပါက UI ကို Refresh လုပ်မည်
    renderOrders(currentOrderTab); 
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
    const { data: o } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('id', id)
        .single();
    
    if (!o) return;

    // Voucher ပုံစံ HTML တစ်ခု ယာယီဖန်တီးမယ်
    const vContainer = document.createElement('div');
    vContainer.id = "temp-voucher";
    vContainer.style = "width: 350px; padding: 20px; background: white; color: black; font-family: 'Pyidaungsu', sans-serif; position: fixed; top: 0; left: -1000px;";
    
    vContainer.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px;">
            <h2 style="margin: 0;">မြင်သာကြက်ကင်</h2>
            <p style="font-size: 12px; margin: 5px 0;">အော်ဒါအမှတ်: #${o.id.slice(0,8)}</p>
        </div>
        <div style="margin: 15px 0; font-size: 14px;">
            <p><b>ဝယ်သူ:</b> ${o.customer_name}</p>
            <p><b>ဖုန်း:</b> ${o.customer_phone}</p>
            <p><b>နေ့စွဲ:</b> ${new Date(o.created_at).toLocaleString()}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #ddd;">
                <th align="left">ဟင်းပွဲ</th>
                <th align="right">စျေးနှုန်း</th>
            </tr>
            ${o.order_items.map(i => `
                <tr>
                    <td style="padding: 5px 0;">${i.menus.name} x ${i.quantity}</td>
                    <td align="right">${(i.price_at_time * i.quantity).toLocaleString()} Ks</td>
                </tr>
            `).join('')}
        </table>
        <div style="text-align: right; border-top: 2px solid #000; margin-top: 10px; padding-top: 10px;">
            <h3 style="margin: 0;">စုစုပေါင်း: ${o.total_amount.toLocaleString()} Ks</h3>
        </div>
        <p style="text-align: center; font-size: 12px; margin-top: 20px;">ကျေးဇူးတင်ပါသည်</p>
    `;
    
    document.body.appendChild(vContainer);

    // HTML ကို ပုံအဖြစ် ပြောင်းပြီး Print ထုတ်မယ်
    html2canvas(vContainer).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<img src="${imgData}" style="width:100%;">`);
        printWindow.document.close();
        printWindow.print();
        document.body.removeChild(vContainer);
    });
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

function addNotification(message, type) {
    const now = new Date();
    const timeString = now.getHours() + ":" + now.getMinutes();
    
    // Notification အသစ်ကို array ထဲ ထည့်မယ်
    notifications.unshift({
        message: message,
        time: timeString,
        type: type,
        read: false
    });

    // ခေါင်းလောင်း UI ကို update လုပ်မယ်
    renderNotificationList();
}

// ခေါင်းလောင်းထဲက စာရင်းကို ဆွဲထုတ်ပြမယ့် function
function renderNotificationList() {
    const listContainer = document.getElementById('notification-list'); // ဒါက မင်းရဲ့ HTML ထဲက notification ပြမယ့် နေရာ ID ဖြစ်ရမယ်
    if (!listContainer) return;

    listContainer.innerHTML = notifications.map(n => `
        <div class="p-3 border-b hover:bg-slate-50 cursor-pointer ${n.read ? 'opacity-60' : 'bg-blue-50/50'}">
            <p class="text-sm font-medium text-slate-700">${n.message}</p>
            <span class="text-[10px] text-slate-400">${n.time}</span>
        </div>
    `).join('');
}


// Notification Permission Request
if (Notification.permission === 'default') Notification.requestPermission();

// INIT
window.onload = () => {
    const lastPage = localStorage.getItem('lastPage') || 'dashboard';
    
    // အခြေခံ အချက်အလက်များ အရင်တွက်မည်
    calcDashboard();
    
    // လက်ရှိ Page ကို ဖွင့်မည်
    switchPage(lastPage);

    // အကယ်၍ Order Page ရောက်နေရင် data ဆွဲထုတ်ရန် ခေါ်လိုက်ခြင်း
    if (lastPage === 'orders') {
        setOrderStatusTab(currentOrderTab); 
    }
};

        
