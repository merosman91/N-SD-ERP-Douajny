import { db } from '../../db.js';
import { CONFIG } from '../../config.js';
import { appState } from '../../state.js';
import { renderKPICards } from './kpi-cards.js';
import { renderCharts } from './charts.js';

export async function default(container, data) {
    const dashboardData = data || await appState.loadScreenData('dashboard');
    
    container.innerHTML = `
        <div class="dashboard">
            <!-- Quick Stats -->
            <div class="quick-stats" id="quickStats"></div>
            
            <!-- KPI Cards -->
            <div class="kpi-grid" id="kpiGrid"></div>
            
            <!-- Charts -->
            <div class="chart-grid">
                <div class="chart-container" id="performanceChart"></div>
                <div class="chart-container" id="financialChart"></div>
            </div>
            
            <!-- Alerts -->
            <div class="alerts-section" id="alertsSection"></div>
            
            <!-- Recent Activity -->
            <div class="recent-activity" id="recentActivity"></div>
        </div>
    `;
    
    // تحميل المكونات
    await loadQuickStats(document.getElementById('quickStats'), dashboardData);
    await renderKPICards(document.getElementById('kpiGrid'), dashboardData);
    await renderCharts(dashboardData);
    await loadAlerts(document.getElementById('alertsSection'), dashboardData);
    await loadRecentActivity(document.getElementById('recentActivity'), dashboardData);
}

async function loadQuickStats(container, data) {
    const stats = data?.stats || {};
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon bg-primary">
                    <i class="fas fa-feather"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.activeFlocks || 0}</h3>
                    <p>الدفعات النشطة</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon bg-success">
                    <i class="fas fa-dove"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.totalBirds?.toLocaleString() || 0}</h3>
                    <p>عدد الطيور</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon bg-warning">
                    <i class="fas fa-box"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.lowStockAlerts || 0}</h3>
                    <p>تنبيهات مخزون</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon bg-info">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.monthlyProfit?.toLocaleString() || 0} ${CONFIG.APP.CURRENCY}</h3>
                    <p>صافي الربح الشهري</p>
                </div>
            </div>
        </div>
    `;
}

async function loadAlerts(container, data) {
    const alerts = data?.alerts || [];
    
    if (!alerts.length) {
        container.innerHTML = `
            <div class="section-header">
                <h3><i class="fas fa-bell"></i> الإشعارات</h3>
            </div>
            <div class="no-alerts">
                <i class="fas fa-check-circle"></i>
                <p>لا توجد إشعارات حالياً</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-bell"></i> الإشعارات العاجلة</h3>
            <button class="btn btn-sm" onclick="markAllAlertsAsRead()">تعليم الكل كمقروء</button>
        </div>
        <div class="alerts-list">
            ${alerts.map(alert => `
                <div class="alert-item ${alert.priority}">
                    <div class="alert-icon">
                        <i class="fas fa-${getAlertIcon(alert.type)}"></i>
                    </div>
                    <div class="alert-content">
                        <h4>${alert.title}</h4>
                        <p>${alert.message}</p>
                        <small>${formatTime(alert.timestamp)}</small>
                    </div>
                    <button class="alert-action" onclick="handleAlert('${alert.id}')">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadRecentActivity(container, data) {
    const activities = data?.recentActivity || [];
    
    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-history"></i> النشاط الأخير</h3>
        </div>
        <div class="activity-timeline">
            ${activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="fas fa-${getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${getActivityDescription(activity)}</p>
                        <small>${formatTime(activity.timestamp)}</small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// دوال مساعدة
function getAlertIcon(type) {
    const icons = {
        'inventory': 'box',
        'flock': 'feather',
        'finance': 'money-bill',
        'quality': 'exclamation-triangle',
        'system': 'cog'
    };
    return icons[type] || 'bell';
}

function getActivityIcon(type) {
    const icons = {
        'purchase': 'shopping-cart',
        'sale': 'money-bill-wave',
        'inventory': 'boxes',
        'flock': 'dove',
        'health': 'stethoscope',
        'quality': 'clipboard-check'
    };
    return icons[type] || 'circle';
}

function getActivityDescription(activity) {
    const descriptions = {
        'purchase': `تم شراء ${activity.quantity} ${activity.unit} من ${activity.item}`,
        'sale': `تم بيع ${activity.quantity} ${activity.unit} من ${activity.item}`,
        'inventory': `تم تعديل مخزون ${activity.item} إلى ${activity.newQuantity}`,
        'flock': `تم ${activity.action} دفعة ${activity.flockName}`,
        'health': `تم تسجيل ${activity.recordType} لدفعة ${activity.flockName}`
    };
    return descriptions[activity.type] || activity.description || 'نشاط غير معروف';
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `قبل ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `قبل ${Math.floor(diff / 3600000)} ساعة`;
    return date.toLocaleDateString('ar-SA');
}
