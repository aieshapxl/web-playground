// localStorage.clear();
const currentUser = JSON.parse(localStorage.getItem("fintrackCurrentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

const transactionKey = `fintrack_transactions_${currentUser.email}`;

const profileKey = `fintrack_profile_${currentUser.email}`;

const state = {
  transactions: JSON.parse(localStorage.getItem(transactionKey)) || [],

  profile: JSON.parse(localStorage.getItem(profileKey)) || {
    name: currentUser.name,
    currency: "INR",
  },

  theme: localStorage.getItem("fintrack_theme") || "light",
};

const elements = {
  username: document.getElementById("username"),
  balance: document.getElementById("balance"),
  income: document.getElementById("income"),
  expense: document.getElementById("expense"),
  transactionCount: document.getElementById("transactionCount"),

  transactionList: document.getElementById("transactionList"),
  search: document.getElementById("searchTransactions"),
  filter: document.getElementById("transactionFilter"),

  transactionModal: document.getElementById("transactionModal"),
  openTransaction: document.getElementById("openTransaction"),
  closeTransaction: document.getElementById("closeTransaction"),
  transactionForm: document.getElementById("transactionForm"),

  themeToggle: document.getElementById("themeToggle"),
  resetData: document.getElementById("resetData"),

  profileForm: document.getElementById("profileForm"),
  profileName: document.getElementById("profileName"),
  currency: document.getElementById("currency"),

  logoutButton: document.getElementById("logoutButton"),

  chartArea: document.getElementById("chartArea"),
};

const navItems = document.querySelectorAll(".nav-item");
const dashboardView = document.querySelector(".dashboard-view");
const settingsView = document.querySelector(".settings-view");

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

function saveTransactions() {
  localStorage.setItem(transactionKey, JSON.stringify(state.transactions));
}

function saveProfile() {
  localStorage.setItem(profileKey, JSON.stringify(state.profile));
}

function formatCurrency(amount) {
  const symbol = currencySymbols[state.profile.currency] || "₹";

  return `${symbol}${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getTotals() {
  const income = state.transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const expense = state.transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  return {
    income,
    expense,
    balance: income - expense,
  };
}

function updateDashboard() {
  const totals = getTotals();

  animateValue(elements.balance, totals.balance);
  animateValue(elements.income, totals.income);
  animateValue(elements.expense, totals.expense);

  elements.transactionCount.textContent = state.transactions.length;

  renderTransactions();
  renderChart();
}

function animateValue(element, value) {
  if (!element) {
    return;
  }

  const start = Number(element.dataset.value || 0);
  const end = Number(value);

  if (start === end) {
    element.textContent = formatCurrency(end);
    element.dataset.value = end;
    return;
  }

  const duration = 450;
  const startTime = performance.now();

  function update(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);

    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;

    element.textContent = formatCurrency(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.dataset.value = end;
    }
  }

  requestAnimationFrame(update);
}

function renderTransactions() {
  if (!elements.transactionList) {
    return;
  }

  const searchTerm = elements.search?.value.trim().toLowerCase() || "";

  const filterType = elements.filter?.value || "all";

  const filteredTransactions = state.transactions.filter((transaction) => {
    const description = String(transaction.description || "").toLowerCase();

    const category = String(transaction.category || "").toLowerCase();

    const matchesSearch =
      description.includes(searchTerm) || category.includes(searchTerm);

    const matchesFilter =
      filterType === "all" || transaction.type === filterType;

    return matchesSearch && matchesFilter;
  });

  if (!filteredTransactions.length) {
    elements.transactionList.innerHTML = `
      <div class="empty-transactions">
        ${
          state.transactions.length
            ? "no transactions match your search."
            : "no transactions yet. add your first transaction."
        }
      </div>
    `;

    return;
  }

  elements.transactionList.innerHTML = filteredTransactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((transaction) => {
      const amount =
        transaction.type === "income"
          ? `+${formatCurrency(transaction.amount)}`
          : `-${formatCurrency(transaction.amount)}`;

      return `
        <div class="transaction-row">
          <span>${formatDate(transaction.date)}</span>

          <span>
            ${escapeHTML(transaction.description)}
          </span>

          <span>
            ${capitalize(transaction.category)}
          </span>

          <span class="${transaction.type}">
            ${amount}
          </span>

          <div class="transaction-actions">
            <button
              type="button"
              class="delete-transaction"
              data-id="${transaction.id}"
              aria-label="delete transaction"
            >
              <span class="material-symbols-rounded">
                delete
              </span>
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function deleteTransaction(id) {
  const transaction = state.transactions.find((item) => item.id === id);

  if (!transaction) {
    return;
  }

  const confirmed = confirm(`delete "${transaction.description}"?`);

  if (!confirmed) {
    return;
  }

  state.transactions = state.transactions.filter((item) => item.id !== id);

  saveTransactions();
  updateDashboard();

  showToast("transaction deleted");
}

function formatDate(date) {
  if (!date) {
    return "—";
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function renderChart() {
  if (!elements.chartArea) {
    return;
  }

  if (!state.transactions.length) {
    elements.chartArea.innerHTML = `
      <div class="empty-chart">
        add transactions to see your cash flow.
      </div>
    `;

    return;
  }

  const monthlyData = getMonthlyData();

  const values = monthlyData.flatMap((month) => [month.income, month.expense]);

  const maxValue = Math.max(...values, 1);

  const incomePoints = monthlyData.map((month, index) =>
    createChartPoint(index, month.income, maxValue, monthlyData.length),
  );

  const expensePoints = monthlyData.map((month, index) =>
    createChartPoint(index, month.expense, maxValue, monthlyData.length),
  );

  elements.chartArea.innerHTML = `
    <svg
      class="cash-flow-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-label="cash flow chart"
    >
      <polyline
        points="${incomePoints.join(" ")}"
        fill="none"
        stroke="var(--income)"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />

      <polyline
        points="${expensePoints.join(" ")}"
        fill="none"
        stroke="var(--expense)"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  `;
}

function createChartPoint(index, value, max, count) {
  const x = count === 1 ? 50 : (index / (count - 1)) * 100;

  const y = 100 - (value / max) * 90;

  return `${x},${Math.max(5, y)}`;
}

function getMonthlyData() {
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();

    date.setMonth(date.getMonth() - i);

    const year = date.getFullYear();
    const month = date.getMonth();

    const monthTransactions = state.transactions.filter((transaction) => {
      const transactionDate = new Date(`${transaction.date}T00:00:00`);

      return (
        transactionDate.getFullYear() === year &&
        transactionDate.getMonth() === month
      );
    });

    months.push({
      income: monthTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((total, transaction) => total + Number(transaction.amount), 0),

      expense: monthTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((total, transaction) => total + Number(transaction.amount), 0),
    });
  }

  return months;
}

function openModal() {
  if (!elements.transactionModal) {
    return;
  }

  elements.transactionModal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  const dateInput = document.getElementById("date");

  if (dateInput && !dateInput.value) {
    dateInput.value = getToday();
  }

  requestAnimationFrame(() => {
    const modal = elements.transactionModal.querySelector(".transaction-modal");

    if (modal) {
      modal.style.animation = "modalIn 0.22s ease forwards";
    }
  });
}

function closeModal() {
  if (!elements.transactionModal) {
    return;
  }

  const modal = elements.transactionModal.querySelector(".transaction-modal");

  if (!modal) {
    elements.transactionModal.classList.add("hidden");
    document.body.style.overflow = "";
    return;
  }

  modal.style.animation = "modalOut 0.18s ease forwards";

  setTimeout(() => {
    elements.transactionModal.classList.add("hidden");

    document.body.style.overflow = "";

    modal.style.animation = "";
  }, 170);
}

function handleTransactionSubmit(event) {
  event.preventDefault();

  const type = document.getElementById("transactionType")?.value;

  const description = document.getElementById("description")?.value.trim();

  const amount = Number(document.getElementById("amount")?.value);

  const date = document.getElementById("date")?.value;

  const category = document.getElementById("category")?.value;

  if (!description || !amount || amount <= 0 || !date || !category) {
    showToast("please complete all fields", true);
    return;
  }

  const transaction = {
    id:
      crypto.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,

    type,
    description,
    amount,
    date,
    category,
  };

  state.transactions.push(transaction);

  saveTransactions();

  elements.transactionForm.reset();

  closeModal();
  updateDashboard();

  showToast(
    type === "income"
      ? "income added successfully"
      : "expense added successfully",
  );
}

function switchPage(page) {
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  if (page === "settings") {
    dashboardView?.classList.add("hidden");
    settingsView?.classList.remove("hidden");

    loadProfile();
  } else {
    settingsView?.classList.add("hidden");
    dashboardView?.classList.remove("hidden");

    updateDashboard();
  }
}

function loadProfile() {
  if (elements.profileName) {
    elements.profileName.value = state.profile.name;
  }

  if (elements.currency) {
    elements.currency.value = state.profile.currency;
  }
}

function handleProfileSubmit(event) {
  event.preventDefault();

  const name = elements.profileName.value.trim();

  const currency = elements.currency.value;

  if (!name) {
    showToast("please enter your name", true);
    return;
  }

  state.profile = {
    name,
    currency,
  };

  saveProfile();

  if (elements.username) {
    elements.username.textContent = name;
  }

  updateDashboard();

  showToast("profile updated");
}

function applyTheme() {
  const isDark = state.theme === "dark";

  document.documentElement.classList.toggle("dark-mode", isDark);

  document.body.classList.toggle("dark-mode", isDark);

  if (elements.themeToggle) {
    elements.themeToggle.checked = isDark;
  }
}

function toggleTheme() {
  state.theme = elements.themeToggle.checked ? "dark" : "light";

  localStorage.setItem("fintrack_theme", state.theme);

  applyTheme();

  renderChart();
}

function resetData() {
  if (!state.transactions.length) {
    showToast("there is no transaction data to reset", true);

    return;
  }

  const confirmed = confirm(
    "this will permanently delete all transactions. continue?",
  );

  if (!confirmed) {
    return;
  }

  state.transactions = [];

  saveTransactions();
  updateDashboard();

  showToast("all transaction data has been reset");
}

function logout() {
  const confirmed = confirm("are you sure you want to log out?");

  if (!confirmed) {
    return;
  }

  localStorage.setItem("fintrackLoggedIn", "false");
  window.location.href = "index.html";
}

function showToast(message, error = false) {
  let toast = document.querySelector(".fintrack-toast");

  if (!toast) {
    toast = document.createElement("div");

    toast.className = "fintrack-toast";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.classList.toggle("error", error);

  toast.classList.add("show");

  clearTimeout(toast.timeout);

  toast.timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function capitalize(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getToday() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    switchPage(item.dataset.page);
  });
});

elements.openTransaction?.addEventListener("click", openModal);

elements.closeTransaction?.addEventListener("click", closeModal);

elements.transactionModal?.addEventListener("click", (event) => {
  if (event.target === elements.transactionModal) {
    closeModal();
  }
});

elements.transactionForm?.addEventListener("submit", handleTransactionSubmit);

elements.search?.addEventListener("input", renderTransactions);

elements.filter?.addEventListener("change", renderTransactions);

elements.transactionList?.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-transaction");

  if (!button) {
    return;
  }

  deleteTransaction(button.dataset.id);
});

elements.themeToggle?.addEventListener("change", toggleTheme);

elements.resetData?.addEventListener("click", resetData);

elements.profileForm?.addEventListener("submit", handleProfileSubmit);

elements.logoutButton?.addEventListener("click", logout);

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    elements.transactionModal &&
    !elements.transactionModal.classList.contains("hidden")
  ) {
    closeModal();
  }
});

function initialize() {
  if (elements.username) {
    elements.username.textContent = state.profile.name;
  }

  loadProfile();
  applyTheme();
  updateDashboard();

  const dateInput = document.getElementById("date");

  if (dateInput) {
    dateInput.value = getToday();
  }
}

initialize();
