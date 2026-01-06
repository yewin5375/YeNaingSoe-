// Fake data
let orders = [
  { id: 1, customerId: 1, customerName: "Mg Mg", status: "new", total: 12000, items: ["Fried Rice", "Coke"], createdAt: "2026-01-01 10:00" },
  { id: 2, customerId: 2, customerName: "Aye Aye", status: "pending", total: 8000, items: ["Burger"], createdAt: "2026-01-02 09:30" },
  { id: 3, customerId: 1, customerName: "Mg Mg", status: "finished", total: 15000, items: ["Pizza"], createdAt: "2026-01-02 11:00" }
];

let menus = [
  { id: 1, name: "Fried Rice", price: 4000, stock: 10, img: "" },
  { id: 2, name: "Burger", price: 3000, stock: 8, img: "" }
];

let customers = [
  { id: 1, name: "Mg Mg", phone: "091234567", vouchers: ["DISC10"] },
  { id: 2, name: "Aye Aye", phone: "098765432", vouchers: [] }
];

let notifications = [
  { id: 1, text: "New order from Mg Mg (Order #1)", page: "orders" },
  { id: 2, text: "New order from Aye Aye (Order #2)", page: "orders" }
];

// Page switching
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
  });
});

// Dashboard data
function calcDashboard() {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const uniqueCustomerIds = [...new Set(orders.map(o => o.customerId))];

  document.getElementById("total-orders").textContent = totalOrders;
  document.getElementById("total-revenue").textContent = totalRevenue + " Ks";
  document.getElementById("total-customers").textContent = uniqueCustomerIds.length;
  document.getElementById("total-menu").textContent = menus.length;

  const dashNew = document.getElementById("dash-new-orders");
  const dashPending = document.getElementById("dash-pending-orders");
  const dashRecent = document.getElementById("dash-recent-orders");
  dashNew.innerHTML = "";
  dashPending.innerHTML = "";
  dashRecent.innerHTML = "";

  orders.filter(o => o.status === "new").forEach(o => {
    const li = document.createElement("li");
    li.textContent = "#" + o.id + " - " + o.customerName + " (" + o.total + " Ks)";
    dashNew.appendChild(li);
  });

  orders.filter(o => o.status === "pending").forEach(o => {
    const li = document.createElement("li");
    li.textContent = "#" + o.id + " - " + o.customerName + " (" + o.total + " Ks)";
    dashPending.appendChild(li);
  });

  orders
    .slice()
    .sort((a, b) => b.id - a.id)
    .forEach(o => {
      const li = document.createElement("li");
      li.textContent = "#" + o.id + " - " + o.customerName + " - " + o.status;
      dashRecent.appendChild(li);
    });
}

// Orders page (tabs + order cards + deep link)
const tabButtons = document.querySelectorAll(".tab-btn");
const orderCardsContainer = document.getElementById("order-cards");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderOrderCards(btn.getAttribute("data-status"));
  });
});

function renderOrderCards(status) {
  orderCardsContainer.innerHTML = "";
  orders
    .filter(o => o.status === status)
    .forEach(o => {
      const div = document.createElement("div");
      div.className = "order-card";
      div.innerHTML = `
        <strong>Order #${o.id}</strong><br/>
        ${o.customerName}<br/>
        ${o.total} Ks<br/>
        Status: ${o.status}
      `;
      // deep link: click card -> open customer page + profile
      div.addEventListener("click", () => openCustomerFromOrder(o.customerId));
      orderCardsContainer.appendChild(div);
    });
}

// Menu page (add / edit / delete)
const menuForm = document.getElementById("menu-form");
const menuList = document.getElementById("menu-list");
const menuIdInput = document.getElementById("menu-id");
const menuNameInput = document.getElementById("menu-name");
const menuPriceInput = document.getElementById("menu-price");
const menuStockInput = document.getElementById("menu-stock");
const menuImageInput = document.getElementById("menu-image");

menuForm.addEventListener("submit", e => {
  e.preventDefault();
  const id = menuIdInput.value;
  const name = menuNameInput.value;
  const price = Number(menuPriceInput.value);
  const stock = Number(menuStockInput.value);

  const imgFile = menuImageInput.files[0];
  if (imgFile) {
    const reader = new FileReader();
    reader.onload = function (evt) {
      saveMenu(id, name, price, stock, evt.target.result);
    };
    reader.readAsDataURL(imgFile);
  } else {
    saveMenu(id, name, price, stock, "");
  }
});

