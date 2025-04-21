/**
 * 用户管理模块
 */
document.addEventListener('DOMContentLoaded', function() {
    // 如果在用户管理页面，初始化用户管理
    if (document.getElementById('user-management')) {
        initUserManagement();
    }
    // 绑定用户管理表单
    const createUserForm = document.getElementById('create-user-form');
    if (createUserForm) {
        console.log('找到创建用户表单，绑定提交事件');
        createUserForm.addEventListener('submit', handleCreateUser);
    } else {
        console.error('未找到创建用户表单');
    }
});

/**
 * 初始化用户管理功能
 */
function initUserManagement() {
    // 加载用户列表
    loadUsers();
    
    // 绑定创建用户表单
    document.getElementById('create-user-form').addEventListener('submit', createUser);
}

/**
 * 加载用户列表
 */
async function loadUsers() {
    try {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '<tr><td colspan="5" class="loading-message">加载用户列表...</td></tr>';
        
        const response = await fetch('/api/admin/users');
        
        if (!response.ok) {
            throw new Error('获取用户列表失败');
        }
        
        const data = await response.json();
        
        // 显示用户列表
        displayUsers(data.users);
    } catch (error) {
        console.error('加载用户列表失败:', error);
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '<tr><td colspan="5" class="error-message">加载用户列表失败</td></tr>';
    }
}

/**
 * 显示用户列表
 */
function displayUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">没有用户记录</td></tr>';
        return;
    }
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 添加用户行
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.role === 'admin' ? '管理员' : '普通用户'}</td>
            <td>${formatDateTime(user.created_at)}</td>
            <td>${user.last_login ? formatDateTime(user.last_login) : '从未登录'}</td>
            <td>
                <button class="btn btn-sm ${user.role === 'admin' ? 'btn-secondary' : 'btn-primary'} change-role-btn" 
                        data-user-id="${user.id}" 
                        data-current-role="${user.role}">
                    ${user.role === 'admin' ? '降为普通用户' : '升为管理员'}
                </button>
                <button class="btn btn-sm btn-danger delete-user-btn" 
                        data-user-id="${user.id}" 
                        data-username="${user.username}"
                        data-role="${user.role}">
                    删除
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // 绑定操作按钮事件
    document.querySelectorAll('.change-role-btn').forEach(btn => {
        btn.addEventListener('click', changeUserRole);
    });
    
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', deleteUser);
    });
}

/**
 * 创建新用户
 */
async function createUser(event) {
    event.preventDefault();
    
    try {
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        const role = document.getElementById('user-role').value;
        
        // 验证输入
        if (!username || !password) {
            showNotification('用户名和密码不能为空', true);
            return;
        }
        
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '创建用户失败');
        }
        
        // 清空表单
        document.getElementById('create-user-form').reset();
        
        // 显示成功消息
        showNotification('用户创建成功');
        
        // 重新加载用户列表
        loadUsers();
    } catch (error) {
        console.error('创建用户失败:', error);
        showNotification('创建用户失败: ' + error.message, true);
    }
}

/**
 * 处理创建用户表单提交
 */
async function handleCreateUser(event) {
    event.preventDefault();
    console.log('提交创建用户表单');
    
    try {
        // 获取表单数据
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        const role = document.getElementById('user-role').value;
        
        // 验证数据
        if (!username || !password) {
            alert('用户名和密码不能为空');
            return;
        }
        
        console.log('准备创建用户:', { username, role });
        
        // 调用API创建用户
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
        });
        
        console.log('API响应状态:', response.status);
        
        const data = await response.json();
        console.log('API响应数据:', data);
        
        if (!response.ok) {
            throw new Error(data.message || '创建用户失败');
        }
        
        // 清空表单
        document.getElementById('new-username').value = '';
        document.getElementById('new-password').value = '';
        
        // 显示成功消息
        alert('用户创建成功！');
        
        // 如果有用户列表，刷新它
        if (typeof loadUsers === 'function') {
            loadUsers();
        }
    } catch (error) {
        console.error('创建用户失败:', error);
        alert('创建用户失败: ' + error.message);
    }
}

/**
 * 修改用户角色
 */
async function changeUserRole() {
    try {
        const userId = this.getAttribute('data-user-id');
        const currentRole = this.getAttribute('data-current-role');
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        
        let confirmMessage = newRole === 'admin' 
            ? '确定要将此用户升级为管理员吗？这将同时删除该用户的所有设备绑定关系，因为管理员拥有所有设备的访问权限。' 
            : '确定要将此用户降级为普通用户吗？降级后该用户将失去对所有设备的访问权限，需要重新分配设备权限。';
            
        // 对管理员降级添加特殊警告
        if (currentRole === 'admin') {
            confirmMessage += ' 注意：如果这是最后一个管理员账户，降级将被阻止。';
        }
            
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: newRole })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '修改用户角色失败');
        }
        
        // 如果用户从普通用户升级为管理员，则清除其设备绑定关系
        if (currentRole === 'user' && newRole === 'admin') {
            console.info(`用户 ${data.username} 从普通用户升级为管理员，正在清除设备绑定关系`);
            
            // 获取该用户绑定的设备数
            const [deviceCount] = await connection.query(
                'SELECT COUNT(*) as count FROM device_permissions WHERE user_id = ?',
                [userId]
            );
            
            // 删除该用户的所有设备绑定关系
            await connection.query(
                'DELETE FROM device_permissions WHERE user_id = ?',
                [userId]
            );
            
            console.info(`已清除用户 ${data.username} 的 ${deviceCount[0].count} 个设备绑定关系`);
        }
        
        // 显示成功消息
        let successMessage = '用户角色修改成功';
        if (data.clearedPermissions) {
            successMessage += `，已清除该用户的 ${data.permissionCount} 个设备绑定关系`;
        } else if (newRole === 'user') {
            successMessage += '，请前往权限管理页面为该用户分配设备权限';
        }
        
        showNotification(successMessage);
        
        // 重新加载用户列表
        loadUsers();
    } catch (error) {
        console.error('修改用户角色失败:', error);
        showNotification('修改用户角色失败: ' + error.message, true);
    }
}

/**
 * 删除用户
 */
async function deleteUser() {
    try {
        const userId = this.getAttribute('data-user-id');
        const username = this.getAttribute('data-username');
        const isAdmin = this.getAttribute('data-role') === 'admin';
        
        let confirmMessage = `确定要删除用户 "${username}" 吗？此操作不可撤销。`;
        if (isAdmin) {
            confirmMessage += ' 注意：如果这是最后一个管理员账户，删除将被阻止。';
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '删除用户失败');
        }
        
        // 显示成功消息
        showNotification('用户删除成功');
        
        // 重新加载用户列表
        loadUsers();
    } catch (error) {
        console.error('删除用户失败:', error);
        showNotification('删除用户失败: ' + error.message, true);
    }
}

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp) {
    if (!timestamp) return '-';
    
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
}