// --- Supabase Configuration ---
const SUPABASE_URL = 'https://rvqkolgbykgsqjupmedf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cWtvbGdieWtnc3FqdXBtZWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDcyNTAsImV4cCI6MjA4MzI4MzI1MH0.fqxJ9aHAHmySpmTaJ-tpfeEsE7IFBr-JkYIdAQCLjQs';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Global Variables ---
let currentOrders = [];
let currentMenus = [];

// --- 1. Page Switching Logic ---
const sidebarItems = document.querySelectorAll(".sidebar li");
const pages = document.querySelectorAll(".page");
const pageTitle = document.getElementById("page-title");

sidebarItems.forEach(li => {
    li.addEventListener("click", () => {
        sidebarItems.forEach(i => i.classList.remove("active"));
        li.classList.add("active");

        const page = li.getAttribute("data-page");
        pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);

        pages.forEach(p => p.classList.remove("visible"));
        document.getElementById("page-" + page).classList.add("visible");
        
        // Page ပြောင်းတိုင်း Data Refresh လုပ်ရန်
        refreshPageData(page);
    });
});

async function refreshPageData(page) {
    if (page === 'dashboard') calcDashboard();
    if (page === 'orders') {
        const activeTab = document.querySelector(".tab-btn.active").getAttribute("data-status");
        renderOrderCards(activeStatus);
    }
    if (page === 'menu') renderMenuList();
    if (page === 'customers') renderCustomerList();
}

// --- 2. Dashboard Logic ---
async function calcDashboard() {
    const { data: allOrders } = await _supabase.from('orders').select('*');
    const { count: menuCount } = await _supabase.from('menus').select('*', { count: 'exact', head: true });
    
    if (!allOrders) return;

    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const uniqueCustomers = [...new Set(allOrders.map(o => o.customer_phone))].length;

    document.getElementById("total-orders").textContent = totalOrders;
    document.getElementById("total-revenue").textContent = totalRevenue.toLocaleString() + " Ks";
    document.getElementById("total-customers").textContent = uniqueCustomers;
    document.getElementById("total-menu").textContent = menuCount;

    // Dashboard Lists
    const dashNew = document.getElementById("dash-new-orders");
    const dashPending = document.getElementById("dash-pending-orders");
    const dashRecent = document.getElementById("dash-recent-orders");

    dashNew.innerHTML = allOrders.filter(o => o.status === 'new').map(o => `<li>#${o.id.slice(0,5)} - ${o.customer_name} (${o.total_amount} Ks)</li>`).join('');
    dashPending.innerHTML = allOrders.filter(o => o.status === 'pending').map(o => `<li>#${o.id.slice(0,5)} - ${o.customer_name} (${o.total_amount} Ks)</li>`).join('');
    
    dashRecent.innerHTML = allOrders.slice(-5).reverse().map(o => `<li>#${o.id.slice(0,5)} - ${o.customer_name} - ${o.status}</li>`).join('');
}

// --- 3. Orders Logic (Tabs & Cards) ---
const tabButtons = document.querySelectorAll(".tab-btn");
tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        tabButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderOrderCards(btn.getAttribute("data-status"));
    });
});

async function renderOrderCards(status) {
    const container = document.getElementById("order-cards");
    container.innerHTML = "<p>Loading...</p>";

    const { data: orders, error } = await _supabase
        .from('orders')
        .select('*, order_items(*, menus(*))')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error) return;

    container.innerHTML = orders.map(o => `
        <div class="card order-card">
            <strong>Order #${o.id.slice(0,5)}</strong><br/>
            <b>${o.customer_name}</b><br/>
            ${o.total_amount.toLocaleString()} Ks<br/>
            <div class="items-list" style="font-size: 0.8em; color: #666; margin: 5px 0;">
                ${o.order_items.map(i => `- ${i.menus?.name} (x${i.quantity})`).join('<br>')}
            </div>
            <div style="margin-top:10px;">
                ${o.status === 'new' ? `<button onclick="updateStatus('${o.id}', 'pending')">Accept</button>` : ''}
                ${o.status === 'pending' ? `<button onclick="updateStatus('${o.id}', 'finished')">Finish</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function updateStatus(id, nextStatus) {
    await _supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    const currentTab = document.querySelector(".tab-btn.active").getAttribute("data-status");
    renderOrderCards(currentTab);
    calcDashboard();
}

// --- 4. Menu Logic ---
const menuForm = document.getElementById("menu-form");
menuForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("menu-id").value;
    const name = document.getElementById("menu-name").value;
    const price = Number(document.getElementById("menu-price").value);
    // Note: Image upload to Supabase Storage needs extra code, 
    // for now we'll use a placeholder or previous URL
    
    const menuData = { name, price };

    if (id) {
        await _supabase.from('menus').update(menuData).eq('id', id);
    } else {
        await _supabase.from('menus').insert([menuData]);
    }

    menuForm.reset();
    document.getElementById("menu-id").value = "";
    renderMenuList();
});

async function renderMenuList() {
    const { data: menus } = await _supabase.from('menus').select('*').order('name');
    const container = document.getElementById("menu-list");
    container.innerHTML = menus.map(m => `
        <div class="menu-item card">
            <img class="menu-thumb" src="${m.image_url || 'https://via.placeholder.com/50'}" width="50" />
            <div class="menu-info">
                <strong>${m.name}</strong><br/>
                ${m.price} Ks
            </div>
            <div class="menu-actions">
                <button onclick="editMenu('${m.id}', '${m.name}', ${m.price})">Edit</button>
                <button onclick="deleteMenu('${m.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function editMenu(id, name, price) {
    document.getElementById("menu-id").value = id;
    document.getElementById("menu-name").value = name;
    document.getElementById("menu-price").value = price;
}

async function deleteMenu(id) {
    if(confirm('Are you sure?')) {
        await _supabase.from('menus').delete().eq('id', id);
        renderMenuList();
    }
}

// --- 5. Customer Logic ---
async function renderCustomerList() {
    const { data: orders } = await _supabase.from('orders').select('customer_name, customer_phone');
    const container = document.getElementById("customer-list");
    
    // Unique customers by phone
    const uniqueCustomers = [];
    const map = new Map();
    for (const item of orders) {
        if(!map.has(item.customer_phone)){
            map.set(item.customer_phone, true);
            uniqueCustomers.push(item);
        }
    }

    container.innerHTML = uniqueCustomers.map(c => `
        <li onclick="showCustomerDetail('${c.customer_phone}', '${c.customer_name}')">
            ${c.customer_name} (${c.customer_phone})
        </li>
    `).join('');
}

async function showCustomerDetail(phone, name) {
    document.getElementById("customer-profile").innerHTML = `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
    `;

    const { data: history } = await _supabase.from('orders').select('*').eq('customer_phone', phone);
    document.getElementById("customer-orders").innerHTML = history.map(o => `
        <li>Order #${o.id.slice(0,5)} - ${o.total_amount} Ks - ${o.status}</li>
    `).join('');
}

// --- 6. Notification & Real-time ---
_supabase.channel('admin-updates')
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
    // Play sound
    new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play();
    // Show dot
    document.getElementById("notif-dot").classList.remove("hidden");
    // Refresh stats
    calcDashboard();
});

// --- Init ---
function init() {
    calcDashboard();
    renderOrderCards("new");
    renderMenuList();
    renderCustomerList();
}

init();

