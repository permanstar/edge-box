const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device-controller');

// 获取所有数据
router.get('/data', deviceController.getData);

// 获取系统状态
router.get('/status', deviceController.getStatus);

// 切换设备状态
router.post('/devices/:deviceId/toggle', deviceController.toggleDevice);

// 批量切换设备状态
router.post('/devices/batch-toggle', deviceController.batchToggleDevices);

module.exports = router;