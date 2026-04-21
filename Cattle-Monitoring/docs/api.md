# 肉牛养殖监控系统 API 文档

本文档详细描述了肉牛养殖监控系统的REST API接口，包括请求格式、响应格式和使用示例。

## 基本信息

- **Base URL**: `http://localhost:5000/api/v1`
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

## 通用响应格式

所有API响应都遵循以下格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {},
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息",
  "status_code": 400
}
```

## 系统接口

### 1. 健康检查

检查系统运行状态。

**请求**
```
GET /health
```

**响应**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### 2. 获取API信息

获取API基本信息和端点列表。

**请求**
```
GET /api/v1/info
```

**响应**
```json
{
  "success": true,
  "data": {
    "name": "肉牛养殖监控系统 API",
    "version": "1.0.0",
    "description": "提供视频监控和数据统计功能的REST API",
    "endpoints": {
      "farms": "/api/v1/farms",
      "cameras": "/api/v1/cameras",
      "statistics": "/api/v1/statistics",
      "health": "/health"
    }
  }
}
```

### 3. 获取仪表板数据

获取系统概览数据。

**请求**
```
GET /api/v1/dashboard
```

**响应**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_farms": 2,
      "total_pens": 6,
      "total_cattle": 8,
      "total_cameras": 32,
      "active_cameras": 30
    },
    "farms": [
      {
        "id": 1,
        "name": "阳光牧场",
        "pens_count": 4,
        "cattle_count": 6,
        "cameras_count": 16
      }
    ],
    "camera_status": {
      "active": 30,
      "inactive": 1,
      "maintenance": 1
    }
  }
}
```

### 4. 系统状态检查

检查系统各组件状态。

**请求**
```
GET /api/v1/system/status
```

**响应**
```json
{
  "success": true,
  "data": {
    "database": {
      "status": "connected",
      "connected": true
    },
    "cameras": {
      "total": 32,
      "active": 30,
      "health_percentage": 93.75
    },
    "system": {
      "uptime": "N/A",
      "version": "1.0.0",
      "environment": "production"
    }
  }
}
```

## 养牛厂管理接口

### 1. 获取养牛厂列表

**请求**
```
GET /api/v1/farms?page=1&per_page=20
```

**参数**
- `page` (可选): 页码，默认为1
- `per_page` (可选): 每页数量，默认为20

**响应**
```json
{
  "success": true,
  "data": {
    "farms": [
      {
        "id": 1,
        "name": "阳光牧场",
        "address": "北京市昌平区阳光路123号",
        "contact_person": "张三",
        "contact_phone": "13800138001",
        "created_at": "2024-01-15T08:00:00Z",
        "statistics": {
          "pens_count": 4,
          "cattle_count": 6,
          "cameras_count": 16,
          "active_cameras": 16
        }
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 2,
      "pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

### 2. 获取单个养牛厂详情

**请求**
```
GET /api/v1/farms/{farm_id}
```

**响应**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "阳光牧场",
    "address": "北京市昌平区阳光路123号",
    "contact_person": "张三",
    "contact_phone": "13800138001",
    "pens": [
      {
        "id": 1,
        "pen_number": "A001",
        "capacity": 50,
        "current_count": 45
      }
    ],
    "cameras": [
      {
        "id": 1,
        "name": "阳光牧场-A001-1",
        "location": "A001栏位东侧",
        "status": "active"
      }
    ],
    "statistics": {
      "pens_count": 4,
      "cattle_count": 6,
      "cameras_count": 16,
      "total_capacity": 220,
      "current_occupancy": 200
    }
  }
}
```

### 3. 创建养牛厂

**请求**
```
POST /api/v1/farms
Content-Type: application/json

{
  "name": "新牧场",
  "address": "河北省承德市新牧场路456号",
  "contact_person": "李四",
  "contact_phone": "13800138002"
}
```

**响应**
```json
{
  "success": true,
  "message": "养牛厂创建成功",
  "data": {
    "id": 3,
    "name": "新牧场",
    "address": "河北省承德市新牧场路456号",
    "contact_person": "李四",
    "contact_phone": "13800138002",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 4. 更新养牛厂

**请求**
```
PUT /api/v1/farms/{farm_id}
Content-Type: application/json

