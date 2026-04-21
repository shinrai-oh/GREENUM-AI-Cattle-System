
import pandas as pd
import sys

xlsx = pd.read_excel('D:/绿姆山牛场AI系统项目/Doc-ref/日混合料耗料记录2021.xlsx',
                     sheet_name=None, header=None)

result = {}
all_data = []

for sheet_name, df in xlsx.items():
    # skip the blank template sheet (first sheet, garbled name)
    if len(sheet_name) <= 3 and not sheet_name.startswith('2021'):
        print(f"Skipping sheet: repr={repr(sheet_name)}")
        continue

    # Only keep rows where column 0 contains 上午 or 下午
    data_rows = df[df[0].astype(str).str.contains('上午|下午', na=False)].copy()

    if len(data_rows) == 0:
        print(f"Sheet {sheet_name}: no data rows found")
        continue

    # Clean [merged] prefix
    for col in data_rows.columns:
        data_rows[col] = data_rows[col].apply(
            lambda v: str(v).replace('[merged] ','').strip() if pd.notna(v) else '')

    # Assign column names
    data_rows.columns = ['Session','Shed','Breed','精料','发酵料','啤酒糟','糖蜜','青贮','甘蔗尾','麦秆','合计']

    # Forward fill Breed
    data_rows['Breed'] = data_rows['Breed'].replace('', pd.NA).ffill()

    # Numeric conversion
    for col in ['精料','发酵料','啤酒糟','糖蜜','青贮','甘蔗尾','麦秆','合计']:
        data_rows[col] = pd.to_numeric(data_rows[col], errors='coerce').fillna(0)

    # Filter out all-zero rows
    data_rows = data_rows[data_rows['合计'] > 0]

    if len(data_rows) == 0:
        print(f"Sheet {sheet_name}: all rows zero after filter")
        continue

    all_data.append(data_rows)

    # Average per breed
    by_breed = data_rows.groupby('Breed')[['精料','发酵料','啤酒糟','糖蜜','青贮','甘蔗尾','麦秆','合计']].mean().round(0)

    print(f"\n=== {sheet_name} 按牛品种平均耗料 (kg/批次) ===")
    print(by_breed.to_string())

# Annual average
print("\n\n=== 全年综合平均（各品种每批次平均耗料）===")
all_df = pd.concat(all_data, ignore_index=True)
annual_avg = all_df.groupby('Breed')[['精料','发酵料','啤酒糟','糖蜜','青贮','甘蔗尾','麦秆','合计']].mean().round(0)
print(annual_avg.to_string())
print("\n各品种样本数：")
print(all_df.groupby('Breed').size())
