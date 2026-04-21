#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的测试数据初始化脚本
"""

from app import create_app
from models import db, Farm, Pen, Camera, Cattle
from datetime import datetime, date

def init_test_data():
    """初始化测试数据"""
    app = create_app()
    
    with app.app_context():
        # 创建数据库表
        db.create_all()
        
        # 检查是否已有数据
        if Farm.query.count() > 0:
            print("数据库中已有数据，跳过初始化")
            return
        
        # 创建养牛厂
        farm1 = Farm(
            name="广西农垦牧场1",
            address="广西南宁市青秀区",
            contact_person="张三",
            contact_phone="13800138001"
        )
        
        farm2 = Farm(
            name="广西农垦牧场2", 
            address="广西柳州市柳北区",
            contact_person="李四",
            contact_phone="13800138002"
        )
        
        db.session.add(farm1)
        db.session.add(farm2)
        db.session.commit()
        
        # 创建栏位
        pen1 = Pen(
            name="A区1号栏",
            farm_id=farm1.id,
            capacity=50,
            current_count=0
        )
        
        pen2 = Pen(
            name="A区2号栏",
            farm_id=farm1.id,
            capacity=50,
            current_count=0
        )
        
        pen3 = Pen(
            name="B区1号栏",
            farm_id=farm2.id,
            capacity=40,
            current_count=0
        )
        
        db.session.add(pen1)
        db.session.add(pen2)
        db.session.add(pen3)
        db.session.commit()
        
        # 创建摄像头
        camera1 = Camera(
            name="A区1号栏摄像头",
            farm_id=farm1.id,
            pen_id=pen1.id,
            ip_address="192.168.1.101",
            status="active"
        )
        
        camera2 = Camera(
            name="A区2号栏摄像头",
            farm_id=farm1.id,
            pen_id=pen2.id,
            ip_address="192.168.1.102",
            status="active"
        )
        
        camera3 = Camera(
            name="B区1号栏摄像头",
            farm_id=farm2.id,
            pen_id=pen3.id,
            ip_address="192.168.1.103",
            status="active"
        )
        
        db.session.add(camera1)
        db.session.add(camera2)
        db.session.add(camera3)
        db.session.commit()
        
        # 创建牛只
        cattle_list = [
            Cattle(
                ear_tag="GX001",
                farm_id=farm1.id,
                pen_id=pen1.id,
                breed="安格斯",
                birth_date=date(2022, 3, 15),
                weight=450.5,
                gender="female",
                status="healthy"
            ),
            Cattle(
                ear_tag="GX002",
                farm_id=farm1.id,
                pen_id=pen1.id,
                breed="西门塔尔",
                birth_date=date(2022, 5, 20),
                weight=480.0,
                gender="male",
                status="healthy"
            ),
            Cattle(
                ear_tag="GX003",
                farm_id=farm1.id,
                pen_id=pen2.id,
                breed="夏洛莱",
                birth_date=date(2022, 1, 10),
                weight=520.3,
                gender="female",
                status="healthy"
            ),
            Cattle(
                ear_tag="GX004",
                farm_id=farm2.id,
                pen_id=pen3.id,
                breed="利木赞",
                birth_date=date(2022, 4, 8),
                weight=465.8,
                gender="male",
                status="healthy"
            ),
            Cattle(
                ear_tag="GX005",
                farm_id=farm2.id,
                pen_id=pen3.id,
                breed="海福特",
                birth_date=date(2022, 6, 12),
                weight=440.2,
                gender="female",
                status="healthy"
            )
        ]
        
        for cattle in cattle_list:
            db.session.add(cattle)
        
        # 更新栏位牛只数量
        pen1.current_count = 2
        pen2.current_count = 1
        pen3.current_count = 2
        
        db.session.commit()
        
        print("测试数据初始化完成！")
        print(f"创建了 {Farm.query.count()} 个养牛厂")
        print(f"创建了 {Pen.query.count()} 个栏位")
        print(f"创建了 {Camera.query.count()} 个摄像头")
        print(f"创建了 {Cattle.query.count()} 头牛只")

if __name__ == '__main__':
    init_test_data()