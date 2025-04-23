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
     * 批量切换设备状态
     * @param {Array<string>} deviceIds 设备ID数组
     * @returns {Promise<Object>} 操作结果
     */
    async batchToggleDevices(deviceIds) {
        if (this.operationInProgress) {
            throw new Error('请等待当前操作完成后再尝试');
        }
        
        this.operationInProgress = true;
        
        try {
            // 获取设备当前状态
            const devices = [];
            for (const deviceId of deviceIds) {
                const device = this.findDeviceById(deviceId);
                if (device) {
                    devices.push({
                        deviceId: deviceId,
                        targetStatus: device.status === 'online' ? 'offline' : 'online'
                    });
                } else {
                    console.warn(`设备不存在: ${deviceId}`);
                }
            }
            
            // 发送API请求
            const response = await fetch('/api/devices/batch-toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ devices }) // 注意这里发送的是devices对象数组
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || '批量操作失败');
            }
            
            return result;
        } catch (error) {
            console.error('批量控制设备出错:', error);
            throw error;
        } finally {
            this.operationInProgress = false;
        }
    }
    
    /**
     * 根据ID查找设备
     * @param {string} deviceId 设备ID
     * @returns {Object|null} 设备对象或null
     */
    findDeviceById(deviceId) {
        if (!this.cachedData || !this.cachedData.devices) {
            return null;
        }
        return this.cachedData.devices.find(d => d.id === deviceId);
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
     * 获取多个设备的当前状态
     * @param {Array<string>} deviceIds 设备ID数组
     * @returns {Object} 包含每个设备ID和状态的映射
     */
    getDevicesStatus(deviceIds) {
        if (!this.cachedData || !this.cachedData.devices) {
            return {};
        }
        
        const statusMap = {};
        deviceIds.forEach(deviceId => {
            const device = this.cachedData.devices.find(d => d.id === deviceId);
            statusMap[deviceId] = device ? device.status : null;
        });
        
        return statusMap;
    }
    
    /**
     * 更新缓存数据
     * @param {Object} data 新数据
     */
    updateCache(data) {
        this.cachedData = Utils.deepClone(data);
    }
}