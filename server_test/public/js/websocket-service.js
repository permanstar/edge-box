/**
 * WebSocket服务模块
 */
class WebSocketService {
    constructor() {
        this.ws = null;
        this.reconnectInterval = null;
        this.pingInterval = null;
        this.connectionTimeout = null;
        this.connectionStatus = document.getElementById('connection-indicator');
        this.connectionText = document.getElementById('connection-text');
        this.subscribers = [];
        this.operationSubscribers = [];
    }
    
    /**
     * 初始化WebSocket连接
     */
    init() {
        this.connect();
    }
    
    /**
     * 订阅数据更新
     * @param {Function} callback 数据更新时的回调函数
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.push(callback);
        }
    }
    
    /**
     * 取消订阅
     * @param {Function} callback 要取消的回调函数
     */
    unsubscribe(callback) {
        this.subscribers = this.subscribers.filter(sub => sub !== callback);
    }
    
    /**
     * 通知所有订阅者
     * @param {Object} data 要发送的数据
     */
    notifySubscribers(data) {
        this.subscribers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('执行订阅回调出错:', error);
            }
        });
    }
    
    /**
     * 建立WebSocket连接
     */
    connect() {
        const host = window.location.host;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // 如果已有连接且状态正常，不要重新连接
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        
        this.ws = new WebSocket(`${wsProtocol}//${host}`);
        
        // 减少连接超时
        this.connectionTimeout = setTimeout(() => {
            if (this.ws.readyState !== WebSocket.OPEN) {
                this.ws.close();
                this.updateConnectionStatus(false, '连接超时，正在重试...');
                this.connect(); // 立即尝试重连
            }
        }, 3000); // 3秒连接超时
        
        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);
    }
    
    /**
     * 处理连接打开事件
     */
    handleOpen() {
        clearTimeout(this.connectionTimeout);
        console.log('WebSocket连接成功');
        this.updateConnectionStatus(true, '已连接');
        
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        // 发送ping保持连接活跃
        this.startPingInterval();
    }
    
    /**
     * 处理接收消息事件
     * @param {MessageEvent} event WebSocket消息事件
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            // 检查是否有类型字段
            if (message.type && message.type === 'operation-update') {
                console.log('收到操作更新', message.data);
                // 通知操作订阅者
                this.notifyOperationSubscribers(message.data);
            } else {
                // 默认处理为数据更新
                console.log('收到数据更新');
                this.notifySubscribers(message);
            }
        } catch (error) {
            console.error('解析WebSocket消息出错:', error);
        }
    }
    
    /**
     * 订阅操作更新
     * @param {Function} callback 操作更新回调函数
     */
    subscribeToOperations(callback) {
        if (!this.operationSubscribers) {
            this.operationSubscribers = [];
        }
        
        if (typeof callback === 'function') {
            this.operationSubscribers.push(callback);
        }
    }
    
    /**
     * 通知操作订阅者
     * @param {Object} data 操作数据
     */
    notifyOperationSubscribers(data) {
        if (!this.operationSubscribers) return;
        
        this.operationSubscribers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('执行操作更新回调出错:', error);
            }
        });
    }
    
    /**
     * 处理连接关闭事件
     */
    handleClose() {
        console.log('WebSocket连接关闭');
        this.updateConnectionStatus(false, '已断开 (重连中...)');
        
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => this.connect(), 5000);
        }
    }
    
    /**
     * 处理连接错误事件
     * @param {Event} error WebSocket错误事件
     */
    handleError(error) {
        console.error('WebSocket错误:', error);
        this.updateConnectionStatus(false, '连接错误');
    }
    
    /**
     * 更新连接状态UI
     * @param {boolean} isConnected 是否已连接
     * @param {string} message 状态消息
     */
    updateConnectionStatus(isConnected, message) {
        if (isConnected) {
            this.connectionStatus.classList.add('connected');
            this.connectionStatus.classList.remove('disconnected');
        } else {
            this.connectionStatus.classList.add('disconnected');
            this.connectionStatus.classList.remove('connected');
        }
        this.connectionText.textContent = message;
    }
    
    /**
     * 启动Ping间隔发送
     */
    startPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 25000); // 每25秒发送一次ping
    }
    
    /**
     * 发送消息
     * @param {Object} data 要发送的数据
     */
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket未连接，无法发送消息');
        }
    }
    
    /**
     * 关闭连接
     */
    close() {
        if (this.ws) {
            this.ws.close();
        }
        
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }
}