const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// دالة لقراءة الملفات بشكل متزامن
function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

// دالة لكتابة الملفات
function writeFile(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
}

// دالة لنسخ الملفات
function copyFile(source, destination) {
    fs.copyFileSync(source, destination);
}

// دالة لحزم JavaScript
async function bundleJS() {
    console.log('📦 حزم ملفات JavaScript...');
    
    const entryPoint = 'src/main.js';
    const outputFile = 'dist/bundle.js';
    
    // قائمة الملفات التي تحتاج إلى حزم
    const files = [
        'src/main.js',
        'src/config.js',
        'src/db.js',
        'src/state.js',
        'src/router.js',
        // إضافة جميع الملفات الأخرى
    ];
    
    let bundleContent = `// 🐓 Poultry ERP - Bundled Version\n// Generated: ${new Date().toISOString()}\n\n`;
    
    // قراءة ودمج الملفات
    for (const file of files) {
        if (fs.existsSync(file)) {
            const content = readFile(file);
            bundleContent += `\n// ======== ${file} ========\n`;
            bundleContent += content;
        }
    }
    
    // إضافة polyfills للتوافق
    bundleContent += `
// Polyfills for older browsers
if (!window.Promise) {
    console.warn('Promise not supported - adding polyfill');
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration.scope);
            })
            .catch(error => {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
}
    `;
    
    writeFile(outputFile, bundleContent);
    console.log('✅ تم إنشاء bundle.js');
}

// دالة لحزم CSS
function bundleCSS() {
    console.log('🎨 حزم ملفات CSS...');
    
    const cssFiles = [
        'src/styles/main.css',
        'src/styles/components.css',
        'src/styles/responsive.css',
        'src/styles/themes.css'
    ];
    
    let bundleCSS = `/* Poultry ERP - Bundled CSS */\n/* Generated: ${new Date().toISOString()} */\n\n`;
    
    for (const file of cssFiles) {
        if (fs.existsSync(file)) {
            const content = readFile(file);
            bundleCSS += `\n/* ======== ${file} ======== */\n`;
            bundleCSS += content;
        }
    }
    
    writeFile('dist/bundle.css', bundleCSS);
    console.log('✅ تم إنشاء bundle.css');
}

// دالة لإنشاء dist directory
function createDist() {
    const distPath = 'dist';
    const assetsPath = 'dist/assets';
    
    if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
    }
    
    if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
    }
    
    console.log('📁 تم إنشاء مجلد dist');
}

// دالة لنسخ الملفات الثابتة
function copyStaticFiles() {
    const filesToCopy = [
        { source: 'index.html', destination: 'dist/index.html' },
        { source: 'manifest.json', destination: 'dist/manifest.json' },
        { source: 'service-worker.js', destination: 'dist/service-worker.js' },
        { source: 'public/favicon.ico', destination: 'dist/favicon.ico' },
        { source: 'public/icon-192.png', destination: 'dist/icon-192.png' },
        { source: 'public/icon-512.png', destination: 'dist/icon-512.png' },
        { source: 'robots.txt', destination: 'dist/robots.txt' }
    ];
    
    filesToCopy.forEach(({ source, destination }) => {
        if (fs.existsSync(source)) {
            copyFile(source, destination);
            console.log(`📄 تم نسخ: ${source} -> ${destination}`);
        }
    });
}

// دالة البناء الرئيسية
async function build() {
    console.log('🚀 بدء بناء التطبيق...');
    
    try {
        // إنشاء مجلد dist
        createDist();
        
        // نسخ الملفات الثابتة
        copyStaticFiles();
        
        // حزم JavaScript
        await bundleJS();
        
        // حزم CSS
        bundleCSS();
        
        // تحديث index.html لاستخدام الملفات المحزمة
        let indexHtml = readFile('dist/index.html');
        indexHtml = indexHtml.replace(
            /<link rel="stylesheet" href="[^"]*">/g,
            '<link rel="stylesheet" href="bundle.css">'
        );
        indexHtml = indexHtml.replace(
            /<script type="module" src="[^"]*"><\/script>/,
            '<script src="bundle.js" defer></script>'
        );
        
        writeFile('dist/index.html', indexHtml);
        
        console.log('🎉 تم بناء التطبيق بنجاح في مجلد dist/');
        console.log('📊 حجم الملفات:');
        
        const files = fs.readdirSync('dist');
        files.forEach(file => {
            const stats = fs.statSync(path.join('dist', file));
            console.log(`  ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
        });
        
    } catch (error) {
        console.error('❌ خطأ في البناء:', error);
        process.exit(1);
    }
}

// تشغيل البناء
if (require.main === module) {
    build();
}

module.exports = { build };
