import { db } from '../../db.js';
import { CONFIG } from '../../config.js';
import { navigateTo } from '../../router.js';

export async function default(container, data) {
    const reportsData = data || await loadReportsData();
    
    container.innerHTML = `
        <div class="reports-module">
            <!-- Header -->
            <div class="module-header">
                <h2><i class="fas fa-chart-line"></i> التقارير والتحليلات الذكية</h2>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="generateCustomReport()">
                        <i class="fas fa-plus"></i> تقرير مخصص
                    </button>
                    <button class="btn btn-secondary" onclick="exportAllReports()">
                        <i class="fas fa-download"></i> تصدير جميع التقارير
                    </button>
                </div>
            </div>
            
            <!-- Report Categories -->
            <div class="report-categories">
                <div class="category-grid">
                    <div class="category-card" onclick="showFlockReports()">
                        <div class="category-icon bg-primary">
                            <i class="fas fa-dove"></i>
                        </div>
                        <h4>تقارير الدفعات</h4>
                        <p>تحليل أداء الدفعات ومقارنتها</p>
                    </div>
                    
                    <div class="category-card" onclick="showFinancialReports()">
                        <div class="category-icon bg-success">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <h4>تقارير مالية</h4>
                        <p>الإيرادات، المصروفات، والربحية</p>
                    </div>
                    
                    <div class="category-card" onclick="showInventoryReports()">
                        <div class="category-icon bg-warning">
                            <i class="fas fa-box"></i>
                        </div>
                        <h4>تقارير المخزون</h4>
                        <p>حركة المخزون وقيمته</p>
                    </div>
                    
                    <div class="category-card" onclick="showQualityReports()">
                        <div class="category-icon bg-info">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <h4>تقارير الجودة</h4>
                        <p>معايير الجودة والامتثال</p>
                    </div>
                </div>
            </div>
            
            <!-- Report Content -->
            <div id="reportContent" class="report-content">
                <div class="welcome-message">
                    <i class="fas fa-chart-pie"></i>
                    <h3>مرحباً بكم في مركز التقارير</h3>
                    <p>اختر نوع التقرير من الأقسام أعلاه لعرض التحليلات التفصيلية</p>
                </div>
            </div>
        </div>
    `;
}

async function loadReportsData() {
    const [flockReports, financialReports, inventoryReports, qualityReports] = await Promise.all([
        generateFlockReports(),
        generateFinancialReports(),
        generateInventoryReports(),
        generateQualityReports()
    ]);
    
    return {
        flockReports,
        financialReports,
        inventoryReports,
        qualityReports,
        availableReports: getAvailableReportTemplates()
    };
}

async function generateFlockReports() {
    const flocks = await db.getAll('flocks');
    
    return flocks.map(flock => {
        const age = Math.floor((new Date() - new Date(flock.startDate)) / (1000 * 60 * 60 * 24));
        const mortality = flock.initialCount ? 
            ((flock.initialCount - flock.count) / flock.initialCount * 100).toFixed(1) : 0;
        
        return {
            id: flock.id,
            name: flock.name,
            breed: flock.breed,
            age: age,
            count: flock.count,
            mortalityRate: mortality,
            status: flock.status
        };
    });
}

async function generateFinancialReports() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const [monthlySummary, yearlySummary] = await Promise.all([
        db.getFinancialSummary(startOfMonth.toISOString(), now.toISOString()),
        db.getFinancialSummary(startOfYear.toISOString(), now.toISOString())
    ]);
    
    return {
        monthly: monthlySummary,
        yearly: yearlySummary,
        byCategory: monthlySummary.byCategory || {}
    };
}

async function generateInventoryReports() {
    const [items, lowStock, expiringSoon, totalValue] = await Promise.all([
        db.getAll('inventory'),
        db.getLowStockItems(),
        db.getExpiringItems(30),
        db.getInventoryValue()
    ]);
    
    return {
        totalItems: items.length,
        totalValue: totalValue,
        lowStockCount: lowStock.length,
        expiringSoonCount: expiringSoon.length,
        byCategory: groupByCategory(items)
    };
}

async function generateQualityReports() {
    // بيانات الجودة
    const qualityMetrics = {
        temperature: { current: 24, target: 23, status: 'good' },
        humidity: { current: 65, target: 60, status: 'warning' },
        mortality: { current: 3.2, target: 5, status: 'good' },
        fcr: { current: 1.6, target: 1.5, status: 'warning' }
    };
    
    return {
        metrics: qualityMetrics,
        compliance: await checkCompliance(),
        issues: await getQualityIssues()
    };
}

function getAvailableReportTemplates() {
    return [
        { id: 'flock-performance', name: 'أداء الدفعات', category: 'flocks' },
        { id: 'financial-summary', name: 'ملخص مالي', category: 'finance' },
        { id: 'inventory-status', name: 'حالة المخزون', category: 'inventory' },
        { id: 'quality-control', name: 'مراقبة الجودة', category: 'quality' }
    ];
}

// دوال المساعدة
function groupByCategory(items) {
    const categories = {};
    
    items.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = {
                count: 0,
                totalValue: 0,
                items: []
            };
        }
        
        categories[item.category].count++;
        categories[item.category].totalValue += (item.qty * (item.price || 0));
        categories[item.category].items.push(item);
    });
    
    return categories;
}

async function checkCompliance() {
    // التحقق من الامتثال للمعايير
    const issues = [];
    
    // مثال للتحقق
    const flocks = await db.getAll('flocks');
    flocks.forEach(flock => {
        if (flock.mortality > 10) { // نسبة نفوق عالية
            issues.push({
                type: 'mortality',
                flock: flock.name,
                value: flock.mortality,
                threshold: 10,
                severity: 'high'
            });
        }
    });
    
    return {
        totalChecks: 10,
        passed: 8,
        failed: 2,
        issues: issues
    };
}

