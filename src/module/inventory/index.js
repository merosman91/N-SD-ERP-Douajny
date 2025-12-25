import { db } from '../../db.js';
import { CONFIG } from '../../config.js';

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
}

// دوال JavaScript للاستخدام في الـ onclick
window.showAddItemModal = async function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>إضافة صنف جديد</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <form id="addItemForm" onsubmit="saveNewItem(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>اسم الصنف *</label>
                            <input type="text" name="name" required>
                        </div>
                        <div class="form-group">
                            <label>الرمز (SKU)</label>
                            <input type="text" name="sku">
                        </div>
                        <div class="form-group">
                            <label>الفئة *</label>
                            <select name="category" required>
                                <option value="">اختر الفئة</option>
                                ${CONFIG.INVENTORY.DEFAULT_CATEGORIES.map(cat => 
                                    `<option value="${cat}">${cat}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>الوحدة *</label>
                            <select name="unit" required>
                                <option value="">اختر الوحدة</option>
                                <option value="كجم">كيلوغرام</option>
                                <option value="لتر">لتر</option>
                                <option value="عبوة">عبوة</option>
                                <option value="قطعة">قطعة</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>الكمية الأولية</label>
                            <input type="number" name="qty" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>الحد الأدنى</label>
                            <input type="number" name="minStock" min="0" required>
                        </div>
                        <div class="form-group">
                            <label>الحد الأقصى</label>
                            <input type="number" name="maxStock" min="0">
                        </div>
                        <div class="form-group">
                            <label>سعر الوحدة</label>
                            <input type="number" name="price" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>المورد</label>
                            <input type="text" name="supplier">
                        </div>
                        <div class="form-group">
                            <label>رقم الدفعة</label>
                            <input type="text" name="batchNumber">
                        </div>
                        <div class="form-group">
                            <label>تاريخ الانتهاء</label>
                            <input type="date" name="expiryDate">
                        </div>
                        <div class="form-group">
                            <label>الموقع</label>
                            <input type="text" name="location">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" 
                                onclick="this.closest('.modal-overlay').remove()">إلغاء</button>
                        <button type="submit" class="btn btn-primary">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

window.saveNewItem = async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const item = Object.fromEntries(formData.entries());
    
    // تنظيف البيانات
    item.id = Date.now();
    item.qty = parseFloat(item.qty) || 0;
    item.minStock = parseFloat(item.minStock) || 0;
    item.maxStock = parseFloat(item.maxStock) || 0;
    item.price = parseFloat(item.price) || 0;
    item.lastUpdated = new Date().toISOString();
    
    try {
        await db.add('inventory', item);
        alert('✅ تم إضافة الصنف بنجاح');
        form.closest('.modal-overlay').remove();
        // إعادة تحميل الصفحة
        location.reload();
    } catch (error) {
        alert('❌ خطأ في حفظ الصنف: ' + error.message);
    }
};