{
  "name": "更新后的牧场名称",
  "address": "更新后的地址"
}
```

### 5. 删除养牛厂

**请求**
```
DELETE /api/v1/farms/{farm_id}
```

**响应**
```json
{
  "success": true,
  "message": "养牛厂删除成功"
}
```

## 摄像头管理接口

### 1. 获取摄像头列表

**请求**
```
GET /api/v1/cameras?page=1&per_page=20&farm_id=1&status=active
```

**参数**
- `page` (可选): 页码
- `per_page` (可选): 每页数量
- `farm_id` (可选): 养牛厂ID
- `status` (可选): 摄像头状态 (active/inactive/maintenance)

**响应**
```json
{
  "success": true,
  "data": {
    "cameras": [
      {
        "id": 1,
        "name": "阳光牧场-A001-1",
        "rtsp_url": "rtsp://admin:password@192.168.1.101:554/stream1",
        "location": "A001栏位东侧",
        "farm_id": 1,
        "pen_id": 1,
        "status": "active",
        "farm_name": "阳光牧场",
        "pen_number": "A001",
        "created_at": "2024-01-15T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 32,
      "pages": 2,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 2. 获取摄像头视频流

**请求**
```
GET /api/v1/cameras/{camera_id}/stream
```

**响应**
返回MJPEG视频流，Content-Type为 `multipart/x-mixed-replace; boundary=frame`

### 3. 获取摄像头快照

**请求**
```
GET /api/v1/cameras/{camera_id}/snapshot
```

**响应**
```json
{
  "success": true,
  "data": {
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "timestamp": "2024-01-15T10:30:00Z",
    "camera_id": 1
  }
}
```

### 4. 测试摄像头连接

**请求**
```
POST /api/v1/cameras/{camera_id}/test
```

**响应**
```json
{
  "success": true,
  "message": "摄像头连接正常",
  "status": "connected"
}
```

### 5. 创建摄像头

**请求**
```
POST /api/v1/cameras
Content-Type: application/json

{
  "name": "新摄像头",
  "rtsp_url": "rtsp://admin:password@192.168.1.200:554/stream1",
  "location": "新位置",
  "farm_id": 1,
  "pen_id": 1,
  "status": "active"
}
```

## 统计数据接口

### 1. 获取日统计数据

**请求**
```
GET /api/v1/statistics/daily?farm_id=1&start_date=2024-01-01&end_date=2024-01-15&page=1&per_page=20
```

**参数**
- `farm_id` (可选): 养牛厂ID
- `pen_id` (可选): 栏位ID
- `cattle_id` (可选): 牛只ID
- `start_date` (可选): 开始日期 (YYYY-MM-DD)
- `end_date` (可选): 结束日期 (YYYY-MM-DD)
- `page` (可选): 页码
- `per_page` (可选): 每页数量

**响应**
```json
{
  "success": true,
  "data": {
    "statistics": [
      {
        "id": 1,
        "cattle_id": 1,
        "pen_id": 1,
        "stat_date": "2024-01-15",
        "eating_time": 180,
        "standing_time": 240,
        "lying_time": 600,
        "walking_time": 60,
        "drinking_time": 15,
        "total_active_time": 495,
        "cattle_ear_tag": "YG001",
        "pen_number": "A001"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 100,
      "pages": 5,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 2. 获取统计摘要

**请求**
```
GET /api/v1/statistics/summary?farm_id=1&date=2024-01-15
```

**参数**
- `farm_id` (可选): 养牛厂ID
- `pen_id` (可选): 栏位ID
- `date` (可选): 统计日期，默认为今天

**响应**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "total_cattle": 8,
    "averages": {
      "eating_time": 178.75,
      "standing_time": 228.75,
      "lying_time": 590.0,
      "walking_time": 60.0,
      "drinking_time": 16.25,
      "total_active_time": 483.75
    },
    "totals": {
      "eating_time": 1430,
      "standing_time": 1830,
      "lying_time": 4720,
      "walking_time": 480,
      "drinking_time": 130,
      "total_active_time": 3870
    }
  }
}
```

### 3. 获取行为趋势数据

**请求**
```
GET /api/v1/statistics/trends?farm_id=1&days=7
```

**参数**
- `farm_id` (可选): 养牛厂ID
- `pen_id` (可选): 栏位ID
- `cattle_id` (可选): 牛只ID
- `days` (可选): 天数，默认为7天

**响应**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "2024-01-15",
        "cattle_count": 8,
        "avg_eating_time": 178.75,
        "avg_standing_time": 228.75,
        "avg_lying_time": 590.0,
        "avg_walking_time": 60.0,
        "avg_drinking_time": 16.25,
        "avg_total_active_time": 483.75
      }
    ],
    "period": {
      "start_date": "2024-01-09",
      "end_date": "2024-01-15",
      "days": 7
    }
  }
}
```

### 4. 获取行为对比数据

**请求**
```
GET /api/v1/statistics/comparison?pen_ids=1,2,3&date=2024-01-15
```

**参数**
- `pen_ids` (必需): 栏位ID列表，用逗号分隔
- `date` (可选): 对比日期，默认为今天

**响应**
```json
{
  "success": true,
  "data": {
    "comparison": [
      {
        "pen_id": 1,
        "pen_number": "A001",
        "farm_name": "阳光牧场",
        "cattle_count": 2,
        "avg_eating_time": 172.5,
        "avg_standing_time": 230.0,
        "avg_lying_time": 590.0,
        "avg_walking_time": 67.5,
        "avg_drinking_time": 13.5,
        "avg_total_active_time": 483.5
      }
    ],
    "date": "2024-01-15",
    "total_pens": 3
  }
}
```

### 5. 获取牛只历史数据

**请求**
```
GET /api/v1/statistics/cattle/{cattle_id}/history?days=30
```

**参数**
- `days` (可选): 历史天数，默认为30天

**响应**
```json
{
  "success": true,
  "data": {
    "cattle": {
      "id": 1,
      "ear_tag": "YG001",
      "breed": "安格斯",
      "farm_name": "阳光牧场",
      "pen_number": "A001"
    },
    "daily_statistics": [
      {
        "stat_date": "2024-01-15",
        "eating_time": 180,
        "standing_time": 240,
        "lying_time": 600,
        "walking_time": 60,
        "drinking_time": 15,
        "total_active_time": 495
      }
    ],
    "recent_behaviors": [
      {
        "behavior_type": "eating",
        "start_time": "2024-01-15T08:00:00Z",
        "end_time": "2024-01-15T08:45:00Z",
        "duration": 2700,
        "confidence": 0.95
      }
    ],
    "period": {
      "start_date": "2023-12-16",
      "end_date": "2024-01-15",
      "days": 30
    }
  }
}
```

### 6. 导出统计数据

**请求**
```
GET /api/v1/statistics/export?farm_id=1&start_date=2024-01-01&end_date=2024-01-15&format=json
```

**参数**
- `farm_id` (可选): 养牛厂ID
- `pen_id` (可选): 栏位ID
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期
- `format` (可选): 导出格式，目前支持json

**响应**
```json
{
  "success": true,
  "data": {
    "statistics": [...],
    "total": 100,
    "export_time": "2024-01-15T10:30:00Z"
  }
}
```

## 行为数据接口

### 1. 获取行为数据

**请求**
```
GET /api/v1/statistics/behavior?farm_id=1&behavior_type=eating&start_time=2024-01-15 00:00:00&end_time=2024-01-15 23:59:59
```

**参数**
- `farm_id` (可选): 养牛厂ID
- `pen_id` (可选): 栏位ID
- `cattle_id` (可选): 牛只ID
- `behavior_type` (可选): 行为类型 (eating/standing/lying/walking/drinking)
- `start_time` (可选): 开始时间 (YYYY-MM-DD HH:MM:SS)
- `end_time` (可选): 结束时间 (YYYY-MM-DD HH:MM:SS)
- `page` (可选): 页码
- `per_page` (可选): 每页数量

**响应**
```json
{
  "success": true,
  "data": {
    "behavior_data": [
      {
        "id": 1,
        "cattle_id": 1,
        "pen_id": 1,
        "behavior_type": "eating",
        "start_time": "2024-01-15T08:00:00Z",
        "end_time": "2024-01-15T08:45:00Z",
        "duration": 2700,
        "camera_id": 1,
        "confidence": 0.95,
        "cattle_ear_tag": "YG001",
        "pen_number": "A001",
        "camera_name": "阳光牧场-A001-1"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 50,
      "total": 200,
      "pages": 4,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

## 错误代码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 使用示例

### Python示例

```python
import requests
import json

# 基础URL
base_url = "http://localhost:5000/api/v1"

# 获取养牛厂列表
response = requests.get(f"{base_url}/farms")
if response.status_code == 200:
    data = response.json()
    farms = data['data']['farms']
    print(f"找到 {len(farms)} 个养牛厂")

# 获取摄像头快照
camera_id = 1
response = requests.get(f"{base_url}/cameras/{camera_id}/snapshot")
if response.status_code == 200:
    data = response.json()
    image_data = data['data']['image']
    # 保存图片
    import base64
    image_bytes = base64.b64decode(image_data.split(',')[1])
    with open('snapshot.jpg', 'wb') as f:
        f.write(image_bytes)

# 创建新摄像头
new_camera = {
    "name": "测试摄像头",
    "rtsp_url": "rtsp://test:test@192.168.1.100:554/stream1",
    "location": "测试位置",
    "farm_id": 1,
    "status": "active"
}

response = requests.post(
    f"{base_url}/cameras",
    headers={'Content-Type': 'application/json'},
    data=json.dumps(new_camera)
)

if response.status_code == 201:
    print("摄像头创建成功")
    camera_data = response.json()['data']
    print(f"新摄像头ID: {camera_data['id']}")
```

### JavaScript示例

```javascript
// 基础URL
const baseUrl = 'http://localhost:5000/api/v1';

// 获取统计摘要
async function getStatisticsSummary(farmId, date) {
  try {
    const response = await fetch(`${baseUrl}/statistics/summary?farm_id=${farmId}&date=${date}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('统计摘要:', data.data);
      return data.data;
    } else {
      console.error('获取统计摘要失败:', data.message);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 测试摄像头连接
async function testCameraConnection(cameraId) {
  try {
    const response = await fetch(`${baseUrl}/cameras/${cameraId}/test`, {
      method: 'POST'
    });
    const data = await response.json();
    
    if (data.success) {
      console.log('摄像头连接正常');
    } else {
      console.log('摄像头连接失败:', data.message);
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 获取行为趋势数据
async function getBehaviorTrends(farmId, days = 7) {
  try {
    const response = await fetch(`${baseUrl}/statistics/trends?farm_id=${farmId}&days=${days}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data.trends;
    }
  } catch (error) {
    console.error('获取趋势数据失败:', error);
  }
}
```

### curl示例

```bash
# 获取系统健康状态
curl -X GET http://localhost:5000/health

# 获取养牛厂列表
curl -X GET "http://localhost:5000/api/v1/farms?page=1&per_page=10"

# 创建新养牛厂
curl -X POST http://localhost:5000/api/v1/farms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新牧场",
    "address": "测试地址",
    "contact_person": "测试联系人",
    "contact_phone": "13800000000"
  }'

# 获取摄像头快照
curl -X GET http://localhost:5000/api/v1/cameras/1/snapshot

# 获取统计数据
curl -X GET "http://localhost:5000/api/v1/statistics/daily?farm_id=1&start_date=2024-01-01&end_date=2024-01-15"

# 测试摄像头连接
curl -X POST http://localhost:5000/api/v1/cameras/1/test
```

## 注意事项

1. **认证**: 当前版本暂未实现用户认证，生产环境中应添加适当的认证机制。

2. **限流**: 建议在生产环境中实施API限流，特别是对于视频流和快照接口。

3. **缓存**: 统计数据接口建议实施缓存机制以提高性能。

4. **分页**: 所有列表接口都支持分页，建议合理设置每页数量以避免性能问题。

5. **时区**: 所有时间戳都使用UTC时间，客户端需要根据本地时区进行转换。

6. **视频流**: 视频流接口返回MJPEG格式，适合在网页中直接显示。

7. **错误处理**: 客户端应该正确处理各种HTTP状态码和错误响应。

## 更新日志

### v1.0.0 (2024-01-15)
- 初始版本发布
- 实现基础的CRUD操作
- 支持视频流和统计数据接口
- 添加系统监控接口

---

如有疑问或建议，请联系开发团队。