function saveMenu(id, name, price, stock, img) {
  if (id) {
    const menu = menus.find(m => m.id === Number(id));
    if (menu) {
      menu.name = name;
      menu.price = price;
      menu.stock = stock;
      if (img) menu.img = img;
    }
  } else {
    const newId = menus.length ? Math.max(...menus.map(m => m.id)) + 1 : 1;
    menus.push({ id: newId, name, price, stock, img });
  }

  menuForm.reset();
  menuIdInput.value = "";
  renderMenuList();
  calcDashboard();
}

function renderMenuList() {
  menuList.innerHTML = "";
  menus.forEach(m => {
    const div = document.createElement("div");
    div.className = "menu-item";
    div.innerHTML = `
      <img class="menu-thumb" src="${m.img || ""}" alt="" />
      <div class="menu-info">
        <strong>${m.name}</strong><br/>
        ${m.price} Ks<br/>
        Stock: ${m.stock}
      </div>
      <div class="menu-actions">
        <button data-action="edit">Edit</button>
        <button data-action="delete">Delete</button>
      </div>
    `;
    const editBtn = div.querySelector('[data-action="edit"]');
    const delBtn = div.querySelector('[data-action="delete"]');

    editBtn.addEventListener("click", () => {
      menuIdInput.value = m.id;
      menuNameInput.value = m.name;
      menuPriceInput.value = m.price;
      menuStockInput.value = m.stock;
      // image not refilled for security reasons
    });

    delBtn.addEventListener("click", () => {
      menus = menus.filter(x => x.id !== m.id);
      renderMenuList();
      calcDashboard();
    });

    menuList.appendChild(div);
  });
}

// Customers page (list + profile + history + voucher)
const customerListEl = document.getElementById("customer-list");
const customerProfileEl = document.getElementById("customer-profile");
const customerOrdersEl = document.getElementById("customer-orders");
const customerVouchersEl = document.getElementById("customer-vouchers");

function renderCustomerList() {
  customerListEl.innerHTML = "";
  customers.forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.name + " (" + c.phone + ")";
    li.addEventListener("click", () => showCustomerDetail(c.id));
    customerListEl.appendChild(li);
  });
}

function showCustomerDetail(customerId) {
  const c = customers.find(x => x.id === customerId);
  if (!c) return;

  customerProfileEl.innerHTML = `
    <p><strong>Name:</strong> ${c.name}</p>
    <p><strong>Phone:</strong> ${c.phone}</p>
  `;

  customerOrdersEl.innerHTML = "";
  orders
    .filter(o => o.customerId === customerId)
    .forEach(o => {
      const li = document.createElement("li");
      li.textContent = `Order #${o.id} - ${o.total} Ks - ${o.status}`;
      customerOrdersEl.appendChild(li);
    });

  customerVouchersEl.innerHTML = "";
  if (!c.vouchers.length) {
    const li = document.createElement("li");
    li.textContent = "No vouchers";
    customerVouchersEl.appendChild(li);
  } else {
    c.vouchers.forEach(v => {
      const li = document.createElement("li");
      li.textContent = v;
      customerVouchersEl.appendChild(li);
    });
  }
}

function openCustomerFromOrder(customerId) {
  // switch to customer page
  sidebarItems.forEach(i => i.classList.remove("active"));
  document.querySelector('.sidebar li[data-page="customers"]').classList.add("active");

  pages.forEach(p => p.classList.remove("visible"));
  document.getElementById("page-customers").classList.add("visible");
  pageTitle.textContent = "Customers";

  showCustomerDetail(customerId);
}

// Notification system (red dot + dropdown + deep link)
const notifBtn = document.getElementById("notif-btn");
const notifDot = document.getElementById("notif-dot");
const notifDropdown = document.getElementById("notif-dropdown");

function renderNotifications() {
  notifDropdown.innerHTML = "";
  if (!notifications.length) {
    notifDropdown.innerHTML = "<p style='font-size:13px;'>No notifications</p>";
    notifDot.classList.add("hidden");
    return;
  }

  notifDot.classList.remove("hidden");
  notifications.forEach(n => {
    const div = document.createElement("div");
    div.className = "notif-item";
    div.textContent = n.text;
    div.addEventListener("click", () => {
      // open relevant page
      const li = document.querySelector(`.sidebar li[data-page="${n.page}"]`);
      if (li) li.click();
      notifDropdown.classList.add("hidden");
    });
    notifDropdown.appendChild(div);
  });
}

notifBtn.addEventListener("click", () => {
  notifDropdown.classList.toggle("hidden");
  // red dot remove when open
  notifDot.classList.add("hidden");
});

// Init
calcDashboard();
renderOrderCards("new");
renderMenuList();
renderCustomerList();
renderNotifications();
