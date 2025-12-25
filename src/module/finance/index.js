import { db } from '../../db.js';
import { CONFIG } from '../../config.js';
import { navigateTo } from '../../router.js';

export async function default(container, data) {
    const financeData = data || await loadFinanceData();
    
    container.innerHTML = `
        <div class="finance-module">
            <!-- Header -->
            <div class="module-header">
                <h2><i class="fas fa-money-bill-wave"></i> الإدارة المالية المتقدمة</h2>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="addTransaction('income')">
                        <i class="fas fa-plus-circle"></i> إضافة إيراد
                    </button>
                    <button class="btn btn-danger" onclick="addTransaction('expense')">
                        <i class="fas fa-minus-circle"></i> إضافة مصروف
                    </button>
                    <button class="btn btn-info" onclick="showBudgetModal()">
                        <i class="fas fa-chart-pie"></i> الميزانية
                    </button>
                </div>
            </div>
            
            <!-- Financial Summary -->
            <div class="financial-summary" id="financialSummary"></div>
            
            <!-- Charts -->
            <div class="finance-charts">
                <div class="chart-card">
                    <h4><i class="fas fa-chart-bar"></i> الإيرادات والمصروفات</h4>
                    <canvas id="incomeExpenseChart"></canvas>
                </div>
                <div class="chart-card">
                    <h4><i class="fas fa-chart-pie"></i> توزيع المصروفات</h4>
                    <canvas id="expenseDistributionChart"></canvas>
                </div>
            </div>
            
            <!-- Recent Transactions -->
            <div class="recent-transactions">
                <div class="section-header">
                    <h3><i class="fas fa-history"></i> آخر المعاملات</h3>
                    <div class="view-options">
                        <button class="btn btn-sm" onclick="filterTransactions('all')">الكل</button>
                        <button class="btn btn-sm" onclick="filterTransactions('income')">الإيرادات</button>
                        <button class="btn btn-sm" onclick="filterTransactions('expense')">المصروفات</button>
                    </div>
                </div>
                <div class="transactions-list" id="transactionsList">
                    ${renderTransactions(financeData.recentTransactions)}
                </div>
            </div>
        </div>
    `;
    
    // تحميل الملخص المالي
    loadFinancialSummary(document.getElementById('financialSummary'), financeData.monthlySummary);
    
    // تحميل الرسوم البيانية
    renderFinanceCharts(financeData);
}

async function loadFinanceData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const [monthlySummary, recentTransactions, budget, yearlyData] = await Promise.all([
        db.getFinancialSummary(startOfMonth.toISOString(), now.toISOString()),
        db.getAll('transactions', 'date').then(t => t.slice(-20).reverse()),
        db.get('settings', 'budget'),
        db.getFinancialSummary(startOfYear.toISOString(), now.toISOString())
    ]);
    
    return {
        monthlySummary,
        recentTransactions,
        budget: budget || {},
        yearlyData,
        charts: await generateFinanceCharts()
    };
}

