/**
 * UI控制器模块
 */
class UIController {
    constructor(deviceService) {
        this.deviceService = deviceService;
        this.cachedData = null;
        this.deviceOperationInProgress = false;
        this.selectionMode = false;
        this.selectedDevices = new Set();
    }
    
    /**
     * 初始化UI事件和处理器
     */
    init() {
        // 初始化批量操作按钮事件
        document.getElementById('toggle-selection-mode').addEventListener('click', () => {
            this.toggleSelectionMode();
        });
        
        document.getElementById('cancel-selection').addEventListener('click', () => {
            this.toggleSelectionMode(false);
        });
        
        document.getElementById('select-all').addEventListener('click', () => {
            this.selectAllDevices();
        });
        
        document.getElementById('batch-toggle').addEventListener('click', () => {
            this.handleBatchToggle();
        });
        
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
            
            // 如果处于选择模式，重新启用复选框
            if (this.selectionMode) {
                this.enableSelectionMode();
            }
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
        
        // 如果处于选择模式，添加复选框
        if (this.selectionMode) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('device-checkbox');
            checkbox.setAttribute('data-device-id', device.id);
            checkbox.checked = this.selectedDevices.has(device.id);
            
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedDevices.add(device.id);
                } else {
                    this.selectedDevices.delete(device.id);
                }
                this.updateSelectionCounter();
            });
            
            deviceCard.classList.add('selection-mode');
            deviceCard.insertBefore(checkbox, deviceCard.firstChild);
        }
        
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
    
    /**
     * 切换选择模式
     * @param {boolean} enable 是否启用选择模式，不传则切换当前状态
     */
    toggleSelectionMode(enable = null) {
        if (enable === null) {
            this.selectionMode = !this.selectionMode;
        } else {
            this.selectionMode = enable;
        }
        
        if (this.selectionMode) {
            this.enableSelectionMode();
        } else {
            this.disableSelectionMode();
        }
    }
    
    /**
     * 启用设备选择模式
     */
    enableSelectionMode() {
        document.body.classList.add('selection-mode');
        document.getElementById('bulk-actions').style.display = 'block';
        document.getElementById('selection-actions').style.display = 'flex';
        document.getElementById('toggle-selection-mode').style.display = 'none';
        
        // 清空之前的选择
        this.selectedDevices.clear();
        this.updateSelectionCounter();
        
        // 为每个设备卡片添加复选框
        const deviceCards = document.querySelectorAll('.device-card');
        deviceCards.forEach(card => {
            if (!card.querySelector('.device-checkbox')) {
                const deviceId = card.querySelector('.toggle-btn').getAttribute('data-device-id');
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('device-checkbox');
                checkbox.setAttribute('data-device-id', deviceId);
                
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        this.selectedDevices.add(deviceId);
                    } else {
                        this.selectedDevices.delete(deviceId);
                    }
                    this.updateSelectionCounter();
                });
                
                card.classList.add('selection-mode');
                card.insertBefore(checkbox, card.firstChild);
            }
        });
    }
    
    /**
     * 禁用设备选择模式
     */
    disableSelectionMode() {
        document.body.classList.remove('selection-mode');
        document.getElementById('bulk-actions').style.display = 'none';
        document.getElementById('selection-actions').style.display = 'none';
        document.getElementById('toggle-selection-mode').style.display = 'block';
        
        // 移除所有复选框
        const checkboxes = document.querySelectorAll('.device-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.parentNode.classList.remove('selection-mode');
            checkbox.remove();
        });
        
        // 清空选择
        this.selectedDevices.clear();
    }
    
    /**
     * 更新选择计数器
     */
    updateSelectionCounter() {
        const count = this.selectedDevices.size;
        const counter = document.getElementById('selection-count');
        counter.textContent = count > 0 ? `已选择 ${count} 个设备` : '未选择设备';
        
        // 启用或禁用批量操作按钮
        const batchToggleBtn = document.getElementById('batch-toggle');
        batchToggleBtn.disabled = count === 0;
    }
    
    /**
     * 选择所有设备
     */
    selectAllDevices() {
        const checkboxes = document.querySelectorAll('.device-checkbox');
        const allSelected = checkboxes.length === this.selectedDevices.size;
        
        checkboxes.forEach(checkbox => {
            const deviceId = checkbox.getAttribute('data-device-id');
            
            if (allSelected) {
                // 如果全部已选中，则取消全选
                checkbox.checked = false;
                this.selectedDevices.delete(deviceId);
            } else {
                // 否则全选
                checkbox.checked = true;
                this.selectedDevices.add(deviceId);
            }
        });
        
        this.updateSelectionCounter();
    }
    
    /**
     * 处理批量切换设备
     */
    async handleBatchToggle() {
        if (this.deviceOperationInProgress || this.selectedDevices.size === 0) {
            return;
        }
        
        try {
            this.deviceOperationInProgress = true;
            
            // 禁用所有按钮
            const allButtons = document.querySelectorAll('button');
            allButtons.forEach(btn => btn.disabled = true);
            
            // 显示操作跟踪器
            this.showOperationTracker(this.selectedDevices.size);
            
            // 显示通知
            this.showNotification(`正在批量处理 ${this.selectedDevices.size} 个设备...`);
            
            // 发送批量操作请求
            const deviceIds = Array.from(this.selectedDevices);
            const result = await this.deviceService.batchToggleDevices(deviceIds);
            
            // 更新操作跟踪器状态
            this.updateOperationTrackerStatus('completed', result);
            
            // 关闭选择模式
            this.toggleSelectionMode(false);
            
            // 显示成功通知
            this.showNotification(`已成功发送批量操作指令，设备将陆续更新状态`);
            
        } catch (error) {
            console.error('批量设备切换操作失败:', error);
            this.showNotification(error.message || '批量操作失败，请重试', true);
            
            // 更新操作跟踪器为失败状态
            this.updateOperationTrackerStatus('failed', { message: error.message });
        } finally {
            // 启用所有按钮
            const allButtons = document.querySelectorAll('button');
            allButtons.forEach(btn => btn.disabled = false);
            
            this.deviceOperationInProgress = false;
        }
    }
    
    /**
     * 显示操作跟踪器
     * @param {number} deviceCount 设备数量
     */
    showOperationTracker(deviceCount) {
        // 如果已有跟踪器则先移除
        const existingTracker = document.getElementById('operation-tracker');
        if (existingTracker) {
            existingTracker.remove();
        }
        
        const trackerHtml = `
            <div id="operation-tracker" class="operation-tracker">
                <div class="tracker-header">
                    <h3>批量操作进度</h3>
                    <button class="close-tracker" onclick="document.getElementById('operation-tracker').remove()">×</button>
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: 0%"></div>
                </div>
                <div class="tracker-summary">
                    <span class="operation-type">批量切换 ${deviceCount} 个设备</span>
                    <span class="status processing">处理中...</span>
                </div>
                <div class="tracker-details">
                    <div class="summary-item">
                        <span class="empty-summary">准备处理设备...</span>
                    </div>
                </div>
                <div class="detailed-status" style="display:none">
                    <h4>失败设备详情</h4>
                    <div class="failed-devices"></div>
                </div>
            </div>
        `;
        
        // 将跟踪器添加到页面
        const containerEl = document.querySelector('.container');
        containerEl.insertAdjacentHTML('afterbegin', trackerHtml);
        
        // 显示进度条动画
        setTimeout(() => {
            const progressBar = document.querySelector('.progress');
            progressBar.style.width = '30%';
        }, 200);
    }
    
    /**
     * 更新操作跟踪器状态
     * @param {string} status 状态 - 'processing', 'completed', 'failed'
     * @param {Object} resultData 结果数据
     */
    updateOperationTrackerStatus(status, resultData) {
        const tracker = document.getElementById('operation-tracker');
        if (!tracker) return;
        
        const progressBar = tracker.querySelector('.progress');
        const statusEl = tracker.querySelector('.status');
        const detailsEl = tracker.querySelector('.tracker-details');
        
        // 更新进度条
        if (status === 'completed') {
            progressBar.style.width = '100%';
            statusEl.textContent = '已完成';
            statusEl.classList.remove('processing');
            statusEl.classList.add('completed');
        } else if (status === 'failed') {
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#e74c3c';
            statusEl.textContent = '操作失败';
            statusEl.classList.remove('processing');
            statusEl.style.color = '#e74c3c';
        }
        
        // 更新详细信息
        if (resultData && resultData.devices) {
            // 处理批量操作结果
            const totalCount = resultData.devices.length;
            
            detailsEl.innerHTML = `
                <div class="summary-item">
                    <span class="status-badge" style="background-color: #2ecc71;">成功</span>
                    <span class="status-count">${totalCount}</span>
                </div>
            `;
        } else if (status === 'failed') {
            // 显示失败信息
            detailsEl.innerHTML = `
                <div class="summary-item">
                    <span class="status-badge" style="background-color: #e74c3c;">失败</span>
                    <span class="error-message">${resultData.message || '未知错误'}</span>
                </div>
            `;
        }
    }
}