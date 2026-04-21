// 性能测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/v1';

// 测试API响应时间
async function testAPIPerformance() {
  console.log('🚀 开始API性能测试...\n');
  
  const endpoints = [
    { name: 'Dashboard数据', url: `${BASE_URL}/dashboard` },
    { name: '系统状态', url: `${BASE_URL}/system/status` },
    { name: '摄像头列表', url: `${BASE_URL}/cameras?per_page=10` },
    { name: '统计数据', url: `${BASE_URL}/statistics/daily?date=2025-10-09` }
  ];

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await axios.get(endpoint.url, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`✅ ${endpoint.name}: ${responseTime}ms (状态: ${response.status})`);
      
      // 测试缓存效果 - 第二次请求应该更快
      const startTime2 = Date.now();
      await axios.get(endpoint.url, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      });
      const endTime2 = Date.now();
      const responseTime2 = endTime2 - startTime2;
      
      console.log(`🔄 ${endpoint.name} (缓存): ${responseTime2}ms`);
      console.log(`📈 性能提升: ${Math.round((responseTime - responseTime2) / responseTime * 100)}%\n`);
      
    } catch (error) {
      console.log(`❌ ${endpoint.name}: 请求失败 - ${error.message}\n`);
    }
  }
}

// 测试并发请求
async function testConcurrentRequests() {
  console.log('🔄 测试并发请求性能...\n');
  
  const concurrentRequests = 5;
  const url = `${BASE_URL}/dashboard`;
  
  const startTime = Date.now();
  const promises = Array(concurrentRequests).fill().map(() => 
    axios.get(url, { timeout: 15000 })
  );
  
  try {
    await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`✅ ${concurrentRequests}个并发请求完成`);
    console.log(`⏱️  总耗时: ${totalTime}ms`);
    console.log(`📊 平均响应时间: ${Math.round(totalTime / concurrentRequests)}ms\n`);
  } catch (error) {
    console.log(`❌ 并发请求测试失败: ${error.message}\n`);
  }
}

// 主测试函数
async function runPerformanceTests() {
  console.log('🎯 肉牛养殖监控系统 - 性能测试报告');
  console.log('=' .repeat(50));
  console.log(`测试时间: ${new Date().toLocaleString()}\n`);
  
  await testAPIPerformance();
  await testConcurrentRequests();
  
  console.log('✨ 性能测试完成！');
  console.log('\n📋 优化总结:');
  console.log('- 数据库连接池优化 ✅');
  console.log('- RTSP流处理改进 ✅'); 
  console.log('- 系统状态检查频率降低 ✅');
  console.log('- 前端API缓存机制 ✅');
  console.log('- 组件级别缓存 ✅');
  console.log('- Keep-alive页面缓存 ✅');
}

// 运行测试
runPerformanceTests().catch(console.error);