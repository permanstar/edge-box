# 模拟IoT设备

这是一个用于模拟IoT设备的Node.js应用，可生成多种传感器数据并通过MQTT协议发送到边缘盒子。

## 功能特性

- 支持多种传感器类型：温度、湿度、光照、气压等
- 可配置传感器数量和数据范围
- 模拟实际传感器数据波动
- 通过MQTT协议发送数据
- 支持设备状态监控和故障模拟
- 支持远程控制

## 快速开始

### 使用Docker

```bash
# 构建镜像
docker build -t simulated-iot-device .

# 运行容器
docker run -d --name simulated-device \
  --network edge-box_edge-net \
  -e MQTT_BROKER_URL=mqtt://mqtt-broker:1883 \
  -e TEMPERATURE_SENSORS=5 \
  -e HUMIDITY_SENSORS=5 \
  -e SIMULATE_FAILURES=true \
  simulated-iot-device