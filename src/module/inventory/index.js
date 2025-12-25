import { db } from '../../db.js';
import { CONFIG } from '../../config.js';
import { navigateTo } from '../../router.js';

export async function default(container, data) {
    const inventoryData = data || await loadInventoryData();
    
    container.innerHTML = `
        <div class="inventory-module">
            <!-- Header -->
            <div class="module-header">
                <h2><i class="fas fa-boxes"></i> إدارة المخزون المتقدم</h2>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="showAddItemModal()">
                        <i class="fas fa-plus"></i> إضافة صنف
                    </button>
                    <button class="btn btn-secondary" onclick="showInventoryReport()">
                        <i class="fas fa-chart-bar"></i> تقرير
                    </button>
                    <button class="btn btn-info" onclick="showProcurementModal()">
                        <i class="fas fa-shopping-cart"></i> طلب شراء
                    </button>
                </div>
            </div>
            
            <!-- Summary Cards -->
            <div class="summary-cards" id="summaryCards"></div>
            
            <!-- Filters -->
            <div class="filters-section">
                <div class="filter-group">
                    <input type="text" id="searchInventory" placeholder="بحث في المخزون..." 
                           class="search-input" oninput="searchInventory(this.value)">
                    <select id="categoryFilter" class="filter-select" onchange="filterByCategory(this.value)">
                        <option value="">جميع الفئات</option>
                        ${inventoryData.categories.map(cat => 
                            `<option value="${cat}">${cat}</option>`
                        ).join('')}
                    </select>
                    <select id="statusFilter" class="filter-select" onchange="filterByStatus(this.value)">
                        <option value="">جميع الحالات</option>
                        <option value="low">مخزون منخفض</option>
                        <option value="expiring">قريب الانتهاء</option>
                        <option value="out">نفاد المخزون</option>
                    </select>
                </div>
            </div>
            
            <!-- Inventory Table -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>الصنف</th>
                            <th>الرمز</th>
                            <th>الفئة</th>
                            <th>الكمية</th>
                            <th>الوحدة</th>
                            <th>الحد الأدنى</th>
                            <th>المورد</th>
                            <th>القيمة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="inventoryTableBody">
                        ${renderInventoryTable(inventoryData.items)}
                    </tbody>
                </table>
            </div>
            
            <!-- Charts -->
            <div class="inventory-charts">
                <div class="chart-card">
                    <h4><i class="fas fa-chart-pie"></i> توزيع المخزون حسب الفئة</h4>
                    <canvas id="inventoryPieChart"></canvas>
                </div>
                <div class="chart-card">
                    <h4><i class="fas fa-chart-line"></i> حركة المخزون</h4>
                    <canvas id="inventoryMovementChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    // تحميل الملخص
    loadSummaryCards(document.getElementById('summaryCards'), inventoryData.summary);
    
    // تحميل الرسوم البيانية
    renderInventoryCharts(inventoryData);
}

async function loadInventoryData() {
    const [items, categories, summary, suppliers] = await Promise.all([
        db.getAll('inventory'),
        db.getAll('inventory').then(items => 
            [...new Set(items.map(item => item.category))]
        ),
        db.getInventorySummary(),
        db.getAll('inventory').then(items => 
            [...new Set(items.map(item => item.supplier).filter(Boolean))]
        )
    ]);
    
    return { items, categories, summary, suppliers };
}

function renderInventoryTable(items) {
    return items.map(item => {
        const isLowStock = item.qty <= item.minStock;
        const value = (item.qty * (item.price || 0)).toFixed(2);
        
        return `
            <tr class="${isLowStock ? 'low-stock' : ''}">
                <td>
                    <div class="item-info">
                        <strong>${item.name}</strong>
                        ${item.batchNumber ? `<small class="batch">${item.batchNumber}</small>` : ''}
                        ${item.expiryDate ? `<small class="expiry">ينتهي: ${new Date(item.expiryDate).toLocaleDateString('ar-SA')}</small>` : ''}
                    </div>
                </td>
                <td>${item.sku || 'N/A'}</td>
                <td><span class="category-badge">${item.category}</span></td>
                <td>
                    <div class="quantity-display">
                        <span class="${isLowStock ? 'text-danger' : ''}">${item.qty}</span>
                        ${isLowStock ? '<span class="low-stock-badge">منخفض</span>' : ''}
                    </div>
                </td>
                <td>${item.unit}</td>
                <td>${item.minStock}</td>
                <td>${item.supplier || 'غير محدد'}</td>
                <td><strong>${value} ${CONFIG.APP.CURRENCY}</strong></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-success" onclick="adjustQuantity(${item.id}, 'add')" 
                                title="إضافة">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon btn-warning" onclick="adjustQuantity(${item.id}, 'remove')" 
                                title="خصم">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="btn-icon btn-info" onclick="editItem(${item.id})" 
                                title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteItem(${item.id})" 
                                title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function loadSummaryCards(container, summary) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-icon bg-primary">
                    <i class="fas fa-box"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.totalItems}</h3>
                    <p>إجمالي الأصناف</p>
                </div>
            </div>
            
            <div class="summary-card">
                <div class="summary-icon bg-success">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.totalValue.toLocaleString()} ${CONFIG.APP.CURRENCY}</h3>
                    <p>قيمة المخزون</p>
                </div>
            </div>
            
            <div class="summary-card">
                <div class="summary-icon bg-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.lowStock}</h3>
                    <p>أصناف منخفضة</p>
                </div>
            </div>
            
            <div class="summary-card">
                <div class="summary-icon bg-danger">
                    <i class="fas fa-hourglass-end"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.expiringSoon}</h3>
                    <p>تنتهي قريباً</p>
                </div>
            </div>
        </div>
    `;
}

function renderInventoryCharts(data) {
    // Pie Chart: توزيع المخزون حسب الفئة
    const categoryData = {};
    data.items.forEach(item => {
        categoryData[item.category] = (categoryData[item.category] || 0) + item.qty;
    });
    
    const pieCtx = document.getElementById('inventoryPieChart');
    if (pieCtx) {
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: [
                        '#0f766e', '#3b82f6', '#10b981', '#f59e0b', 
                        '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'
                    ]
                }]
            },
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
    
    // Line Chart: حركة المخزون
    const movementCtx = document.getElementById('inventoryMovementChart');
    if (movementCtx) {
        // بيانات مثال لحركة المخزون
        const movementData = {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [
                {
                    label: 'المشتريات',
                    data: [65, 59, 80, 81, 56, 55],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true
                },
                {
                    label: 'المبيعات',
                    data: [28, 48, 40, 19, 86, 27],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true
                }
            ]
        };
        
        new Chart(movementCtx, {
            type: 'line',
            data: movementData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        rtl: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// جعل الدوال متاحة عالمياً
window.showAddItemModal = showAddItemModal;
window.showInventoryReport = showInventoryReport;
window.showProcurementModal = showProcurementModal;
window.searchInventory = searchInventory;
window.filterByCategory = filterByCategory;
window.filterByStatus = filterByStatus;
window.adjustQuantity = adjustQuantity;
window.editItem = editItem;
window.deleteItem = deleteItem;

// تعريف الدوال المساعدة
async function showAddItemModal() {
    // ... نفس الكود السابق ...
}

async function showInventoryReport() {
    const items = await db.getAll('inventory');
    let report = 'تقرير المخزون\n\n';
    
    items.forEach(item => {
        const value = (item.qty * (item.price || 0)).toFixed(2);
        report += `${item.name}: ${item.qty} ${item.unit} - ${value} ${CONFIG.APP.CURRENCY}\n`;
    });
    
    alert(report);
}

async function showProcurementModal() {
    alert('نموذج طلب الشراء سيظهر هنا');
}

async function searchInventory(query) {
    const items = await db.getAll('inventory');
    const filtered = items.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.sku?.toLowerCase().includes(query.toLowerCase())
    );
    
    document.getElementById('inventoryTableBody').innerHTML = renderInventoryTable(filtered);
}

async function filterByCategory(category) {
    const items = await db.getAll('inventory');
    const filtered = category ? 
        items.filter(item => item.category === category) : 
        items;
    
    document.getElementById('inventoryTableBody').innerHTML = renderInventoryTable(filtered);
}

async function filterByStatus(status) {
    const items = await db.getAll('inventory');
    let filtered = items;
    
    switch(status) {
        case 'low':
            filtered = items.filter(item => item.qty <= item.minStock);
            break;
        case 'expiring':
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            filtered = items.filter(item => {
                if (!item.expiryDate) return false;
                return new Date(item.expiryDate) <= thirtyDaysFromNow;
            });
            break;
        case 'out':
            filtered = items.filter(item => item.qty === 0);
            break;
    }
    
    document.getElementById('inventoryTableBody').innerHTML = renderInventoryTable(filtered);
}

async function adjustQuantity(itemId, action) {
    const item = await db.get('inventory', itemId);
    if (!item) {
        alert('الصنف غير موجود');
        return;
    }
    
    const amount = prompt(`كمية ${action === 'add' ? 'الإضافة' : 'الخصم'}:`, '1');
    if (!amount || isNaN(amount)) return;
    
    const change = action === 'add' ? parseFloat(amount) : -parseFloat(amount);
    
    try {
        await db.updateInventoryQuantity(itemId, change, 'manual_adjustment');
        alert('✅ تم التعديل بنجاح');
        location.reload(); // إعادة تحميل الصفحة لعرض التغييرات
    } catch (error) {
        alert(`❌ خطأ: ${error.message}`);
    }
}

async function editItem(itemId) {
    const item = await db.get('inventory', itemId);
    if (!item) return;
    
    const name = prompt('اسم الصنف:', item.name);
    if (!name) return;
    
    const qty = prompt('الكمية:', item.qty.toString());
    if (!qty || isNaN(qty)) return;
    
    const minStock = prompt('الحد الأدنى:', item.minStock.toString());
    if (!minStock || isNaN(minStock)) return;
    
    item.name = name;
    item.qty = parseFloat(qty);
    item.minStock = parseFloat(minStock);
    item.lastUpdated = new Date().toISOString();
    
    try {
        await db.put('inventory', item);
        alert('✅ تم التعديل بنجاح');
        location.reload();
    } catch (error) {
        alert(`❌ خطأ: ${error.message}`);
    }
}

async function deleteItem(itemId) {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    
    try {
        await db.delete('inventory', itemId);
        alert('✅ تم الحذف بنجاح');
        location.reload();
    } catch (error) {
        alert(`❌ خطأ: ${error.message}`);
    }
           }
