import { db } from '../../db.js';
import { CONFIG } from '../../config.js';
import { navigateTo } from '../../router.js';

export async function default(container, data) {
    const qualityData = data || await loadQualityData();
    
    container.innerHTML = `
        <div class="quality-module">
            <!-- Header -->
            <div class="module-header">
                <h2><i class="fas fa-clipboard-check"></i> مراقبة الجودة والامتثال</h2>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="addQualityCheck()">
                        <i class="fas fa-plus"></i> تسجيل فحص
                    </button>
                    <button class="btn btn-secondary" onclick="showQualityReport()">
                        <i class="fas fa-chart-bar"></i> تقرير الجودة
                    </button>
                </div>
            </div>
            
            <!-- Quality Dashboard -->
            <div class="quality-dashboard">
                <!-- Standards -->
                <div class="standards-section">
                    <h3><i class="fas fa-ruler"></i> المعايير القياسية</h3>
                    <div class="standards-grid">
                        ${renderQualityStandards(CONFIG.QUALITY.PARAMETERS)}
                    </div>
                </div>
                
                <!-- Current Status -->
                <div class="current-status">
                    <h3><i class="fas fa-heartbeat"></i> الحالة الحالية</h3>
                    <div class="status-grid" id="currentStatus"></div>
                </div>
            </div>
            
            <!-- Quality Checks -->
            <div class="quality-checks">
                <div class="section-header">
                    <h3><i class="fas fa-history"></i> سجلات الفحص</h3>
                </div>
                <div class="checks-list" id="qualityChecksList"></div>
            </div>
            
            <!-- Issues -->
            <div class="quality-issues">
                <div class="section-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> المشاكل والمخالفات</h3>
                </div>
                <div class="issues-list" id="qualityIssuesList"></div>
            </div>
        </div>
    `;
    
    // تحميل البيانات الحالية
    loadCurrentStatus(document.getElementById('currentStatus'), qualityData.metrics);
    loadQualityChecks(document.getElementById('qualityChecksList'), qualityData.checks);
    loadQualityIssues(document.getElementById('qualityIssuesList'), qualityData.issues);
}

async function loadQualityData() {
    const [checks, issues, compliance] = await Promise.all([
        db.getAll('quality_checks', 'date'),
        db.getAll('quality_issues', 'date'),
        checkCompliance()
    ]);
    
    const currentMetrics = await getCurrentMetrics();
    
    return {
        metrics: currentMetrics,
        checks: checks.slice(-10).reverse(),
        issues: issues,
        compliance: compliance
    };
}

async function getCurrentMetrics() {
    // بيانات مستشعرات افتراضية
    return {
        temperature: { 
            value: 24.5, 
            unit: '°C',
            status: 'good',
            lastCheck: new Date().toISOString()
        },
        humidity: { 
            value: 62, 
            unit: '%',
            status: 'warning',
            lastCheck: new Date().toISOString()
        },
        ammonia: { 
            value: 12, 
            unit: 'ppm',
            status: 'good',
            lastCheck: new Date().toISOString()
        },
        co2: { 
            value: 1800, 
            unit: 'ppm',
            status: 'warning',
            lastCheck: new Date().toISOString()
        }
    };
}

function renderQualityStandards(standards) {
    let html = '';
    
    for (const [parameter, values] of Object.entries(standards)) {
        html += `
            <div class="standard-card">
                <div class="standard-header">
                    <h4>${getParameterName(parameter)}</h4>
                    <span class="status-indicator good"></span>
                </div>
                <div class="standard-values">
                    <div class="value">
                        <span>الحد الأدنى:</span>
                        <strong>${values.MIN || values.min || 'N/A'}</strong>
                    </div>
                    <div class="value">
                        <span>المثالي:</span>
                        <strong>${values.OPTIMAL || values.target || 'N/A'}</strong>
                    </div>
                    <div class="value">
                        <span>الحد الأقصى:</span>
                        <strong>${values.MAX || values.max || 'N/A'}</strong>
                    </div>
                </div>
            </div>
        `;
    }
    
    return html;
}

function getParameterName(parameter) {
    const names = {
        'temperature': 'درجة الحرارة',
        'humidity': 'الرطوبة',
        'ammonia': 'غاز الأمونيا',
        'co2': 'ثاني أكسيد الكربون'
    };
    
    return names[parameter] || parameter;
}

