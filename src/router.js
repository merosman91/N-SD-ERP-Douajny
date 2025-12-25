import { appState, updateState } from './state.js';
import * as Dashboard from './modules/dashboard/index.js';
import * as Flocks from './modules/flocks/index.js';
import * as Inventory from './modules/inventory/index.js';
import * as Finance from './modules/finance/index.js';
import * as Reports from './modules/reports/index.js';
import * as Quality from './modules/quality/index.js';
import * as Environment from './modules/environment/index.js';
import * as Health from './modules/health/index.js';
import * as Settings from './modules/settings/index.js';

class Router {
    constructor() {
        this.routes = {
            'dashboard': Dashboard,
            'flocks': Flocks,
            'flock-details': Flocks.renderFlockDetails,
            'add-flock': Flocks.renderAddFlock,
            'inventory': Inventory,
            'finance': Finance,
            'reports': Reports,
            'quality': Quality,
            'environment': Environment,
            'health': Health,
            'notifications': this.renderNotifications,
            'settings': Settings
        };
        
        this.history = [];
        this.currentRoute = null;
        
        this.initializeNavigation();
    }
    
    initializeNavigation() {
        // إضافة مستمعي الأحداث للتنقل
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.dataset.route;
                const params = link.dataset.params ? JSON.parse(link.dataset.params) : {};
                this.navigate(route, params);
            }
        });
        
        // زر العودة
        document.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
        
        // التعامل مع زر الرجوع في المتصفح
        window.addEventListener('popstate', () => {
            this.handleBrowserBack();
        });
    }
    
    async navigate(route, params = {}) {
        if (this.currentRoute === route && JSON.stringify(params) === JSON.stringify(this.currentParams)) {
            return; // نفس الصفحة، لا حاجة لإعادة التحميل
        }
        
        // تحديث العنوان في المتصفح
        window.history.pushState({ route, params }, '', `#${route}`);
        
        // حفظ في السجل
        this.history.push({ route, params, timestamp: Date.now() });
        
        // تحديث الحالة
        this.currentRoute = route;
        this.currentParams = params;
        
        await this.renderRoute(route, params);
    }
    
    async renderRoute(route, params) {
        const container = document.getElementById('mainContent');
        const header = document.getElementById('headerTitle');
        const backBtn = document.getElementById('backBtn');
        const mainNav = document.getElementById('mainNav');
        
        if (!container) return;
        
        // عرض مؤشر التحميل
        container.innerHTML = '<div class="loading-spinner"><div></div><div></div><div></div><div></div></div>';
        
        try {
            // إدارة واجهة التنقل
            const topLevelRoutes = ['dashboard', 'flocks', 'inventory', 'finance', 'reports', 'quality', 'environment', 'settings'];
            const isTopLevel = topLevelRoutes.includes(route);
            
            if (isTopLevel) {
                mainNav?.classList.remove('hidden');
                backBtn?.classList.add('hidden');
                updateState({ selectedModule: route });
                this.updateActiveNav(route);
            } else {
                mainNav?.classList.add('hidden');
                backBtn?.classList.remove('hidden');
            }
            
            // تحديث عنوان الصفحة
            if (header) {
                header.textContent = this.getRouteTitle(route);
            }
            
            // تحميل البيانات الخاصة بالشاشة
            const screenData = await appState.loadScreenData(route);
            
            // عرض المحتوى
            const renderFunction = this.routes[route];
            if (typeof renderFunction === 'function') {
                await renderFunction(container, { ...params, ...screenData });
            } else if (renderFunction && typeof renderFunction.default === 'function') {
                await renderFunction.default(container, { ...params, ...screenData });
            } else {
                container.innerHTML = `<div class="error-message"><h3>الصفحة غير موجودة</h3><p>مسار "${route}" غير صحيح</p></div>`;
            }
            
            // تحديث الحالة
            updateState({ currentRoute: route });
            
        } catch (error) {
            console.error(`❌ خطأ في تحميل المسار ${route}:`, error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>حدث خطأ في تحميل الصفحة</h3>
                    <p>${error.message}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">إعادة تحميل</button>
                </div>
            `;
        }
    }
    
    goBack() {
        if (this.history.length > 1) {
            this.history.pop(); // إزالة الصفحة الحالية
            const previous = this.history.pop(); // الحصول على السابقة
            
            if (previous) {
                this.navigate(previous.route, previous.params);
            }
        } else {
            this.navigate('dashboard');
        }
    }
    
    handleBrowserBack() {
        if (this.history.length > 1) {
            this.history.pop();
            const previous = this.history[this.history.length - 1];
            
            if (previous) {
                this.currentRoute = previous.route;
                this.currentParams = previous.params;
                this.renderRoute(previous.route, previous.params);
            }
        }
    }
    
    updateActiveNav(route) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.route === route) {
                item.classList.add('active');
            }
        });
    }
    
    getRouteTitle(route) {
        const titles = {
            'dashboard': 'لوحة التحكم',
            'flocks': 'إدارة الدفعات',
            'inventory': 'المخزون',
            'finance': 'الإدارة المالية',
            'reports': 'التقارير',
            'quality': 'مراقبة الجودة',
            'environment': 'البيئة',
            'health': 'السجل الصحي',
            'notifications': 'الإشعارات',
            'settings': 'الإعدادات',
            'add-flock': 'دفعة جديدة',
            'flock-details': 'تفاصيل الدفعة'
        };
        
        return titles[route] || route;
    }
    
    // دالة للمساعدة في إنشاء روابط
    createLink(route, params = {}, text, icon = null, className = '') {
        const paramsStr = JSON.stringify(params);
        return `
            <a href="#" data-route="${route}" data-params='${paramsStr}' class="${className}">
                ${icon ? `<i class="${icon}"></i>` : ''}
                ${text}
            </a>
        `;
    }
}

// إنشاء الراوتر
const router = new Router();

// تصدير دوال مفيدة
export function initializeRouter() {
    // معالجة المسار الأولي
    const hash = window.location.hash.substring(1) || 'dashboard';
    const [route, ...params] = hash.split('/');
    
    router.navigate(route, params);
}

export function navigateTo(route, params = {}) {
    router.navigate(route, params);
}

export function goBack() {
    router.goBack();
}

export default router;