function renderTransactions(transactions) {
    if (!transactions.length) {
        return '<div class="no-data">لا توجد معاملات</div>';
    }
    
    return transactions.map(transaction => {
        const isIncome = transaction.type === 'income';
        const amount = transaction.amount || 0;
        
        return `
            <div class="transaction-item ${isIncome ? 'income' : 'expense'}">
                <div class="transaction-icon">
                    <i class="fas fa-${isIncome ? 'arrow-down' : 'arrow-up'}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${transaction.description || 'معاملة'}</h4>
                    <p class="transaction-category">${transaction.category || 'عام'}</p>
                    <small>${new Date(transaction.date).toLocaleDateString('ar-SA')}</small>
                </div>
                <div class="transaction-amount ${isIncome ? 'text-success' : 'text-danger'}">
                    ${isIncome ? '+' : '-'} ${amount.toLocaleString()} ${CONFIG.APP.CURRENCY}
                </div>
                <div class="transaction-actions">
                    <button class="btn-icon" onclick="viewTransaction(${transaction.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="editTransaction(${transaction.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function loadFinancialSummary(container, summary) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-icon bg-success">
                    <i class="fas fa-arrow-up"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.totalIncome?.toLocaleString() || 0} ${CONFIG.APP.CURRENCY}</h3>
                    <p>إجمالي الإيرادات</p>
                </div>
            </div>
            
            <div class="summary-card">
                <div class="summary-icon bg-danger">
                    <i class="fas fa-arrow-down"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.totalExpenses?.toLocaleString() || 0} ${CONFIG.APP.CURRENCY}</h3>
                    <p>إجمالي المصروفات</p>
                </div>
            </div>
            
            <div class="summary-card">
                <div class="summary-icon ${summary.netProfit >= 0 ? 'bg-info' : 'bg-warning'}">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.netProfit?.toLocaleString() || 0} ${CONFIG.APP.CURRENCY}</h3>
                    <p>صافي الربح</p>
                </div>
            </div>
            
            <div class="summary-card">
                <div class="summary-icon bg-primary">
                    <i class="fas fa-percentage"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.totalIncome ? ((summary.netProfit / summary.totalIncome) * 100).toFixed(1) : 0}%</h3>
                    <p>هامش الربح</p>
                </div>
            </div>
        </div>
    `;
}

function renderFinanceCharts(data) {
    // Bar Chart: الإيرادات مقابل المصروفات
    const barCtx = document.getElementById('incomeExpenseChart');
    if (barCtx) {
        const monthlyData = {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [
                {
                    label: 'الإيرادات',
                    data: [12000, 19000, 15000, 18000, 22000, 20000],
                    backgroundColor: '#10b981'
                },
                {
                    label: 'المصروفات',
                    data: [8000, 11000, 9000, 12000, 15000, 13000],
                    backgroundColor: '#ef4444'
                }
            ]
        };
        
        new Chart(barCtx, {
            type: 'bar',
            data: monthlyData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        rtl: true
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ' + CONFIG.APP.CURRENCY;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Pie Chart: توزيع المصروفات
    const pieCtx = document.getElementById('expenseDistributionChart');
    if (pieCtx) {
        const expenseData = {
            labels: ['علف', 'دواجن', 'أدوية', 'عمالة', 'مرافق', 'صيانة'],
            datasets: [{
                data: [40, 25, 15, 10, 5, 5],
                backgroundColor: [
                    '#0f766e', '#3b82f6', '#10b981', '#f59e0b', 
                    '#ef4444', '#8b5cf6'
                ]
            }]
        };
        
        new Chart(pieCtx, {
            type: 'pie',
            data: expenseData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        rtl: true
                    }
                }
            }
        });
    }
}

// جعل الدوال متاحة عالمياً
window.addTransaction = addTransaction;
window.showBudgetModal = showBudgetModal;
window.filterTransactions = filterTransactions;
window.viewTransaction = viewTransaction;
window.editTransaction = editTransaction;

async function addTransaction(type) {
    const description = prompt('الوصف:', '');
    if (!description) return;
    
    const amount = prompt('المبلغ:', '');
    if (!amount || isNaN(amount)) return;
    
    const category = prompt('الفئة:', type === 'income' ? 'بيع دواجن' : 'علف');
    
    const transaction = {
        id: Date.now(),
        type: type,
        description: description,
        amount: parseFloat(amount),
        category: category,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    
    try {
        await db.addFinancialTransaction(transaction);
        alert(`✅ تم إضافة ${type === 'income' ? 'إيراد' : 'مصروف'} بنجاح`);
        location.reload();
    } catch (error) {
        alert(`❌ خطأ: ${error.message}`);
    }
}

async function showBudgetModal() {
    const budget = await db.get('settings', 'budget') || {};
    
    const incomeBudget = prompt('ميزانية الإيرادات الشهرية:', budget.income?.toString() || '0');
    const expenseBudget = prompt('ميزانية المصروفات الشهرية:', budget.expenses?.toString() || '0');
    
    if (incomeBudget === null || expenseBudget === null) return;
    
    const newBudget = {
        key: 'budget',
        income: parseFloat(incomeBudget) || 0,
        expenses: parseFloat(expenseBudget) || 0,
        updatedAt: new Date().toISOString()
    };
    
    await db.put('settings', newBudget);
    alert('✅ تم حفظ الميزانية');
}

async function filterTransactions(filter) {
    const transactions = await db.getAll('transactions', 'date');
    let filtered = transactions;
    
    if (filter === 'income') {
        filtered = transactions.filter(t => t.type === 'income');
    } else if (filter === 'expense') {
        filtered = transactions.filter(t => t.type === 'expense');
    }
    
    document.getElementById('transactionsList').innerHTML = renderTransactions(filtered.slice(-20).reverse());
}

async function viewTransaction(id) {
    const transaction = await db.get('transactions', id);
    if (!transaction) return;
    
    let details = `تفاصيل المعاملة:\n\n`;
    details += `النوع: ${transaction.type === 'income' ? 'إيراد' : 'مصروف'}\n`;
    details += `الوصف: ${transaction.description || 'لا يوجد'}\n`;
    details += `المبلغ: ${transaction.amount.toLocaleString()} ${CONFIG.APP.CURRENCY}\n`;
    details += `الفئة: ${transaction.category || 'عام'}\n`;
    details += `التاريخ: ${new Date(transaction.date).toLocaleDateString('ar-SA')}\n`;
    
    if (transaction.notes) {
        details += `ملاحظات: ${transaction.notes}\n`;
    }
    
    alert(details);
}

async function editTransaction(id) {
    const transaction = await db.get('transactions', id);
    if (!transaction) return;
    
    const description = prompt('الوصف:', transaction.description);
    if (description === null) return;
    
    const amount = prompt('المبلغ:', transaction.amount.toString());
    if (!amount || isNaN(amount)) return;
    
    transaction.description = description;
    transaction.amount = parseFloat(amount);
    
    try {
        await db.put('transactions', transaction);
        alert('✅ تم التعديل بنجاح');
        location.reload();
    } catch (error) {
        alert(`❌ خطأ: ${error.message}`);
    }
}
