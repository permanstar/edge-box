/**
 * 设备服务模块
 */
class DeviceService {
    constructor() {
        this.operationInProgress = false;
        this.cachedData = null;
    }
    
    /**
     * 获取所有设备数据
     * @returns {Promise<Object>} 设备数据
     */
    async fetchDevices() {
        try {
            const response = await fetch('/api/data');
            if (response.ok) {
                const data = await response.json();
                this.cachedData = Utils.deepClone(data);
                return data;
            }
            throw new Error('获取设备数据失败');
        } catch (error) {
            console.error('获取设备数据出错:', error);
            throw error;
        }
    }
    
    /**
     * 切换设备状态
     * @param {string} deviceId 设备ID
     * @returns {Promise<Object>} 操作结果
     */
    async toggleDevice(deviceId) {
        if (this.operationInProgress) {
            throw new Error('请等待当前操作完成后再尝试');
        }
        
        this.operationInProgress = true;
        
        try {
            // 找到设备并确定目标状态
            let device = null;
            let targetStatus = '';
            
            if (this.cachedData && this.cachedData.devices) {
                device = this.cachedData.devices.find(d => d.id === deviceId);
                if (device) {
                    targetStatus = device.status === 'online' ? 'offline' : 'online';
                }
            }
            
            // 发送API请求
            const response = await fetch(`/api/devices/${deviceId}/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || '设备操作失败');
            }
            
            return {
                success: result.success,
                message: result.message,
                device: deviceId,
                targetStatus: targetStatus
            };
        } catch (error) {
            console.error('控制设备出错:', error);
            throw error;
        } finally {
            this.operationInProgress = false;
        }
    }
    
    /**
     * 获取设备的当前状态
     * @param {string} deviceId 设备ID
     * @returns {string|null} 设备状态或null
     */
    getDeviceStatus(deviceId) {
        if (!this.cachedData || !this.cachedData.devices) {
            return null;
        }
        
        const device = this.cachedData.devices.find(d => d.id === deviceId);
        return device ? device.status : null;
    }
    
    /**
     * 更新缓存数据
     * @param {Object} data 新数据
     */
    updateCache(data) {
        this.cachedData = Utils.deepClone(data);
    }
}