async function getQualityIssues() {
    // الحصول على مشاكل الجودة
    return [];
}

// جعل الدوال متاحة عالمياً
window.showFlockReports = showFlockReports;
window.showFinancialReports = showFinancialReports;
window.showInventoryReports = showInventoryReports;
window.showQualityReports = showQualityReports;
window.generateCustomReport = generateCustomReport;
window.exportAllReports = exportAllReports;

async function showFlockReports() {
    const reports = await generateFlockReports();
    const container = document.getElementById('reportContent');
    
    let html = `
        <div class="report-section">
            <div class="section-header">
                <h3><i class="fas fa-dove"></i> تقارير أداء الدفعات</h3>
                <button class="btn btn-sm" onclick="exportReport('flocks')">
                    <i class="fas fa-download"></i> تصدير
                </button>
            </div>
            
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>اسم الدفعة</th>
                            <th>السلالة</th>
                            <th>العمر (يوم)</th>
                            <th>عدد الطيور</th>
                            <th>معدل النفوق%</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    reports.forEach(report => {
        html += `
            <tr>
                <td>${report.name}</td>
                <td>${report.breed}</td>
                <td>${report.age}</td>
                <td>${report.count.toLocaleString()}</td>
                <td class="${report.mortalityRate > 5 ? 'text-danger' : 'text-success'}">
                    ${report.mortalityRate}%
                </td>
                <td>
                    <span class="status-badge ${report.status === 'active' ? 'active' : 'completed'}">
                        ${report.status === 'active' ? 'نشطة' : 'مكتملة'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            
            <!-- Charts -->
            <div class="report-charts">
                <div class="chart-container">
                    <canvas id="flockMortalityChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // رسم مخطط النفوق
    const mortalityData = {
        labels: reports.map(r => r.name),
        datasets: [{
            label: 'معدل النفوق %',
            data: reports.map(r => parseFloat(r.mortalityRate)),
            backgroundColor: reports.map(r => 
                parseFloat(r.mortalityRate) > 5 ? '#ef4444' : '#10b981'
            )
        }]
    };
    
    const ctx = document.getElementById('flockMortalityChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'bar',
            data: mortalityData,
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'النسبة %'
                        }
                    }
                }
            }
        });
    }
}

async function showFinancialReports() {
    const reports = await generateFinancialReports();
    const container = document.getElementById('reportContent');
    
    container.innerHTML = `
        <div class="report-section">
            <div class="section-header">
                <h3><i class="fas fa-money-bill-wave"></i> التقارير المالية</h3>
                <button class="btn btn-sm" onclick="exportReport('finance')">
                    <i class="fas fa-download"></i> تصدير
                </button>
            </div>
            
            <div class="financial-summary-grid">
                <div class="summary-card">
                    <h4>إيرادات الشهر</h4>
                    <h2 class="text-success">${reports.monthly.totalIncome?.toLocaleString() || 0} ${CONFIG.APP.CURRENCY}</h2>
                </div>
                
                <div class="summary-card">
                    <h4>مصروفات الشهر</h4>
                    <h2 class="text-danger">${reports.monthly.totalExpenses?.toLocaleString() || 0} ${CONFIG.APP.CURRENCY}</h2>
                </div>
                
                <div class="summary-card">
                    <h4>صافي الربح</h4>
                    <h2 class="${reports.monthly.netProfit >= 0 ? 'text-success' : 'text-danger'}">
                        ${reports.monthly.netProfit?.toLocaleString() || 0} ${CONFIG.APP.CURRENCY}
                    </h2>
                </div>
                
                <div class="summary-card">
                    <h4>هامش الربح</h4>
                    <h2>
                        ${reports.monthly.totalIncome ? 
                            ((reports.monthly.netProfit / reports.monthly.totalIncome) * 100).toFixed(1) : 0}%
                    </h2>
                </div>
            </div>
            
            <!-- Expense Breakdown -->
            <div class="expense-breakdown">
                <h4><i class="fas fa-chart-pie"></i> توزيع المصروفات</h4>
                <div class="breakdown-list">
                    ${Object.entries(reports.byCategory).map(([category, amount]) => `
                        <div class="breakdown-item">
                            <span class="category">${category}</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(amount / reports.monthly.totalExpenses * 100) || 0}%"></div>
                            </div>
                            <span class="amount">${amount.toLocaleString()} ${CONFIG.APP.CURRENCY}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

async function generateCustomReport() {
    const reportType = prompt('نوع التقرير:\n1- أداء الدفعات\n2- مالي\n3- مخزون\n4- جودة');
    
    if (!reportType) return;
    
    let reportData;
    let reportTitle;
    
    switch(reportType) {
        case '1':
            reportData = await generateFlockReports();
            reportTitle = 'تقرير أداء الدفعات';
            break;
        case '2':
            reportData = await generateFinancialReports();
            reportTitle = 'تقرير مالي';
            break;
        case '3':
            reportData = await generateInventoryReports();
            reportTitle = 'تقرير المخزون';
            break;
        case '4':
            reportData = await generateQualityReports();
            reportTitle = 'تقرير الجودة';
            break;
        default:
            alert('نوع التقرير غير صحيح');
            return;
    }
    
    const reportContent = JSON.stringify(reportData, null, 2);
    alert(`${reportTitle}:\n\n${reportContent}`);
}

async function exportAllReports() {
    const allReports = await loadReportsData();
    const blob = new Blob([JSON.stringify(allReports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `poultry-reports-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    alert('✅ تم تصدير جميع التقارير بنجاح');
}
