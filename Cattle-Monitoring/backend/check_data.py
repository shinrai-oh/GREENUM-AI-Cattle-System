#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查数据库中的实际数据
"""

from app import create_app
from models import db, Farm

def check_data():
    """检查数据库中的数据"""
    app = create_app()
    
    with app.app_context():
        farms = Farm.query.all()
        print(f"数据库中共有 {len(farms)} 个养牛厂:")
        
        for farm in farms:
            print(f"ID: {farm.id}")
            print(f"名称: {repr(farm.name)}")
            print(f"地址: {repr(farm.address)}")
            print(f"联系人: {repr(farm.contact_person)}")
            print("-" * 40)
            
        # 测试搜索
        print("\n测试搜索功能:")
        search_terms = ["广西", "农垦", "牧场", "1", "2"]
        
        for term in search_terms:
            results = Farm.query.filter(Farm.name.ilike(f'%{term}%')).all()
            print(f"搜索 '{term}': 找到 {len(results)} 个结果")
            for result in results:
                print(f"  - {result.name}")

if __name__ == '__main__':
    check_data()