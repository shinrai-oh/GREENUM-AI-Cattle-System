/**
 * 数据库初始种子脚本
 * 创建默认管理员账户和示例养殖场
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './db';

async function main() {
  // 创建默认管理员
  const adminUsername = process.env.INIT_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.INIT_ADMIN_PASSWORD || 'admin123';

  const existing = await prisma.sharedUser.findUnique({ where: { username: adminUsername } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.sharedUser.create({
      data: { username: adminUsername, passwordHash, role: 'admin' },
    });
    console.log(`创建管理员账户: ${adminUsername}`);
  } else {
    console.log(`管理员账户已存在: ${adminUsername}`);
  }

  // 创建默认养殖场（如果不存在）
  const farmCount = await prisma.sharedFarm.count();
  if (farmCount === 0) {
    const farm = await prisma.sharedFarm.create({
      data: {
        name: '绿姆山牛场',
        address: '默认地址',
        contactPerson: '负责人',
        contactPhone: '',
      },
    });
    console.log(`创建默认养殖场: ${farm.name} (ID: ${farm.id})`);

    // 创建默认栏位
    const pens = ['A1', 'A2', 'B1', 'B2'];
    for (const penNumber of pens) {
      await prisma.sharedPen.create({
        data: { farmId: farm.id, penNumber, capacity: 20 },
      });
    }
    console.log(`创建默认栏位: ${pens.join(', ')}`);
  }

  console.log('种子数据初始化完成');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
