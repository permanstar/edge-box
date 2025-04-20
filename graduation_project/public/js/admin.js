/**
 * 管理员页面控制器
 */
document.addEventListener('DOMContentLoaded', async function() {
    // 检查用户是否已登录
    try {
        const response = await fetch('/api/profile', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            // 认证失败，重定向到登录页
            window.location.href = '/login';
            return;
        }
        
        const data = await response.json();
        
        // 检查用户角色
        if (data.user.role !== 'admin') {
            // 不是管理员，重定向到用户页面
            window.location.href = '/user';
            return;
        }
        
        // 显示用户名
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = data.user.username;
        }
        
        // 初始化管理员界面
        initializeAdminInterface();
    } catch (error) {
        console.error('认证检查失败', error);
        window.location.href = '/login';
    }
    
    // 处理登出按钮点击
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    window.location.href = '/login';
                } else {
                    console.error('登出失败');
                }
            } catch (error) {
                console.error('登出请求失败', error);
            }
        });
    }
    
    // 设置导航
    setupNavigation();
    
    // 初始化权限管理功能
    initPermissionsManagement();
});

/**
 * 初始化管理员界面
 */
async function initializeAdminInterface() {
    try {
        // 创建服务实例
        const deviceService = new DeviceService();
        const uiController = new UIController(deviceService);
        const wsService = new WebSocketService();
        
        // 初始化UI
        uiController.init();
        
        // 获取初始数据
        console.log('正在获取初始数据...');
        const initialData = await deviceService.fetchDevices();
        console.log('获取到初始数据:', initialData);
        uiController.updateDashboard(initialData);
        
        // 订阅WebSocket数据更新
        wsService.subscribe(data => {
            console.log('收到WebSocket数据更新:', data);
            // 更新设备服务缓存
            deviceService.updateCache(data);
            // 更新UI
            uiController.updateDashboard(data);
        });
        
        // 初始化WebSocket
        wsService.init();
        
        console.log('管理员界面初始化完成');
    } catch (error) {
        console.error('管理员界面初始化失败:', error);
        // 尝试显示通知
        try {
            const notification = document.getElementById('notification');
            if (notification) {
                notification.textContent = '系统初始化失败，请刷新页面重试';
                notification.classList.add('error');
                notification.style.display = 'block';
                
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 5000);
            }
        } catch (e) {
            console.error('无法显示通知:', e);
        }
    }
}

// 在admin.js中添加页面关闭前的清理
window.addEventListener('beforeunload', () => {
    // 清理WebSocket连接
    try {
        const wsService = new WebSocketService();
        wsService.close();
    } catch (e) {
        console.error('关闭WebSocket连接失败:', e);
    }
});

/**
 * 设置导航
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 获取目标部分ID
            const targetId = this.getAttribute('data-section');
            
            // 移除所有active类
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            });
            
            // 添加active类
            this.classList.add('active');
            document.getElementById(targetId).style.display = 'block';
        });
    });
}