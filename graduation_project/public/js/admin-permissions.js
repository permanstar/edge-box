/**
 * 权限管理模块
 */
(function() {
    // 存储所有权限以便筛选
    let allPermissions = [];
    
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('初始化权限管理界面...');
        
        // 确保这是管理员页面
        if (!document.getElementById('permissions-management')) {
            console.log('权限管理界面元素不存在，跳过初始化');
            return;
        }
        
        // 初始化权限管理
        initializePermissionsUI();
    });
    
    /**
     * 初始化权限管理UI
     */
    function initializePermissionsUI() {
        console.log('开始初始化权限管理UI组件');
        
        // 显示权限管理区域
        const permissionsSection = document.getElementById('permissions-management');
        if (permissionsSection) {
            permissionsSection.style.display = 'block';
        }
        
        // 绑定表单提交事件
        const form = document.getElementById('assign-permission-form');
        if (form) {
            form.addEventListener('submit', assignPermission);
        } else {
            console.error('找不到权限分配表单元素');
        }
        
        // 绑定用户筛选事件
        const filterUser = document.getElementById('filter-user');
        if (filterUser) {
            filterUser.addEventListener('change', filterPermissionsByUser);
        } else {
            console.error('找不到用户筛选下拉框元素');
        }
        
        // 加载数据
        loadUsers();
        loadDevices();
        loadPermissions();
    }
    
    /**
     * 加载所有普通用户
     */
    async function loadUsers() {
        try {
            console.log('开始加载用户列表...');
            
            const userSelect = document.getElementById('user-select');
            const filterUser = document.getElementById('filter-user');
            
            if (!userSelect || !filterUser) {
                console.error('找不到用户选择器元素', { userSelect, filterUser });
                return;
            }
            
            // 显示加载状态
            userSelect.innerHTML = '<option value="">加载中...</option>';
            filterUser.innerHTML = '<option value="">加载中...</option>';
            
            // 发送获取用户列表的请求
            const response = await fetch('/api/admin/users');
            console.log('用户列表API响应状态:', response.status);
            
            if (!response.ok) {
                throw new Error(`获取用户列表失败: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('获取到的用户数据:', data);
            
            // 重置选择器
            userSelect.innerHTML = '<option value="">--选择用户--</option>';
            filterUser.innerHTML = '<option value="">所有用户</option>';
            
            // 如果没有用户，显示提示
            if (!data.users || data.users.length === 0) {
                userSelect.innerHTML = '<option value="">没有可用的普通用户</option>';
                console.warn('没有找到普通用户');
                return;
            }
            
            // 添加用户选项
            data.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.username;
                
                userSelect.appendChild(option.cloneNode(true));
                filterUser.appendChild(option);
            });
            
            console.log(`成功加载了 ${data.users.length} 个用户`);
        } catch (error) {
            console.error('加载用户失败:', error);
            
            // 更新选择框显示错误
            const userSelect = document.getElementById('user-select');
            const filterUser = document.getElementById('filter-user');
            
            if (userSelect) userSelect.innerHTML = '<option value="">加载用户失败</option>';
            if (filterUser) filterUser.innerHTML = '<option value="">加载用户失败</option>';
            
            showNotification('加载用户列表失败: ' + error.message, true);
        }
    }
    
    /**
     * 加载设备列表
     */
    async function loadDevices() {
        try {
            console.log('开始加载设备列表...');
            
            const deviceSelect = document.getElementById('device-select');
            if (!deviceSelect) {
                console.error('找不到设备选择器元素');
                return;
            }
            
            // 显示加载状态
            deviceSelect.innerHTML = '<option value="">加载中...</option>';
            
            // 发送获取设备列表的请求
            const response = await fetch('/api/admin/devices');
            console.log('设备列表API响应状态:', response.status);
            
            if (!response.ok) {
                throw new Error(`获取设备列表失败: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('获取到的设备数据:', data);
            
            // 重置选择器
            deviceSelect.innerHTML = '<option value="">--选择设备--</option>';
            
            // 如果没有设备，显示提示
            if (!data.devices || data.devices.length === 0) {
                deviceSelect.innerHTML = '<option value="">没有可用的设备</option>';
                console.warn('没有找到设备');
                return;
            }
            
            // 添加设备选项
            data.devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = `${device.name || '未命名设备'} (${device.id})`;
                deviceSelect.appendChild(option);
            });
            
            console.log(`成功加载了 ${data.devices.length} 个设备`);
        } catch (error) {
            console.error('加载设备失败:', error);
            
            // 更新选择框显示错误
            const deviceSelect = document.getElementById('device-select');
            if (deviceSelect) {
                deviceSelect.innerHTML = '<option value="">加载设备失败</option>';
            }
            
            showNotification('加载设备列表失败: ' + error.message, true);
        }
    }
    
    /**
     * 加载权限列表
     */
    async function loadPermissions() {
        try {
            console.log('开始加载权限列表...');
            
            const tableBody = document.getElementById('permissions-table-body');
            if (!tableBody) {
                console.error('找不到权限表格元素');
                return;
            }
            
            tableBody.innerHTML = '<tr><td colspan="4" class="loading-message">加载权限数据中...</td></tr>';
            
            // 发送获取权限列表的请求
            const response = await fetch('/api/admin/permissions');
            console.log('权限列表API响应状态:', response.status);
            
            if (!response.ok) {
                throw new Error(`获取权限列表失败: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('获取到的权限数据:', data);
            
            // 保存权限数据
            allPermissions = data.permissions || [];
            
            // 显示权限
            displayPermissions(allPermissions);
        } catch (error) {
            console.error('加载权限失败:', error);
            
            const tableBody = document.getElementById('permissions-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="4" class="error-message">加载权限列表失败</td></tr>';
            }
            
            showNotification('加载权限列表失败: ' + error.message, true);
        }
    }
    
    /**
     * 显示权限列表
     */
    function displayPermissions(permissions) {
        const tableBody = document.getElementById('permissions-table-body');
        
        if (!tableBody) {
            console.error('找不到权限表格元素');
            return;
        }
        
        if (!permissions || permissions.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">暂无权限记录</td></tr>';
            return;
        }
        
        // 清空表格
        tableBody.innerHTML = '';
        
        // 添加每行权限
        permissions.forEach(perm => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${perm.username || '未知用户'}</td>
                <td>${perm.deviceName || perm.deviceId || '未知设备'}</td>
                <td>${formatTime(perm.created_at)}</td>
                <td>
                    <button class="btn btn-danger remove-btn" 
                            data-user-id="${perm.userId}" 
                            data-device-id="${perm.deviceId}">
                        移除
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // 添加移除权限按钮事件
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', removePermission);
        });
    }
    
    /**
     * 分配设备权限
     */
    async function assignPermission(event) {
        event.preventDefault();
        
        try {
            const userId = document.getElementById('user-select').value;
            const deviceId = document.getElementById('device-select').value;
            
            if (!userId || !deviceId) {
                showNotification('请选择用户和设备', true);
                return;
            }
            
            console.log(`正在分配权限: 用户ID=${userId}, 设备ID=${deviceId}`);
            
            // 发送分配权限的请求
            const response = await fetch('/api/admin/permissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, deviceId })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '分配权限失败');
            }
            
            const data = await response.json();
            console.log('权限分配结果:', data);
            
            showNotification('设备权限分配成功');
            
            // 重新加载权限列表
            loadPermissions();
        } catch (error) {
            console.error('分配权限失败:', error);
            showNotification('分配权限失败: ' + error.message, true);
        }
    }
    
    /**
     * 移除权限
     */
    async function removePermission() {
        try {
            const userId = this.getAttribute('data-user-id');
            const deviceId = this.getAttribute('data-device-id');
            
            if (!confirm('确定要移除此权限吗？')) {
                return;
            }
            
            console.log(`正在移除权限: 用户ID=${userId}, 设备ID=${deviceId}`);
            
            // 发送移除权限的请求
            const response = await fetch(`/api/admin/permissions/${userId}/${deviceId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '移除权限失败');
            }
            
            const data = await response.json();
            console.log('权限移除结果:', data);
            
            showNotification('权限已成功移除');
            
            // 重新加载权限列表
            loadPermissions();
        } catch (error) {
            console.error('移除权限失败:', error);
            showNotification('移除权限失败: ' + error.message, true);
        }
    }
    
    /**
     * 按用户筛选权限
     */
    function filterPermissionsByUser() {
        try {
            const userId = document.getElementById('filter-user').value;
            console.log(`筛选权限，用户ID: ${userId || '所有'}`);
            
            if (!userId) {
                // 显示所有权限
                displayPermissions(allPermissions);
            } else {
                // 筛选特定用户的权限
                const filtered = allPermissions.filter(perm => perm.userId == userId);
                displayPermissions(filtered);
            }
        } catch (error) {
            console.error('筛选权限失败:', error);
            showNotification('筛选权限时出错', true);
        }
    }
    
    /**
     * 显示通知消息
     */
    function showNotification(message, isError = false) {
        try {
            console.log(`显示通知: ${message}, 错误=${isError}`);
            
            // 使用全局通知函数（如果存在）
            if (window.showNotification) {
                window.showNotification(message, isError);
                return;
            }
            
            // 检查是否存在通知元素
            let notification = document.getElementById('notification');
            if (!notification) {
                // 创建通知元素
                notification = document.createElement('div');
                notification.id = 'notification';
                notification.className = 'notification';
                document.body.appendChild(notification);
            }
            
            // 设置通知内容
            notification.textContent = message;
            notification.className = `notification ${isError ? 'error' : 'success'}`;
            notification.style.display = 'block';
            
            // 5秒后隐藏
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        } catch (error) {
            console.error('显示通知失败:', error);
        }
    }
    
    /**
     * 格式化时间
     */
    function formatTime(timestamp) {
        if (!timestamp) return '未知';
        
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('zh-CN');
        } catch (e) {
            console.error('格式化时间失败:', e);
            return timestamp;
        }
    }
    
    // 对外暴露API
    window.PermissionsManager = {
        loadUsers,
        loadDevices,
        loadPermissions,
        displayPermissions
    };
})();