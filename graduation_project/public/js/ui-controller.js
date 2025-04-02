/**
 * UI控制器模块
 */
class UIController {
    constructor(deviceService) {
        this.deviceService = deviceService;
        this.cachedData = null;
        this.deviceOperationInProgress = false;
    }
    
    /**
     * 初始化UI事件和处理器
     */
    init() {
        // 初始化通知系统
    }
    
    /**
     * 更新仪表盘数据
     * @param {Object} data 设备和系统数据
     */
    updateDashboard(data) {
        // 如果数据没有变化，不更新UI
        if (this.cachedData && JSON.stringify(this.cachedData) === JSON.stringify(data)) {
            return;
        }
        
        // 更新缓存
        this.cachedData = Utils.deepClone(data);
        
        // 更新系统指标
        this.updateSystemMetrics(data.system);
        
        // 更新设备列表
        this.updateDevicesList(data.devices);
        
        // 更新时间戳
        this.updateTimestamp(data.timestamp);
    }
    
    /**
     * 更新系统指标
     * @param {Object} system 系统数据
     */
    updateSystemMetrics(system) {
        document.getElementById('cpu-value').textContent = system.cpu + '%';
        document.getElementById('memory-value').textContent = system.memory + '%';
        document.getElementById('storage-value').textContent = system.storage + '%';
        document.getElementById('network-value').textContent = system.network === 'connected' ? '已连接' : '未连接';
    }
    
    /**
     * 更新设备列表
     * @param {Array} devices 设备数据数组
     */
    updateDevicesList(devices) {
        const devicesContainer = document.getElementById('devices-container');
        
        // 检查现有设备卡片
        const existingDeviceCards = devicesContainer.querySelectorAll('.device-card');
        
        // 如果设备数量不同，或者第一次加载，完全重建列表
        if (existingDeviceCards.length !== devices.length) {
            // 完全重建
            devicesContainer.innerHTML = '';
            this.renderAllDevices(devices, devicesContainer);
        } else {
            // 只更新有变化的设备
            this.updateExistingDevices(devices, existingDeviceCards);
        }
    }
    
    /**
     * 渲染所有设备
     * @param {Array} devices 设备数据数组
     * @param {HTMLElement} container 容器元素
     */
    renderAllDevices(devices, container) {
        devices.forEach(device => {
            const deviceCard = this.createDeviceCard(device);
            container.appendChild(deviceCard);
        });
    }
    
    /**
     * 只更新变化的设备
     * @param {Array} devices 设备数据数组
     * @param {NodeList} existingCards 现有设备卡片元素
     */
    updateExistingDevices(devices, existingCards) {
        devices.forEach((device, index) => {
            const card = existingCards[index];
            const deviceId = card.querySelector('.toggle-btn').getAttribute('data-device-id');
            
            // 如果不是同一个设备，或者状态变化了，则更新卡片
            if (deviceId !== device.id || 
                (card.querySelector('.status').classList.contains('online') !== (device.status === 'online'))) {
                
                // 只替换这一个卡片
                const newCard = this.createDeviceCard(device);
                card.parentNode.replaceChild(newCard, card);
            } else {
                // 只更新值
                const valueElement = card.querySelector('.device-value');
                if (device.status === 'online') {
                    valueElement.textContent = `${device.value} ${device.unit}`;
                    valueElement.style.color = ''; // 恢复默认颜色
                } else {
                    valueElement.textContent = '-- (离线)';
                    valueElement.style.color = '#95a5a6';
                }
            }
        });
    }
    
    /**
     * 创建设备卡片元素
     * @param {Object} device 设备数据
     * @returns {HTMLElement} 设备卡片元素
     */
    createDeviceCard(device) {
        // 创建卡片的代码可以从原来的updateDashboard中提取出来
        const deviceCard = document.createElement('div');
        deviceCard.classList.add('device-card');
        
        const deviceInfo = document.createElement('div');
        deviceInfo.classList.add('device-info');
        
        const deviceTitle = document.createElement('h3');
        deviceTitle.textContent = device.name;
        
        const deviceType = document.createElement('p');
        deviceType.textContent = `类型: ${device.type} | ID: ${device.id}`;
        
        const deviceStatus = document.createElement('span');
        deviceStatus.classList.add('status');
        deviceStatus.classList.add(device.status.toLowerCase());
        deviceStatus.textContent = device.status === 'online' ? '在线' : '离线';
        
        deviceInfo.appendChild(deviceTitle);
        deviceInfo.appendChild(deviceType);
        deviceInfo.appendChild(deviceStatus);
        
        // 设备值显示
        const deviceControls = document.createElement('div');
        deviceControls.classList.add('device-controls');
        
        const deviceValue = document.createElement('div');
        deviceValue.classList.add('device-value');
        
        // 根据设备状态显示不同内容
        if (device.status === 'online') {
            deviceValue.textContent = `${device.value} ${device.unit}`;
        } else {
            deviceValue.textContent = '-- (离线)';
            deviceValue.style.color = '#95a5a6'; // 灰色显示离线设备的数据
        }
        
        // 添加设备开关按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.classList.add('toggle-btn');
        if (device.status === 'offline') toggleBtn.classList.add('offline');
        toggleBtn.textContent = device.status === 'online' ? '关闭设备' : '打开设备';
        toggleBtn.setAttribute('data-device-id', device.id); // 添加设备ID作为属性，方便稍后引用
        
        // 使用防抖的设备切换函数
        const debouncedToggle = Utils.debounce((e) => {
            this.handleDeviceToggle(device.id);
        }, 300);
        
        toggleBtn.addEventListener('click', debouncedToggle);
        
        deviceControls.appendChild(deviceValue);
        deviceControls.appendChild(toggleBtn);
        
        deviceCard.appendChild(deviceInfo);
        deviceCard.appendChild(deviceControls);
        
        return deviceCard;
    }
    
