/**
 * 管理员权限管理功能
 */
function initPermissionsManagement() {
    // 加载用户列表
    loadUsers();
    
    // 加载设备列表
    loadDevices();
    
    // 加载权限列表
    loadPermissions();
    
    // 设置表单提交
    document.getElementById('assign-permission-form').addEventListener('submit', assignPermission);
    
    // 设置筛选器
    document.getElementById('filter-user').addEventListener('change', filterPermissionsByUser);
}

/**
 * 加载所有普通用户
 */
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('获取用户列表失败');
        
        const data = await response.json();
        
        // 获取选择器
        const userSelect = document.getElementById('user-select');
        const filterUser = document.getElementById('filter-user');
        
        // 清空现有选项（保留第一个）
        userSelect.innerHTML = '<option value="">--选择用户--</option>';
        filterUser.innerHTML = '<option value="">所有用户</option>';
        
        // 添加普通用户
        data.users.forEach(user => {
            // 只添加普通用户
            if (user.role === 'user') {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.username;
                
                // 添加到两个下拉框
                userSelect.appendChild(option.cloneNode(true));
                filterUser.appendChild(option);
            }
        });
    } catch (error) {
        console.error('加载用户失败:', error);
        showNotification('加载用户列表失败', true);
    }
}

/**
 * 加载所有设备
 */
async function loadDevices() {
    try {
        const response = await fetch('/api/admin/devices');
        if (!response.ok) throw new Error('获取设备列表失败');
        
        const data = await response.json();
        
        // 获取设备选择器
        const deviceSelect = document.getElementById('device-select');
        deviceSelect.innerHTML = '<option value="">--选择设备--</option>';
        
        // 添加设备选项
        data.devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = `${device.name} (${device.id})`;
            deviceSelect.appendChild(option);
        });
    } catch (error) {
        console.error('加载设备失败:', error);
        showNotification('加载设备列表失败', true);
    }
}

// 存储所有权限以便筛选
let allPermissions = [];

/**
 * 加载所有权限
 */
async function loadPermissions() {
    try {
        const response = await fetch('/api/admin/permissions');
        if (!response.ok) throw new Error('获取权限列表失败');
        
        const data = await response.json();
        
        // 保存权限数据
        allPermissions = data.permissions;
        
        // 显示权限
        displayPermissions(allPermissions);
    } catch (error) {
        console.error('加载权限失败:', error);
        document.getElementById('permissions-table-body').innerHTML = 
            '<tr><td colspan="4" class="error-message">加载权限列表失败</td></tr>';
    }
}

/**
 * 显示权限列表
 */
function displayPermissions(permissions) {
    const tableBody = document.getElementById('permissions-table-body');
    
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
            <td>${perm.username}</td>
            <td>${perm.deviceName}</td>
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
 * 按用户筛选权限
 */
function filterPermissionsByUser() {
    const userId = document.getElementById('filter-user').value;
    
    if (!userId) {
        // 显示所有权限
        displayPermissions(allPermissions);
    } else {
        // 筛选特定用户的权限
        const filtered = allPermissions.filter(perm => perm.userId == userId);
        displayPermissions(filtered);
    }
}

/**
 * 授予权限
 */
async function assignPermission(event) {
    event.preventDefault();
    
    const userId = document.getElementById('user-select').value;
    const deviceId = document.getElementById('device-select').value;
    
    if (!userId || !deviceId) {
        showNotification('请选择用户和设备', true);
        return;
    }
    
    try {
        const response = await fetch('/api/admin/permissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, deviceId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '授予权限失败');
        }
        
        showNotification('权限授予成功');
        
        // 重置表单
        document.getElementById('assign-permission-form').reset();
        
        // 重新加载权限列表
        loadPermissions();
    } catch (error) {
        console.error('授予权限失败:', error);
        showNotification(error.message || '授予权限失败', true);
    }
}

/**
 * 移除权限
 */
async function removePermission() {
    const userId = this.getAttribute('data-user-id');
    const deviceId = this.getAttribute('data-device-id');
    
    if (!confirm('确定要移除此权限吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/permissions/${userId}/${deviceId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '移除权限失败');
        }
        
        showNotification('权限已成功移除');
        
        // 重新加载权限列表
        loadPermissions();
    } catch (error) {
        console.error('移除权限失败:', error);
        showNotification(error.message || '移除权限失败', true);
    }
}

/**
 * 格式化时间
 */
function formatTime(timestamp) {
    if (!timestamp) return '未知';
    
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
}