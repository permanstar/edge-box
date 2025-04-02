const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device-controller');

// 获取所有数据
router.get('/data', deviceController.getData);

// 切换设备状态
router.post('/devices/:deviceId/toggle', deviceController.toggleDevice);

// 获取系统状态
router.get('/status', deviceController.getStatus);

module.exports = router;