function loadCurrentStatus(container, metrics) {
    if (!container) return;
    
    let html = '';
    
    for (const [key, metric] of Object.entries(metrics)) {
        const statusClass = metric.status === 'good' ? 'good' : 
                          metric.status === 'warning' ? 'warning' : 'danger';
        
        html += `
            <div class="status-card ${statusClass}">
                <div class="status-icon">
                    <i class="fas fa-${getMetricIcon(key)}"></i>
                </div>
                <div class="status-info">
                    <h4>${getParameterName(key)}</h4>
                    <p class="status-value">${metric.value} ${metric.unit}</p>
                </div>
                <div class="status-time">
                    <small>${formatTime(metric.lastCheck)}</small>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function loadQualityChecks(container, checks) {
    if (!checks.length) {
        container.innerHTML = '<div class="no-data">لا توجد سجلات فحص</div>';
        return;
    }
    
    container.innerHTML = checks.map(check => `
        <div class="check-item">
            <div class="check-icon ${check.result === 'pass' ? 'success' : 'danger'}">
                <i class="fas fa-${check.result === 'pass' ? 'check' : 'times'}"></i>
            </div>
            <div class="check-details">
                <h4>${check.type}</h4>
                <p>${check.description || ''}</p>
                <small>${new Date(check.date).toLocaleDateString('ar-SA')}</small>
            </div>
            <div class="check-actions">
                <button class="btn-icon" onclick="viewCheck(${check.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function loadQualityIssues(container, issues) {
    if (!issues.length) {
        container.innerHTML = '<div class="no-data">لا توجد مشاكل حالياً</div>';
        return;
    }
    
    container.innerHTML = issues.map(issue => `
        <div class="issue-item ${issue.severity}">
            <div class="issue-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="issue-details">
                <h4>${issue.title}</h4>
                <p>${issue.description}</p>
                <small>${formatTime(issue.date)}</small>
            </div>
            <div class="issue-actions">
                <button class="btn-icon" onclick="resolveIssue(${issue.id})">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// دوال المساعدة
function getMetricIcon(metric) {
    const icons = {
        'temperature': 'thermometer',
        'humidity': 'tint',
        'ammonia': 'wind',
        'co2': 'cloud'
    };
    
    return icons[metric] || 'chart-line';
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

async function checkCompliance() {
    const checks = await db.getAll('quality_checks');
    const passed = checks.filter(c => c.result === 'pass').length;
    const total = checks.length;
    
    return {
        totalChecks: total,
        passed: passed,
        failed: total - passed,
        complianceRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0
    };
}

// جعل الدوال متاحة عالمياً
window.addQualityCheck = addQualityCheck;
window.showQualityReport = showQualityReport;
window.viewCheck = viewCheck;
window.resolveIssue = resolveIssue;

async function addQualityCheck() {
    const type = prompt('نوع الفحص:', 'درجة حرارة');
    if (!type) return;
    
    const value = prompt('القيمة:', '');
    if (!value) return;
    
    const result = confirm('هل النتيجة مقبولة؟') ? 'pass' : 'fail';
    const description = prompt('ملاحظات:', '');
    
    const check = {
        id: Date.now(),
        type: type,
        value: value,
        result: result,
        description: description,
        date: new Date().toISOString(),
        inspector: 'نظام'
    };
    
    await db.add('quality_checks', check);
    
    // إذا كانت النتيجة فاشلة، إضافة مشكلة
    if (result === 'fail') {
        const issue = {
            id: Date.now(),
            title: `فشل فحص ${type}`,
            description: description || `القيمة: ${value}`,
            severity: 'high',
            date: new Date().toISOString(),
            status: 'open'
        };
        
        await db.add('quality_issues', issue);
    }
    
    alert('✅ تم تسجيل الفحص بنجاح');
    location.reload();
}

async function showQualityReport() {
    const compliance = await checkCompliance();
    
    let report = 'تقرير الجودة:\n\n';
    report += `إجمالي عمليات الفحص: ${compliance.totalChecks}\n`;
    report += `ناجحة: ${compliance.passed}\n`;
    report += `فاشلة: ${compliance.failed}\n`;
    report += `معدل الامتثال: ${compliance.complianceRate}%\n`;
    
    alert(report);
}

async function viewCheck(id) {
    const check = await db.get('quality_checks', id);
    if (!check) return;
    
    let details = `تفاصيل الفحص:\n\n`;
    details += `النوع: ${check.type}\n`;
    details += `القيمة: ${check.value}\n`;
    details += `النتيجة: ${check.result === 'pass' ? 'مقبول' : 'مرفوض'}\n`;
    details += `التاريخ: ${new Date(check.date).toLocaleDateString('ar-SA')}\n`;
    
    if (check.description) {
        details += `ملاحظات: ${check.description}\n`;
    }
    
    alert(details);
}

async function resolveIssue(id) {
    if (!confirm('هل تريد حل هذه المشكلة؟')) return;
    
    const issue = await db.get('quality_issues', id);
    if (!issue) return;
    
    issue.status = 'resolved';
    issue.resolvedAt = new Date().toISOString();
    
    await db.put('quality_issues', issue);
    alert('✅ تم حل المشكلة');
    location.reload();
}
