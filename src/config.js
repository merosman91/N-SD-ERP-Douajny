export const CONFIG = {
    // إعدادات التطبيق
    APP: {
        NAME: 'نظام دواجني',
        VERSION: '2.0.0',
        CURRENCY: 'ر.س',
        LANGUAGE: 'ar',
        SUPPORTED_LANGUAGES: ['ar', 'en']
    },
    
    // إعدادات الوحدات
    UNITS: {
        WEIGHT: {
            DEFAULT: 'كجم',
            OPTIONS: ['كجم', 'طن', 'باوند']
        },
        TEMPERATURE: {
            DEFAULT: 'مئوية',
            OPTIONS: ['مئوية', 'فهرنهايت']
        },
        VOLUME: {
            DEFAULT: 'لتر',
            OPTIONS: ['لتر', 'جالون', 'م³']
        }
    },
    
    // إعدادات المخزون
    INVENTORY: {
        LOW_STOCK_THRESHOLD: 0.2, // 20% من الحد الأدنى
        REORDER_POINT_MULTIPLIER: 1.5,
        DEFAULT_CATEGORIES: ['علف', 'أدوية', 'مطهرات', 'مستلزمات', 'معدات']
    },
    
    // إعدادات المالية
    FINANCE: {
        DEFAULT_CATEGORIES: {
            EXPENSES: ['علف', 'دواجن', 'أدوية', 'عمالة', 'مرافق', 'صيانة', 'نقل'],
            REVENUE: ['بيع دواجن', 'بيع مخلفات', 'خدمات', 'إعانات']
        },
        VAT_RATE: 0.15, // 15%
        CURRENCY_FORMAT: 'ar-SA'
    },
    
    // إعدادات الجودة
    QUALITY: {
        PARAMETERS: {
            TEMPERATURE: { MIN: 20, MAX: 26, OPTIMAL: 23 },
            HUMIDITY: { MIN: 50, MAX: 70, OPTIMAL: 60 },
            AMMONIA: { MAX: 25, WARNING: 15 }, // ppm
            CO2: { MAX: 3000, WARNING: 2000 } // ppm
        }
    },
    
    // إعدادات KPI
    KPI: {
        TARGETS: {
            MORTALITY_RATE: 5, // 5%
            FCR: 1.6, // Feed Conversion Ratio
            EPEW: 2.2, // وزن الطائر النهائي بالكجم
            PRODUCTION_COST_PER_KG: 12 // ريال لكل كيلو
        }
    },
    
    // إعدادات قاعدة البيانات
    DB: {
        NAME: 'PoultryERP',
        VERSION: 3,
        STORES: {
            FLOCKS: 'flocks',
            INVENTORY: 'inventory',
            TRANSACTIONS: 'transactions',
            HEALTH_RECORDS: 'health_records',
            ENVIRONMENT_DATA: 'environment_data',
            USERS: 'users',
            SETTINGS: 'settings'
        }
    }
};

// ديناميكي الإعدادات
export let USER_CONFIG = {};

export function updateUserConfig(newConfig) {
    USER_CONFIG = { ...USER_CONFIG, ...newConfig };
    localStorage.setItem('user_config', JSON.stringify(USER_CONFIG));
}

export function loadUserConfig() {
    const saved = localStorage.getItem('user_config');
    if (saved) {
        USER_CONFIG = JSON.parse(saved);
    }
    return USER_CONFIG;
}
