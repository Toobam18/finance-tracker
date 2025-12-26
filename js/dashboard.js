// ============================================
// Dashboard Logic
// ============================================

(function () {
  const $ = (id) => document.getElementById(id);

  function formatMoney(num) {
    return `$${Number(num || 0).toFixed(2)}`;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function currentMonthISO() {
    return new Date().toISOString().slice(0, 7);
  }

  function monthStartEnd(month) {
    const [y, m] = month.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    // Handle December -> January of next year
    const endYear = m === 12 ? y + 1 : y;
    const endMonth = m === 12 ? 1 : m + 1;
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
    return { start, end };
  }

  // STATE
  let sessionUser = null;
  let editingTxId = null;
  let chartInstance = null;
  let transactions = [];
  let budgets = [];
  let recurringRules = [];

  // AUTH
  async function requireAuth() {
    if (!supabase) {
      console.error("Supabase not loaded");
      window.location.replace("login.html");
      return null;
    }
    const user = await getSessionUser();
    if (!user) {
      window.location.replace("login.html");
      return null;
    }
    return user;
  }

  // DATABASE OPERATIONS
  async function fetchTransactions(month) {
    const { start, end } = monthStartEnd(month);
    console.log("Fetching transactions for:", start, "to", end);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false });
    
    if (error) {
      console.error("Fetch transactions error:", error);
      throw error;
    }
    console.log("Transactions fetched:", data?.length || 0);
    return data || [];
  }

  async function createTransaction(tx) {
    tx.user_id = sessionUser.id;
    console.log("Creating transaction:", tx);
    const { data, error } = await supabase
      .from("transactions")
      .insert(tx)
      .select()
      .single();
    
    if (error) {
      console.error("Create transaction error:", error);
      throw error;
    }
    console.log("Transaction created:", data);
    return data;
  }

  async function updateTransaction(id, updates) {
    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async function deleteTransaction(id) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  async function clearAllTransactions() {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("user_id", sessionUser.id);
    if (error) throw error;
  }

  async function fetchBudgets() {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .order("category");
    if (error) {
      console.error("Fetch budgets error:", error);
      throw error;
    }
    return data || [];
  }

  async function upsertBudget(category, amount) {
    const { data, error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: sessionUser.id, category, monthly_amount: amount },
        { onConflict: "user_id,category" }
      )
      .select();
    if (error) throw error;
    return data;
  }

  async function deleteBudget(id) {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw error;
  }

  async function fetchRecurringRules() {
    const { data, error } = await supabase
      .from("recurring_rules")
      .select("*")
      .order("day");
    if (error) {
      console.error("Fetch recurring error:", error);
      throw error;
    }
    return data || [];
  }

  async function createRecurringRule(rule) {
    rule.user_id = sessionUser.id;
    const { data, error } = await supabase
      .from("recurring_rules")
      .insert(rule)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteRecurringRule(id) {
    const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
    if (error) throw error;
  }

  async function ensureRecurringTransactions(month) {
    if (!recurringRules.length) return;
    const { start, end } = monthStartEnd(month);
    const [year, mon] = month.split("-");

    for (const rule of recurringRules) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("recurring_id", rule.id)
        .gte("date", start)
        .lt("date", end)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const day = Math.min(28, Math.max(1, rule.day));
      const date = `${year}-${mon}-${String(day).padStart(2, "0")}`;

      await createTransaction({
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        date,
        description: `${rule.name} (Auto)`,
        recurring_id: rule.id
      });
    }
  }

  // RENDERING
  function renderTotals() {
    const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    $("totalIncome").textContent = formatMoney(income);
    $("totalExpenses").textContent = formatMoney(expenses);
    $("netBalance").textContent = formatMoney(income - expenses);
  }

  function renderTransactionsTable() {
    const tbody = document.querySelector("#transactionsTable tbody");
    tbody.innerHTML = "";

    if (!transactions.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">No transactions this month</td></tr>`;
      return;
    }

    transactions.forEach(tx => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${tx.date}</td>
        <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
        <td>${formatMoney(tx.amount)}</td>
        <td>${tx.category}</td>
        <td>${tx.description || "—"}</td>
        <td class="actions">
          <button type="button" class="btn-icon" data-action="edit" data-id="${tx.id}">✎</button>
          <button type="button" class="btn-icon btn-delete" data-action="delete" data-id="${tx.id}">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Event delegation for buttons
    tbody.onclick = async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === "edit") {
        const tx = transactions.find(t => t.id === id);
        if (tx) enterEditMode(tx);
      } else if (action === "delete") {
        if (!confirm("Delete this transaction?")) return;
        try {
          await deleteTransaction(id);
          showToast("Deleted", "success");
          if (editingTxId === id) exitEditMode();
          await reloadData();
        } catch (err) {
          showToast(err.message, "error");
        }
      }
    };
  }

  function renderBudgetsTable() {
    const tbody = document.querySelector("#budgetsTable tbody");
    tbody.innerHTML = "";

    if (!budgets.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">No budgets</td></tr>`;
      return;
    }

    const spent = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      spent[t.category] = (spent[t.category] || 0) + Number(t.amount);
    });

    budgets.forEach(b => {
      const catSpent = spent[b.category] || 0;
      const pct = b.monthly_amount > 0 ? (catSpent / b.monthly_amount) * 100 : 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.category}</td>
        <td>${formatMoney(b.monthly_amount)}</td>
        <td><span class="${catSpent > b.monthly_amount ? "over-budget" : ""}">${formatMoney(catSpent)} (${pct.toFixed(0)}%)</span></td>
        <td><button type="button" class="btn-icon btn-delete" data-id="${b.id}">✕</button></td>
      `;
      tr.querySelector(".btn-delete").onclick = async () => {
        if (!confirm("Delete budget?")) return;
        try {
          await deleteBudget(b.id);
          showToast("Deleted", "success");
          await reloadData();
        } catch (err) { showToast(err.message, "error"); }
      };
      tbody.appendChild(tr);
    });
  }

  function renderBudgetWarnings() {
    const container = $("budgetWarnings");
    container.innerHTML = "";
    const spent = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      spent[t.category] = (spent[t.category] || 0) + Number(t.amount);
    });
    const warnings = budgets.filter(b => (spent[b.category] || 0) > b.monthly_amount);
    if (!warnings.length) return;
    container.innerHTML = `<div class="warning-title">⚠️ Over Budget</div><ul>${warnings.map(b => 
      `<li><strong>${b.category}</strong>: over by ${formatMoney((spent[b.category] || 0) - b.monthly_amount)}</li>`
    ).join("")}</ul>`;
  }

  function renderRecurringTable() {
    const tbody = document.querySelector("#recurringTable tbody");
    tbody.innerHTML = "";

    if (!recurringRules.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">No recurring rules</td></tr>`;
      return;
    }

    recurringRules.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.name}</td>
        <td><span class="badge badge-${r.type}">${r.type}</span></td>
        <td>${formatMoney(r.amount)}</td>
        <td>${r.category}</td>
        <td>Day ${r.day}</td>
        <td><button type="button" class="btn-icon btn-delete" data-id="${r.id}">✕</button></td>
      `;
      tr.querySelector(".btn-delete").onclick = async () => {
        if (!confirm("Delete rule?")) return;
        try {
          await deleteRecurringRule(r.id);
          showToast("Deleted", "success");
          await reloadData();
        } catch (err) { showToast(err.message, "error"); }
      };
      tbody.appendChild(tr);
    });
  }

  function renderCategoryDropdown() {
    const select = $("budgetCategory");
    const cats = new Set();
    transactions.forEach(t => cats.add(t.category));
    budgets.forEach(b => cats.add(b.category));
    recurringRules.forEach(r => cats.add(r.category));

    select.innerHTML = `<option value="" disabled selected>Select category</option>`;
    Array.from(cats).sort().forEach(c => {
      select.innerHTML += `<option value="${c}">${c}</option>`;
    });
    select.innerHTML += `<option value="__new__">+ New category...</option>`;
  }

  function renderChart() {
    const canvas = $("expenseChart");
    const legend = $("chartLegend");
    
    if (!canvas || !legend) return;
    
    const ctx = canvas.getContext("2d");
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    const byCategory = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
    });

    const labels = Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a]);
    const data = labels.map(l => byCategory[l]);
    legend.innerHTML = "";

    if (!labels.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      legend.innerHTML = `<div class="empty-msg">No expense data</div>`;
      return;
    }

    const colors = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#22c55e", "#3b82f6"];

    chartInstance = new Chart(ctx, {
      type: "pie",
      data: { labels, datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 2, borderColor: "#fff" }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    labels.forEach((label, i) => {
      legend.innerHTML += `<div class="legend-item"><span class="legend-color" style="background:${colors[i % colors.length]}"></span><span>${label}</span><span>${formatMoney(data[i])}</span></div>`;
    });
  }

  function enterEditMode(tx) {
    editingTxId = tx.id;
    $("txType").value = tx.type;
    $("txAmount").value = tx.amount;
    $("txCategory").value = tx.category;
    $("txDate").value = tx.date;
    $("txDescription").value = tx.description || "";
    $("addTxBtn").textContent = "Update";
    $("cancelEditBtn").classList.remove("hidden");
    $("txFormTitle").textContent = "Edit Transaction";
  }

  function exitEditMode() {
    editingTxId = null;
    $("txType").value = "expense";
    $("txAmount").value = "";
    $("txCategory").value = "";
    $("txDate").value = todayISO();
    $("txDescription").value = "";
    $("addTxBtn").textContent = "Add Transaction";
    $("cancelEditBtn").classList.add("hidden");
    $("txFormTitle").textContent = "Add Transaction";
  }

  async function reloadData() {
    const month = $("monthPicker").value || currentMonthISO();
    console.log("Reloading data for month:", month);

    try {
      budgets = await fetchBudgets();
      recurringRules = await fetchRecurringRules();
      await ensureRecurringTransactions(month);
      transactions = await fetchTransactions(month);

      console.log("Data loaded:", { transactions: transactions.length, budgets: budgets.length, recurring: recurringRules.length });

      renderTotals();
      renderTransactionsTable();
      renderBudgetsTable();
      renderBudgetWarnings();
      renderRecurringTable();
      renderCategoryDropdown();
      renderChart();
    } catch (err) {
      console.error("Load error:", err);
      showToast(err.message || "Load failed", "error");
    }
  }

  async function initDashboard() {
    console.log("Initializing dashboard...");
    
    sessionUser = await requireAuth();
    if (!sessionUser) return;

    console.log("User:", sessionUser.email);
    $("userEmail").textContent = sessionUser.email;
    $("monthPicker").value = currentMonthISO();
    $("txDate").value = todayISO();

    // Event handlers
    $("monthPicker").onchange = () => { exitEditMode(); reloadData(); };
    $("logoutBtn").onclick = async () => { await supabase.auth.signOut(); window.location.replace("login.html"); };
    $("cancelEditBtn").onclick = exitEditMode;

    $("addTxBtn").onclick = async () => {
      const type = $("txType").value;
      const amount = parseFloat($("txAmount").value);
      const category = $("txCategory").value.trim();
      const date = $("txDate").value;
      const description = $("txDescription").value.trim();

      if (!type || !amount || amount <= 0 || !category || !date) {
        showToast("Fill all required fields", "error");
        return;
      }

      try {
        if (editingTxId) {
          await updateTransaction(editingTxId, { type, amount, category, date, description });
          showToast("Updated!", "success");
          exitEditMode();
        } else {
          await createTransaction({ type, amount, category, date, description });
          showToast("Added!", "success");
          $("txAmount").value = "";
          $("txCategory").value = "";
          $("txDescription").value = "";
        }
        await reloadData();
      } catch (err) {
        console.error("Save error:", err);
        showToast(err.message || "Save failed", "error");
      }
    };

    $("clearAllBtn").onclick = async () => {
      if (!confirm("Delete ALL transactions?")) return;
      try {
        await clearAllTransactions();
        showToast("Cleared", "success");
        exitEditMode();
        await reloadData();
      } catch (err) { showToast(err.message, "error"); }
    };

    $("budgetCategory").onchange = function() {
      if (this.value === "__new__") {
        const name = prompt("Category name:");
        if (name?.trim()) {
          const opt = document.createElement("option");
          opt.value = name.trim();
          opt.textContent = name.trim();
          this.insertBefore(opt, this.querySelector('[value="__new__"]'));
          this.value = name.trim();
        } else {
          this.value = "";
        }
      }
    };

    $("saveBudgetBtn").onclick = async () => {
      const category = $("budgetCategory").value;
      const amount = parseFloat($("budgetAmount").value);
      if (!category || category === "__new__" || !amount || amount <= 0) {
        showToast("Fill category and amount", "error");
        return;
      }
      try {
        await upsertBudget(category, amount);
        showToast("Budget saved!", "success");
        $("budgetAmount").value = "";
        $("budgetCategory").value = "";
        await reloadData();
      } catch (err) { showToast(err.message, "error"); }
    };

    $("toggleRecurringForm").onclick = () => {
      const form = $("recurringFormFields");
      form.classList.toggle("hidden");
      $("toggleRecurringForm").textContent = form.classList.contains("hidden") ? "+ Add Recurring" : "− Cancel";
    };

    $("saveRecurringBtn").onclick = async () => {
      const name = $("recName").value.trim();
      const type = $("recType").value;
      const amount = parseFloat($("recAmount").value);
      const category = $("recCategory").value.trim();
      const day = parseInt($("recDay").value);

      if (!name || !type || !amount || !category || !day || day < 1 || day > 28) {
        showToast("Fill all fields correctly", "error");
        return;
      }

      try {
        await createRecurringRule({ name, type, amount, category, frequency: "monthly", day });
        showToast("Rule saved!", "success");
        $("recurringFormFields").classList.add("hidden");
        $("toggleRecurringForm").textContent = "+ Add Recurring";
        await reloadData();
      } catch (err) { showToast(err.message, "error"); }
    };

    // Load data
    await reloadData();
  }

  document.addEventListener("DOMContentLoaded", initDashboard);
})();
