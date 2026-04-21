// 农场与栏位模拟数据

export const getFarmsMock = () => {
  return {
    farms: [
      { id: 1, name: '广西农垦牧场1' },
      { id: 2, name: '广西农垦牧场2' }
    ]
  }
}

export const getFarmPensMock = (farmId) => {
  const pens = [
    { id: 101, pen_number: 'A001' },
    { id: 102, pen_number: 'A002' },
    { id: 103, pen_number: 'A003' }
  ]
  return { pens }
}

