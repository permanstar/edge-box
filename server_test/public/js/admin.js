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
        
        // 添加导航功能
        setupNavigation();
        
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
 * 设置导航功能
 */
function setupNavigation() {
    // 默认显示设备管理区域
    showTab('devices-management'); // 如果您有这个ID的话
    
    // 添加导航按钮或菜单
    const navItems = document.querySelectorAll('.nav-item'); // 假设您有导航项
    if (navItems.length > 0) {
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                showTab(tabId);
            });
        });
    } else {
        // 如果没有导航菜单，您可以在这里添加一个
        const header = document.querySelector('.header');
        if (header) {
            const nav = document.createElement('div');
            nav.className = 'admin-nav';
            nav.innerHTML = `
                <button class="nav-item active" data-tab="devices-management">设备管理</button>
                <button class="nav-item" data-tab="permissions-management">权限管理</button>
                <button class="nav-item" data-tab="user-management">用户管理</button>
            `;
            header.appendChild(nav);
            
            // 绑定事件
            const buttons = nav.querySelectorAll('.nav-item');
            buttons.forEach(btn => {
                btn.addEventListener('click', function() {
                    // 更新激活状态
                    buttons.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    
                    // 显示对应的标签页
                    const tabId = this.getAttribute('data-tab');
                    showTab(tabId);
                });
            });
        }
    }
}

/**
 * 显示指定的标签页
 */
function showTab(tabId) {
    // 隐藏所有标签页
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // 显示指定的标签页
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
}

/**
 * 显示通知消息
 * @param {string} message 消息内容
 * @param {boolean} isError 是否为错误消息
 */
function showNotification(message, isError = false) {
  // 检查是否存在通知容器
  let notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    // 创建通知容器
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.top = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '1000';
    document.body.appendChild(notificationContainer);
  }
  
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : 'success'}`;
  notification.textContent = message;
  notification.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
  notification.style.color = 'white';
  notification.style.padding = '15px';
  notification.style.marginBottom = '10px';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  notification.style.minWidth = '250px';
  
  // 添加关闭按钮
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.marginLeft = '15px';
  closeBtn.style.float = 'right';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = function() {
    notification.remove();
  };
  notification.appendChild(closeBtn);
  
  // 添加到容器
  notificationContainer.appendChild(notification);
  
  // 5秒后自动关闭
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

/**
 * 初始化权限管理包括加载用户和设备
 */
function initPermissionsManagement() {
    // 立即加载用户和设备列表
    loadUsers();
    loadDevices();
    
    // 绑定表单提交事件
    document.getElementById('assign-permission-form').addEventListener('submit', assignPermission);
    
    // 绑定用户筛选事件
    document.getElementById('filter-user').addEventListener('change', filterPermissionsByUser);
}