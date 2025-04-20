/**
 * 创建只读设备卡片
 * @param {Object} device 设备数据
 * @returns {HTMLElement} 设备卡片元素
 */
function createReadOnlyDeviceCard(device) {
    // 创建设备卡片容器
    const deviceCard = document.createElement('div');
    deviceCard.classList.add('device-card');
    deviceCard.id = `device-${device.id}`;
    
    // 设备信息部分
    const deviceInfo = document.createElement('div');
    deviceInfo.classList.add('device-info');
    
    // 设备标题
    const deviceTitle = document.createElement('h3');
    deviceTitle.classList.add('device-title');
    deviceTitle.textContent = device.name;
    deviceTitle.setAttribute('data-device-id', device.id);
    
    // 设备类型
    const deviceType = document.createElement('div');
    deviceType.classList.add('device-type');
    deviceType.textContent = `类型: ${device.type || '未知'}`;
    
    // 设备状态
    const deviceStatus = document.createElement('div');
    deviceStatus.classList.add('status', device.status === 'online' ? 'online' : 'offline');
    deviceStatus.textContent = device.status === 'online' ? '在线' : '离线';
    
    // 添加元素到设备信息容器
    deviceInfo.appendChild(deviceTitle);
    deviceInfo.appendChild(deviceType);
    deviceInfo.appendChild(deviceStatus);
    
    // 设备数据部分
    const deviceData = document.createElement('div');
    deviceData.classList.add('device-data');
    
    // 设备值显示
    const deviceValue = document.createElement('div');
    deviceValue.classList.add('device-value');
    
    // 根据设备状态显示不同内容
    if (device.status === 'online') {
        deviceValue.textContent = `${device.value || '--'} ${device.unit || ''}`;
    } else {
        deviceValue.textContent = '-- (离线)';
        deviceValue.style.color = '#95a5a6'; // 灰色显示离线设备的数据
    }
    
    // 添加最后更新时间
    const lastUpdate = document.createElement('div');
    lastUpdate.classList.add('last-update');
    lastUpdate.textContent = `最后更新: ${formatTime(device.lastUpdate || Date.now())}`;
    
    deviceData.appendChild(deviceValue);
    deviceData.appendChild(lastUpdate);
    
    // 组装设备卡片
    deviceCard.appendChild(deviceInfo);
    deviceCard.appendChild(deviceData);
    
    return deviceCard;
}

/**
 * 格式化时间戳
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化的时间字符串
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}