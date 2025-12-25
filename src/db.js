import { CONFIG } from './config.js';

class PoultryDB {
    constructor() {
        this.db = null;
        this.initializePromise = null;
    }

    async initialize() {
        if (this.initializePromise) {
            return this.initializePromise;
        }

        this.initializePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.DB.NAME, CONFIG.DB.VERSION);

            request.onerror = (event) => {
                console.error('❌ فشل في فتح قاعدة البيانات:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ قاعدة البيانات جاهزة');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 ترقية قاعدة البيانات...');

                // إنشاء Object Stores
                this.createStores(db);
                this.initializeData(db);
            };
        });

        return this.initializePromise;
    }

    createStores(db) {
        // تخزين الدفعات
        if (!db.objectStoreNames.contains(CONFIG.DB.STORES.FLOCKS)) {
            const flockStore = db.createObjectStore(CONFIG.DB.STORES.FLOCKS, { keyPath: 'id' });
            flockStore.createIndex('status', 'status', { unique: false });
            flockStore.createIndex('breed', 'breed', { unique: false });
            flockStore.createIndex('startDate', 'startDate', { unique: false });
        }

        // تخزين المخزون
        if (!db.objectStoreNames.contains(CONFIG.DB.STORES.INVENTORY)) {
            const inventoryStore = db.createObjectStore(CONFIG.DB.STORES.INVENTORY, { keyPath: 'id' });
            inventoryStore.createIndex('category', 'category', { unique: false });
            inventoryStore.createIndex('qty', 'qty', { unique: false });
            inventoryStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // تخزين المعاملات المالية
        if (!db.objectStoreNames.contains(CONFIG.DB.STORES.TRANSACTIONS)) {
            const transactionStore = db.createObjectStore(CONFIG.DB.STORES.TRANSACTIONS, { keyPath: 'id' });
            transactionStore.createIndex('type', 'type', { unique: false });
            transactionStore.createIndex('date', 'date', { unique: false });
            transactionStore.createIndex('category', 'category', { unique: false });
            transactionStore.createIndex('amount', 'amount', { unique: false });
        }

        // تخزين السجلات الصحية
        if (!db.objectStoreNames.contains(CONFIG.DB.STORES.HEALTH_RECORDS)) {
            const healthStore = db.createObjectStore(CONFIG.DB.STORES.HEALTH_RECORDS, { keyPath: 'id' });
            healthStore.createIndex('flockId', 'flockId', { unique: false });
            healthStore.createIndex('date', 'date', { unique: false });
            healthStore.createIndex('type', 'type', { unique: false });
        }

        // تخزين بيانات البيئة
        if (!db.objectStoreNames.contains(CONFIG.DB.STORES.ENVIRONMENT_DATA)) {
            const envStore = db.createObjectStore(CONFIG.DB.STORES.ENVIRONMENT_DATA, { keyPath: 'id' });
            envStore.createIndex('timestamp', 'timestamp', { unique: false });
            envStore.createIndex('sensorId', 'sensorId', { unique: false });
        }

        // تخزين المستخدمين
        if (!db.objectStoreNames.contains(CONFIG.DB.STORES.USERS)) {
            db.createObjectStore(CONFIG.DB.STORES.USERS, { keyPath: 'id' });
        }

        // تخزين الإعدادات
        if (!db.objectStoreNames.contains(CONFIG.DB.STORES.SETTINGS)) {
            db.createObjectStore(CONFIG.DB.STORES.SETTINGS, { keyPath: 'key' });
        }
    }

    initializeData(db) {
        // بيانات أولية للمخزون
        const inventoryData = [
            {
                id: 1,
                name: 'علف مبدئي (Starter)',
                sku: 'FED-001',
                category: 'علف',
                qty: 2000,
                unit: 'كجم',
                minStock: 500,
                maxStock: 3000,
                price: 2.5,
                supplier: 'شركة الأعلاف المتحدة',
                location: 'مستودع A',
                batchNumber: 'BATCH-2024-001',
                expiryDate: '2024-12-31',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 2,
                name: 'علف نهائي (Finisher)',
                sku: 'FED-002',
                category: 'علف',
                qty: 1500,
                unit: 'كجم',
                minStock: 400,
                maxStock: 2500,
                price: 2.3,
                supplier: 'شركة الأعلاف المتحدة',
                location: 'مستودع A',
                batchNumber: 'BATCH-2024-002',
                expiryDate: '2024-12-31',
                lastUpdated: new Date().toISOString()
            }
        ];

        const transaction = db.transaction([CONFIG.DB.STORES.INVENTORY], 'readwrite');
        const store = transaction.objectStore(CONFIG.DB.STORES.INVENTORY);
        
        inventoryData.forEach(item => {
            store.put(item);
        });
    }

    // === دوال CRUD عامة ===
    
    async add(storeName, data) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, key) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName, indexName = null, range = null) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName) {
                const index = store.index(indexName);
                request = range ? index.getAll(range) : index.getAll();
            } else {
                request = store.getAll();
            }
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async count(storeName, indexName = null, key = null) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName && key !== null) {
                const index = store.index(indexName);
                request = index.count(key);
            } else {
                request = store.count();
            }
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // === دوال خاصة بالمخزون ===
    
    async getLowStockItems() {
        const allItems = await this.getAll(CONFIG.DB.STORES.INVENTORY);
        return allItems.filter(item => item.qty <= item.minStock);
    }

    async updateInventoryQuantity(itemId, change, type = 'adjustment') {
        const item = await this.get(CONFIG.DB.STORES.INVENTORY, itemId);
        if (!item) throw new Error('الصنف غير موجود');
        
        const newQty = item.qty + change;
        if (newQty < 0) throw new Error('الكمية لا يمكن أن تكون سالبة');
        
        item.qty = newQty;
        item.lastUpdated = new Date().toISOString();
        
        // تسجيل الحركة
        await this.add(CONFIG.DB.STORES.TRANSACTIONS, {
            id: Date.now(),
            type: 'inventory',
            subtype: type,
            itemId: itemId,
            itemName: item.name,
            change: change,
            previousQty: item.qty - change,
            newQty: newQty,
            date: new Date().toISOString(),
            userId: 'system'
        });
        
        return this.put(CONFIG.DB.STORES.INVENTORY, item);
    }

    async getInventoryValue() {
        const items = await this.getAll(CONFIG.DB.STORES.INVENTORY);
        return items.reduce((total, item) => {
            return total + (item.qty * (item.price || 0));
        }, 0);
    }

    async getExpiringItems(days = 30) {
        const items = await this.getAll(CONFIG.DB.STORES.INVENTORY);
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + days);
        
        return items.filter(item => {
            if (!item.expiryDate) return false;
            const expiry = new Date(item.expiryDate);
            return expiry <= thresholdDate && expiry >= new Date();
        });
    }

    // === دوال خاصة بالدفعات ===
    
    async getActiveFlocks() {
        return this.getAll(CONFIG.DB.STORES.FLOCKS, 'status', 'active');
    }

    async getFlockPerformance(flockId) {
        const flock = await this.get(CONFIG.DB.STORES.FLOCKS, flockId);
        if (!flock) return null;
        
        // حساب مؤشرات الأداء
        const feedTransactions = await this.getAll(
            CONFIG.DB.STORES.TRANSACTIONS,
            'type',
            IDBKeyRange.bound('feed_consumption', 'feed_consumption')
        );
        
        const flockFeed = feedTransactions.filter(t => t.flockId === flockId);
        const totalFeed = flockFeed.reduce((sum, t) => sum + t.amount, 0);
        
        return {
            flock,
            totalFeed,
            averageDailyFeed: totalFeed / (flock.age || 1),
            feedCost: totalFeed * 2.5 // سعر تقديري
        };
    }

    // === دوال مالية ===
    
    async getFinancialSummary(startDate, endDate) {
        const transactions = await this.getAll(
            CONFIG.DB.STORES.TRANSACTIONS,
            'date',
            IDBKeyRange.bound(startDate, endDate)
        );
        
        const summary = {
            totalIncome: 0,
            totalExpenses: 0,
            netProfit: 0,
            byCategory: {}
        };
        
        transactions.forEach(transaction => {
            if (transaction.type === 'income') {
                summary.totalIncome += transaction.amount;
            } else if (transaction.type === 'expense') {
                summary.totalExpenses += transaction.amount;
            }
            
            if (!summary.byCategory[transaction.category]) {
                summary.byCategory[transaction.category] = 0;
            }
            summary.byCategory[transaction.category] += transaction.amount;
        });
        
        summary.netProfit = summary.totalIncome - summary.totalExpenses;
        return summary;
    }

    async addFinancialTransaction(data) {
        const transactionData = {
            id: Date.now(),
            ...data,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        
        await this.add(CONFIG.DB.STORES.TRANSACTIONS, transactionData);
        
        // إذا كانت حركة مخزون
        if (data.itemId) {
            await this.updateInventoryQuantity(
                data.itemId,
                data.type === 'purchase' ? data.quantity : -data.quantity,
                data.type
            );
        }
        
        return transactionData;
    }

    // === نسخ احتياطي واستعادة ===
    
    async backup() {
        await this.initialize();
        const backupData = {};
        
        const storeNames = Array.from(this.db.objectStoreNames);
        
        for (const storeName of storeNames) {
            backupData[storeName] = await this.getAll(storeName);
        }
        
        return backupData;
    }

    async restore(backupData) {
        await this.initialize();
        
        // حذف البيانات القديمة
        const storeNames = Array.from(this.db.objectStoreNames);
        for (const storeName of storeNames) {
            const items = await this.getAll(storeName);
            for (const item of items) {
                await this.delete(storeName, item.id || item.key);
            }
        }
        
        // استعادة البيانات الجديدة
        for (const [storeName, data] of Object.entries(backupData)) {
            for (const item of data) {
                await this.put(storeName, item);
            }
        }
        
        return true;
    }

    // === إحصائيات ===
    
    async getDashboardStats() {
        const [
            activeFlocks,
            lowStockItems,
            totalInventoryValue,
            recentTransactions
        ] = await Promise.all([
            this.getActiveFlocks(),
            this.getLowStockItems(),
            this.getInventoryValue(),
            this.getAll(CONFIG.DB.STORES.TRANSACTIONS, 'date')
        ]);
        
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const monthlySummary = await this.getFinancialSummary(
            lastMonth.toISOString(),
            new Date().toISOString()
        );
        
        return {
            activeFlocks: activeFlocks.length,
            totalBirds: activeFlocks.reduce((sum, flock) => sum + flock.count, 0),
            lowStockAlerts: lowStockItems.length,
            inventoryValue: totalInventoryValue,
            monthlyIncome: monthlySummary.totalIncome,
            monthlyExpenses: monthlySummary.totalExpenses,
            monthlyProfit: monthlySummary.netProfit,
            recentActivity: recentTransactions.slice(-10).reverse()
        };
    }
}

// إنشاء نسخة واحدة من قاعدة البيانات
const db = new PoultryDB();

export { db };
export async function initializeDB() {
    return db.initialize();
}
// الخطأ: Missing function implementations
// التصحيح: إضافة الدوال الناقصة:

// إضافة هذه الدالة في نهاية الكلاس
async getInventorySummary() {
    const items = await this.getAll('inventory');
    
    const totalValue = items.reduce((sum, item) => 
        sum + (item.qty * (item.price || 0)), 0);
    
    const lowStock = items.filter(item => item.qty <= item.minStock).length;
    
    const expiringSoon = items.filter(item => {
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiry <= thirtyDaysFromNow;
    }).length;
    
    return {
        totalItems: items.length,
        totalValue: totalValue,
        lowStock: lowStock,
        expiringSoon: expiringSoon
    };
}