    /**
     * 处理设备开关操作
     * @param {string} deviceId 设备ID
     */
    async handleDeviceToggle(deviceId) {
        if (this.deviceOperationInProgress) {
            this.showNotification('请等待当前操作完成后再尝试', true);
            return;
        }
        
        try {
            this.deviceOperationInProgress = true;
            
            // 立即在UI上反映状态变化（乐观更新）
            const allDeviceCards = document.querySelectorAll('.device-card');
            let targetDeviceStatus = '';
            
            allDeviceCards.forEach(card => {
                const deviceIdElement = card.querySelector('[data-device-id]');
                if (deviceIdElement && deviceIdElement.getAttribute('data-device-id') === deviceId) {
                    const statusElement = card.querySelector('.status');
                    const deviceValueElement = card.querySelector('.device-value');
                    const toggleButton = card.querySelector('.toggle-btn');
                    
                    if (statusElement.classList.contains('online')) {
                        // 设备当前在线，将变为离线
                        targetDeviceStatus = 'offline';
                        statusElement.classList.remove('online');
                        statusElement.classList.add('offline');
                        statusElement.textContent = '离线';
                        
                        // 更新值显示
                        deviceValueElement.textContent = '-- (离线)';
                        deviceValueElement.style.color = '#95a5a6';
                        
                        // 更新按钮
                        toggleButton.classList.add('offline');
                        toggleButton.textContent = '打开设备';
                    } else {
                        // 设备当前离线，将变为在线
                        targetDeviceStatus = 'online';
                        statusElement.classList.remove('offline');
                        statusElement.classList.add('online');
                        statusElement.textContent = '在线';
                        
                        // 按钮更新
                        toggleButton.classList.remove('offline');
                        toggleButton.textContent = '关闭设备';
                    }
                }
            });
            
            // 禁用所有开关按钮
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.disabled = true;
            });
            
            // 添加加载状态到当前按钮
            const currentBtn = document.querySelector(`.toggle-btn[data-device-id="${deviceId}"]`);
            if (currentBtn) {
                currentBtn.classList.add('loading');
            }
            
            // 显示乐观反馈消息
            this.showNotification(`正在${targetDeviceStatus === 'online' ? '打开' : '关闭'}设备...`);
            
            // 发送请求到设备服务
            const result = await this.deviceService.toggleDevice(deviceId);
            
            if (!result.success) {
                this.showNotification(result.message, true);
                // 如果失败，刷新数据以恢复UI
                await this.deviceService.fetchDevices();
            }
        } catch (error) {
            console.error('设备切换操作失败:', error);
            this.showNotification(error.message || '控制设备失败，请重试', true);
            
            // 发生错误时重新加载数据以恢复状态
            try {
                await this.deviceService.fetchDevices();
            } catch (e) {
                // 忽略二次错误
            }
        } finally {
            // 移除当前按钮的加载状态
            const currentBtn = document.querySelector(`.toggle-btn[data-device-id="${deviceId}"]`);
            if (currentBtn) {
                currentBtn.classList.remove('loading');
            }
            
            // 无论成功还是失败，都重置状态并启用按钮
            this.deviceOperationInProgress = false;
            
            // 启用所有设备的开关按钮
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.disabled = false;
            });
        }
    }
    
    /**
     * 更新时间戳
     * @param {number} timestamp 时间戳
     */
    updateTimestamp(timestamp) {
        const formattedTime = Utils.formatDateTime(timestamp);
        document.getElementById('timestamp').textContent = `最后更新时间: ${formattedTime}`;
    }
    
    /**
     * 显示通知
     * @param {string} message 通知消息
     * @param {boolean} isError 是否是错误通知
     */
    showNotification(message, isError = false) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('show');
        
        if (isError) {
            notification.classList.add('error');
        } else {
            notification.classList.remove('error');
        }
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}