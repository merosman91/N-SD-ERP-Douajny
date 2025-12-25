import { db } from './db.js';
import { CONFIG, loadUserConfig } from './config.js';

class AppState {
    constructor() {
        this.state = {
            user: null,
            settings: {},
            currentFlockId: null,
            notifications: [],
            selectedModule: 'dashboard',
            theme: 'dark',
            language: 'ar',
            isLoading: false,
            lastSync: null
        };
        
        this.listeners = new Set();
    }
    
    async initialize() {
        // تحميل إعدادات المستخدم
        const userConfig = loadUserConfig();
        this.state.settings = { ...CONFIG, ...userConfig };
        
        // تحميل الإشعارات
        await this.loadNotifications();
        
        // تحميل المستخدم
        await this.loadUser();
        
        console.log('✅ حالة التطبيق جاهزة');
    }
    
    async loadUser() {
        try {
            const user = await db.get('users', 'current');
            if (user) {
                this.state.user = user;
            } else {
                // مستخدم افتراضي
                this.state.user = {
                    id: 'admin',
                    name: 'مدير النظام',
                    role: 'admin',
                    permissions: ['*'],
                    lastLogin: new Date().toISOString()
                };
                await db.put('users', { key: 'current', ...this.state.user });
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل بيانات المستخدم:', error);
        }
    }
    
    async loadNotifications() {
        try {
            const notifications = await db.getAll('notifications', 'read', false);
            this.state.notifications = notifications;
        } catch (error) {
            console.error('❌ خطأ في تحميل الإشعارات:', error);
        }
    }
    
    // تحديث الحالة وإشعار المكونات
    update(updates) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        // إشعار جميع المكونات المشتركة
        this.listeners.forEach(listener => {
            listener(this.state, oldState);
        });
        
        // حفظ التغييرات تلقائياً
        this.autoSave();
    }
    
    // الاشتراك في تغييرات الحالة
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    // حفظ الحالة
    async save() {
        try {
            // حفظ الإعدادات
            await db.put('settings', { 
                key: 'app_state', 
                ...this.state 
            });
            
            this.state.lastSync = new Date().toISOString();
            console.log('💾 تم حفظ حالة التطبيق');
        } catch (error) {
            console.error('❌ خطأ في حفظ الحالة:', error);
        }
    }
    
