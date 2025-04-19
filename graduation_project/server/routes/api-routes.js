const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device-controller');
const userController = require('../controllers/user-controller');
const permissionController = require('../controllers/permission-controller');
const { authenticateUser, requireAdmin, checkDeviceAccess } = require('../middlewares/auth-middleware');

// 用户认证相关路由
router.post('/login', userController.login);
router.post('/register', authenticateUser, requireAdmin, userController.register); // 只有管理员可以注册新用户
router.post('/logout', userController.logout);
router.get('/profile', authenticateUser, userController.getProfile);

// 设备权限相关路由
router.post('/permissions/device', authenticateUser, requireAdmin, permissionController.assignDeviceToUser);
router.delete('/permissions/device/:userId/:deviceId', authenticateUser, requireAdmin, permissionController.removeDeviceFromUser);
router.get('/permissions/user/:userId', authenticateUser, requireAdmin, permissionController.getUserDevices);

// 设备数据相关路由
router.get('/data', authenticateUser, deviceController.getData);
router.get('/status', authenticateUser, deviceController.getStatus);

// 设备控制相关路由（需要检查设备访问权限）
router.post('/devices/:deviceId/toggle', authenticateUser, checkDeviceAccess, deviceController.toggleDevice);
router.post('/devices/batch-toggle', authenticateUser, deviceController.batchToggleDevices);

module.exports = router;