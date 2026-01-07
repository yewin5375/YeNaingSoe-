const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- ၁။ စာမျက်နှာ ကူးပြောင်းခြင်း ---
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('visible');
    
    document.getElementById('page-title').innerText = pageId.replace('-', ' ').toUpperCase();
    localStorage.setItem('lastPage', pageId);

    // Sidebar ပိတ်ရန်
    const sb = document.getElementById('sidebar');
    if (!sb.classList.contains('closed')) toggleSidebar();

    // Data Load လုပ်ရန်
    if (pageId === 'dashboard') calcDashboard();
    if (pageId === 'menu') renderMenuList();
    if (pageId === 'customers') renderCustomerList();
    if (pageId === 'orders') {
        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-status') || 'new';
        renderOrderCards(activeTab);
    }
}

// --- ၂။ NOTIFICATION SYSTEM (အသစ်) ---
function addNotification(msg, type = 'order') {
    const dot = document.getElementById('notif-dot');
    const list = document.getElementById('notif-list');
    
    // အနီစက်ပြရန်
    dot.classList.remove('hidden');

    // စာရင်းထဲထည့်ရန် (နှိပ်ရင် သက်ဆိုင်ရာ Page ကိုသွားဖို့ onclick ပါတယ်)
    const newNotif = document.createElement('div');
    newNotif.className = "p-3 mb-2 rounded-xl text-xs cursor-pointer transition active:scale-95 " + 
                        (type === 'order' ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-red-50 text-red-600 border border-red-100");
    
    newNotif.innerHTML = `<b>${type === 'order' ? '🔔 New Order' : '⚠️ Stock Alert'}</b><br>${msg}`;
    
    // နှိပ်လိုက်ရင် လုပ်ဆောင်မည့်အချက်
    newNotif.onclick = () => {
        if(type === 'order') {
            switchPage('orders');
            setOrderStatusTab('new');
        } else {
            switchPage('menu');
        }
        toggleNotif(); // Dropdown ပိတ်ရန်
    };

    // အပေါ်ဆုံးကနေ စာရင်းသွင်းရန်
    if (list.querySelector('p')) list.innerHTML = ''; // "သတိပေးချက်မရှိ" စာသားဖျက်ရန်
    list.insertBefore(newNotif, list.firstChild);
}

// ခေါင်းလောင်းနှိပ်ရင် အနီစက်ဖျောက်ရန်
function toggleNotif() {
    const drop = document.getElementById('notif-dropdown');
    drop.classList.toggle('hidden');
    if (drop.classList.contains('hidden')) {
        // ဖတ်ပြီးသားဖြစ်သွားလို့ အနီစက်ဖျောက်မယ်
        document.getElementById('notif-dot').classList.add('hidden');
    }
}

// --- ၃။ Real-time Order Listener ---
_supabase.channel('orders')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
    // ၁။ အသံပေးရန်
    const sound = document.getElementById('order-sound');
    if(sound) sound.play().catch(e => console.log("Sound blocked by browser"));

    // ၂။ Notification ထဲစာထည့်ရန်
    addNotification(`Order from ${payload.new.customer_name} (${payload.new.total_amount} Ks)`);

    // ၃။ လက်ရှိ Page က Dashboard သို့မဟုတ် Orders ဆိုရင် data ချက်ချင်း update လုပ်ရန်
    const lastP = localStorage.getItem('lastPage');
    if(lastP === 'dashboard') calcDashboard();
    if(lastP === 'orders') renderOrderCards('new');
  })
  .subscribe();

// --- ၄။ ORDERS & STATUS LOGIC ---
async function renderOrderCards(status) {
    const container = document.getElementById("order-cards");
    container.innerHTML = `<div class="text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div></div>`;

    const { data: orders } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (!orders || orders.length === 0) {
        container.innerHTML = "<p class='text-center py-20 text-slate-300 italic'>အော်ဒါမရှိသေးပါ</p>";
        return;
    }

    container.innerHTML = orders.map(o => `
        <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-4">
            <div class="flex justify-between items-start mb-3">
                <div onclick="viewCustomerDetail('${o.customer_phone}')">
                    <h4 class="font-bold text-lg text-slate-800">${o.customer_name}</h4>
                    <p class="text-xs text-slate-400">📞 ${o.customer_phone}</p>
                </div>
                <div class="text-right font-black text-orange-500">${o.total_amount.toLocaleString()} Ks</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-2xl mb-3 text-[11px] text-slate-600">
                ${o.order_items.map(i => `• ${i.menus?.name} (x${i.quantity})`).join('<br>')}
            </div>
            <div class="flex gap-2">
                ${status === 'new' ? `<button onclick="updateStatus('${o.id}', 'pending')" class="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition">Accept</button>` : ''}
                ${status === 'pending' ? `<button onclick="updateStatus('${o.id}', 'finished')" class="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition">Finish</button>` : ''}
                <button onclick="downloadVoucher('${o.id}')" class="bg-slate-100 p-3 rounded-xl active:bg-slate-200 transition"><i data-lucide="printer" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

async function setOrderStatusTab(status) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-status') === status);
    });
    await renderOrderCards(status);
}

async function updateStatus(id, nextStatus) {
    await _supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    const currentTab = document.querySelector('.tab-btn.active').getAttribute('data-status');
    renderOrderCards(currentTab);
    calcDashboard();
}

// --- ၅။ DASHBOARD & OTHERS ---
async function calcDashboard() {
    const { data: orders } = await _supabase.from('orders').select('*');
    if(!orders) return;
    document.getElementById('total-orders').innerText = orders.length;
    document.getElementById('total-revenue').innerText = orders.reduce((s,o) => s + o.total_amount, 0).toLocaleString() + " Ks";
    
    // Recent Orders List
    const { data: recent } = await _supabase.from('orders').select('*').order('created_at', {ascending: false}).limit(5);
    document.getElementById('dash-recent-orders').innerHTML = recent.map(o => `
        <li class="flex justify-between items-center bg-white p-3 rounded-2xl border mb-2 shadow-sm text-xs">
            <span class="font-bold">${o.customer_name}</span>
            <span class="text-orange-500 font-bold">${o.total_amount.toLocaleString()} Ks</span>
        </li>`).join('');

    checkStockAlerts();
}

async function checkStockAlerts() {
    const { data: items } = await _supabase.from('menus').select('name, stock').lt('stock', 5);
    if(items && items.length > 0) {
        items.forEach(m => addNotification(`${m.name} က လက်ကျန် ${m.stock} ခုပဲ ကျန်ပါတော့တယ်`, 'stock'));
    }
}

// --- INIT LOAD ---
window.onload = () => {
    const savedPage = localStorage.getItem('lastPage') || 'dashboard';
    switchPage(savedPage);
};