    // حفظ تلقائي
    autoSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.save();
        }, 5000);
    }
    
    // استعادة الحالة
    async restore() {
        try {
            const saved = await db.get('settings', 'app_state');
            if (saved) {
                this.state = { ...this.state, ...saved };
                console.log('🔄 تم استعادة حالة التطبيق');
            }
        } catch (error) {
            console.error('❌ خطأ في استعادة الحالة:', error);
        }
    }
    
    // تحميل بيانات الشاشة
    async loadScreenData(screen) {
        this.update({ isLoading: true });
        
        try {
            let data = {};
            
            switch(screen) {
                case 'dashboard':
                    data = await this.loadDashboardData();
                    break;
                case 'flocks':
                    data = await this.loadFlocksData();
                    break;
                case 'inventory':
                    data = await this.loadInventoryData();
                    break;
                case 'finance':
                    data = await this.loadFinanceData();
                    break;
                case 'reports':
                    data = await this.loadReportsData();
                    break;
                case 'quality':
                    data = await this.loadQualityData();
                    break;
            }
            
            return data;
        } finally {
            this.update({ isLoading: false });
        }
    }
    
    async loadDashboardData() {
        const [stats, alerts, recentActivity] = await Promise.all([
            db.getDashboardStats(),
            db.getLowStockItems(),
            db.getAll('transactions', 'date')
        ]);
        
        return {
            stats,
            alerts: alerts.slice(0, 5),
            recentActivity: recentActivity.slice(-10).reverse(),
            kpis: await this.calculateKPIs()
        };
    }
    
    async loadFlocksData() {
        const [activeFlocks, completedFlocks] = await Promise.all([
            db.getActiveFlocks(),
            db.getAll('flocks', 'status', 'completed')
        ]);
        
        return {
            active: activeFlocks,
            completed: completedFlocks,
            totalCount: activeFlocks.length + completedFlocks.length
        };
    }
    
    async loadInventoryData() {
        const [items, categories, suppliers] = await Promise.all([
            db.getAll('inventory'),
            this.getInventoryCategories(),
            this.getSuppliers()
        ]);
        
        return {
            items,
            categories,
            suppliers,
            summary: await this.getInventorySummary()
        };
    }
    
    async loadFinanceData() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const [monthlySummary, recentTransactions, budget] = await Promise.all([
            db.getFinancialSummary(startOfMonth.toISOString(), now.toISOString()),
            db.getAll('transactions', 'date').then(t => t.slice(-20).reverse()),
            db.get('settings', 'budget')
        ]);
        
        return {
            monthlySummary,
            recentTransactions,
            budget: budget || {},
            charts: await this.generateFinanceCharts()
        };
    }
    
    async loadReportsData() {
        const [flockReports, financialReports, inventoryReports] = await Promise.all([
            this.generateFlockReports(),
            this.generateFinancialReports(),
            this.generateInventoryReports()
        ]);
        
        return {
            flockReports,
            financialReports,
            inventoryReports,
            availableReports: this.getAvailableReportTemplates()
        };
    }
    
    async loadQualityData() {
        const [qualityMetrics, complianceData, issues] = await Promise.all([
            this.getQualityMetrics(),
            this.getComplianceData(),
            this.getQualityIssues()
        ]);
        
        return {
            metrics: qualityMetrics,
            compliance: complianceData,
            issues: issues,
            standards: CONFIG.QUALITY.PARAMETERS
        };
    }
    
    // دوال مساعدة
    async calculateKPIs() {
        const stats = await db.getDashboardStats();
        
        return {
            mortalityRate: this.calculateMortalityRate(stats),
            fcr: this.calculateFCR(stats),
            productionCost: this.calculateProductionCost(stats),
            profitability: this.calculateProfitability(stats)
        };
    }
    
    async getInventoryCategories() {
        const items = await db.getAll('inventory');
        const categories = [...new Set(items.map(item => item.category))];
        return categories;
    }
    
    async getSuppliers() {
        const items = await db.getAll('inventory');
        const suppliers = [...new Set(items.map(item => item.supplier).filter(Boolean))];
        return suppliers;
    }
    
    async getInventorySummary() {
        const items = await db.getAll('inventory');
        
        return {
            totalItems: items.length,
            totalValue: items.reduce((sum, item) => sum + (item.qty * (item.price || 0)), 0),
            lowStock: items.filter(item => item.qty <= item.minStock).length,
            expiringSoon: items.filter(item => {
                if (!item.expiryDate) return false;
                const expiry = new Date(item.expiryDate);
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                return expiry <= thirtyDaysFromNow;
            }).length
        };
    }
    
    calculateMortalityRate(stats) {
        // حساب معدل النفوق
        return 0;
    }
    
    calculateFCR(stats) {
        // حساب معامل التحويل الغذائي
        return 0;
    }
    
    calculateProductionCost(stats) {
        // حساب تكلفة الإنتاج
        return 0;
    }
    
    calculateProfitability(stats) {
        // حساب الربحية
        return 0;
    }
    
    async generateFinanceCharts() {
        // توليد بيانات الرسوم البيانية المالية
        return {
            incomeVsExpenses: [],
            cashFlow: [],
            budgetVsActual: []
        };
    }
    
    async generateFlockReports() {
        // توليد تقارير الدفعات
        return [];
    }
    
    async generateFinancialReports() {
        // توليد التقارير المالية
        return [];
    }
    
    async generateInventoryReports() {
        // توليد تقارير المخزون
        return [];
    }
    
    async getAvailableReportTemplates() {
        return [
            { id: 'flock-performance', name: 'أداء الدفعات', category: 'flocks' },
            { id: 'financial-summary', name: 'ملخص مالي', category: 'finance' },
            { id: 'inventory-status', name: 'حالة المخزون', category: 'inventory' },
            { id: 'quality-control', name: 'مراقبة الجودة', category: 'quality' }
        ];
    }
    
    async getQualityMetrics() {
        // الحصول على مقاييس الجودة
        return [];
    }
    
    async getComplianceData() {
        // بيانات الامتثال
        return [];
    }
    
    async getQualityIssues() {
        // المشاكل الجارية
        return [];
    }
}

// إنشاء نسخة واحدة من حالة التطبيق
const appState = new AppState();

export { appState };

// دوال مساعدة للتصدير
export async function loadState() {
    await appState.initialize();
}

export async function saveState() {
    await appState.save();
}

export function getState() {
    return appState.state;
}

export function updateState(updates) {
    appState.update(updates);
}

export function subscribeToState(listener) {
    return appState.subscribe(listener);
}

export async function loadScreenData(screen) {
    return appState.loadScreenData(screen);
}
