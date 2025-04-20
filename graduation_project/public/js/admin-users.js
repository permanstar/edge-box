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
                        data-username="${user.username}">
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
        
        if (!confirm(`确定要将此用户${newRole === 'admin' ? '升级为管理员' : '降级为普通用户'}吗？`)) {
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
        
        // 显示成功消息
        showNotification('用户角色修改成功');
        
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
        
        if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销。`)) {
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