/**
 * 用户页面控制器
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
        
        // 如果是管理员，重定向到管理员页面
        if (data.user.role === 'admin') {
            window.location.href = '/admin';
            return;
        }
        
        // 显示用户名
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = data.user.username;
        }
        
        // 初始化用户界面
        initializeUserInterface();
    } catch (error) {
        console.error('认证检查失败', error);
        window.location.href = '/login';
    }
    
    // 退出登录按钮
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('登出失败', error);
            showNotification('登出失败，请重试', true);
        }
    });
});

/**
 * 初始化用户界面
 */
async function initializeUserInterface() {
    try {
        const wsService = new WebSocketService();
        
        // 获取初始数据
        await fetchAndDisplayDevices();
        
        // 获取用户权限信息
        let userPermissions = null;

        // 首先获取用户有权限的设备ID列表
        async function getUserPermissions() {
            try {
                const response = await fetch('/api/profile');
                if (!response.ok) {
                    throw new Error('获取用户权限失败');
                }
                const userData = await response.json();
                userPermissions = userData.devices;
                return userPermissions;
            } catch (error) {
                console.error('获取用户权限失败:', error);
                return [];
            }
        }

        // 等待获取权限后再初始化WebSocket
        await getUserPermissions();

        // 订阅WebSocket更新，添加过滤逻辑
        wsService.subscribe(data => {
            console.log('收到WebSocket数据更新:', data);
            
            // 如果有设备数据且不是管理员，进行过滤
            if (data.devices && Array.isArray(data.devices) && userPermissions) {
                // 如果不是'all'（管理员权限标记），则过滤设备
                if (userPermissions !== 'all' && Array.isArray(userPermissions)) {
                    const filteredData = {
                        ...data,
                        devices: data.devices.filter(device => 
                            userPermissions.includes(device.id)
                        )
                    };
                    updateDevicesDisplay(filteredData);
                } else {
                    updateDevicesDisplay(data);
                }
            } else {
                updateDevicesDisplay(data);
            }
        });
        
        // 初始化WebSocket
        wsService.init();
        
        // 刷新按钮
        document.getElementById('refresh-btn').addEventListener('click', fetchAndDisplayDevices);
        
        console.log('用户界面初始化完成');
    } catch (error) {
        console.error('用户界面初始化失败:', error);
        showNotification('加载界面失败，请刷新页面重试', true);
    }
}

/**
 * 获取并显示设备数据
 */
async function fetchAndDisplayDevices() {
    try {
        const devicesContainer = document.getElementById('devices-container');
        devicesContainer.innerHTML = '<div class="loading-message">加载设备数据中...</div>';
        
        const response = await fetch('/api/data');
        
        if (!response.ok) {
            throw new Error('获取设备数据失败');
        }
        
        const data = await response.json();
        updateDevicesDisplay(data);
    } catch (error) {
        console.error('获取设备数据失败:', error);
        showNotification('获取设备数据失败，请重试', true);
    }
}

/**
 * 更新设备显示
 */
function updateDevicesDisplay(data) {
    const devicesContainer = document.getElementById('devices-container');
    
    // 更新时间戳
    updateTimestamp(data.timestamp || Date.now());
    
    // 检查是否有设备数据
    if (!data.devices || data.devices.length === 0) {
        devicesContainer.innerHTML = '<div class="no-devices">您没有可访问的设备</div>';
        return;
    }
    
    // 清空容器
    devicesContainer.innerHTML = '';
    
    // 添加每个设备卡片
    data.devices.forEach(device => {
        const deviceCard = createReadOnlyDeviceCard(device);
        devicesContainer.appendChild(deviceCard);
    });
}

/**
 * 更新时间戳
 */
function updateTimestamp(timestamp) {
    const timestampElement = document.getElementById('timestamp');
    const date = new Date(timestamp);
    timestampElement.textContent = `最后更新时间: ${date.toLocaleString('zh-CN')}`;
}

/**
 * 显示通知
 */
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.style.display = 'block';
    
    // 自动隐藏
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}