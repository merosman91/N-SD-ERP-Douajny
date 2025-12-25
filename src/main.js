import { initializeApp } from './core/app.js';
import { initializeRouter } from './router.js';
import { initializeDB } from './db.js';
import { loadState, saveState } from './state.js';

// تهيئة التطبيق
async function main() {
    try {
        // تحميل الإعدادات
        await initializeDB();
        
        // تحميل حالة التطبيق
        await loadState();
        
        // تهيئة نظام التوجيه
        initializeRouter();
        
        // تهيئة التطبيق
        initializeApp();
        
        // حفظ الحالة تلقائياً
        setInterval(saveState, 30000); // كل 30 ثانية
        
        console.log('✅ تطبيق إدارة الدواجن جاهز للاستخدام');
    } catch (error) {
        console.error('❌ فشل في تهيئة التطبيق:', error);
    }
}

// تشغيل التطبيق عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

// تصدير للاستخدام في الوحدات الأخرى
export { main };
