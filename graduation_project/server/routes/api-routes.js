const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device-controller');
const userController = require('../controllers/user-controller');
const permissionController = require('../controllers/permission-controller');
const { authenticateUser, requireAdmin, checkDeviceAccess, checkDeviceReadAccess, adminOnlyDeviceControl } = require('../middlewares/auth-middleware');

// 用户认证相关路由
router.post('/login', userController.login);
router.post('/register', authenticateUser, requireAdmin, userController.register); // 只有管理员可以注册新用户
router.post('/logout', userController.logout);
router.get('/profile', authenticateUser, userController.getProfile);

// 设备权限相关路由
router.post('/permissions/device', authenticateUser, requireAdmin, permissionController.assignDeviceToUser);
router.delete('/permissions/device/:userId/:deviceId', authenticateUser, requireAdmin, permissionController.removeDeviceFromUser);
router.get('/permissions/user/:userId', authenticateUser, requireAdmin, permissionController.getUserDevices);

// 设备数据相关路由 - 普通用户可以访问
router.get('/data', authenticateUser, deviceController.getData);
router.get('/status', authenticateUser, deviceController.getStatus);
router.get('/devices/:deviceId/data', authenticateUser, checkDeviceReadAccess, deviceController.getDeviceData);

// 设备控制相关路由 - 只有管理员可以访问
router.post('/devices/:deviceId/toggle', authenticateUser, adminOnlyDeviceControl, deviceController.toggleDevice);
router.post('/devices/batch-toggle', authenticateUser, adminOnlyDeviceControl, deviceController.batchToggleDevices);

module.exports = router;