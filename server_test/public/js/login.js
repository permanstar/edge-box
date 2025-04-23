document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-form');
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');
    
    loginButton.addEventListener('click', async () => {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // 输入验证
        if (!username || !password) {
            showError('用户名和密码不能为空');
            return;
        }
        
        // 禁用按钮，防止重复提交
        loginButton.disabled = true;
        loginButton.textContent = '登录中...';
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // 登录成功，根据用户角色跳转到不同页面
                const role = data.user.role;
                
                if (role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/user';
                }
            } else {
                // 显示错误信息
                showError(data.message || '登录失败，请检查用户名和密码');
                resetButton();
            }
        } catch (error) {
            console.error('登录请求失败', error);
            showError('登录失败，请稍后重试');
            resetButton();
        }
    });
    
    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }
    
    function resetButton() {
        loginButton.disabled = false;
        loginButton.textContent = '登录';
    }
});