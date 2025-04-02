/**
 * 应用程序主入口
 */
(function() {
    // 创建服务实例
    const deviceService = new DeviceService();
    const uiController = new UIController(deviceService);
    const wsService = new WebSocketService();
    
    /**
     * 应用初始化
     */
    async function init() {
        try {
            // 初始化UI
            uiController.init();
            
            // 获取初始数据
            const initialData = await deviceService.fetchDevices();
            uiController.updateDashboard(initialData);
            
            // 订阅WebSocket数据更新
            wsService.subscribe(data => {
                // 更新设备服务缓存
                deviceService.updateCache(data);
                // 更新UI
                uiController.updateDashboard(data);
            });
            
            // 初始化WebSocket
            wsService.init();
        } catch (error) {
            console.error('应用初始化失败:', error);
            uiController.showNotification('系统初始化失败，请刷新页面重试', true);
        }
    }
    
    // 页面加载完成后初始化应用
    document.addEventListener('DOMContentLoaded', init);
    
    // 页面关闭前清理资源
    window.addEventListener('beforeunload', () => {
        wsService.close();
    });
})();