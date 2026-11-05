export const building = {
  name: '专享楼A座',
  university: '北京邮电大学',
  campus: '海南校区',
  address: '海南省陵水黎族自治县',
}

export const colleges = [
  '玛丽女王海南学院',
  '信息与通信工程学院',
  '电子工程学院',
  '计算机学院（国家示范性软件学院）',
  '网络空间安全学院',
  '人工智能学院',
  '数字媒体与设计艺术学院',
  '现代邮政学院（自动化学院）',
  '理学院',
  '经济管理学院',
  '人文学院',
  '国际学院',
]

export const segments = [
  { id: 1, label: '第1-2节', time: '08:00-09:40' },
  { id: 2, label: '第3-4节', time: '10:00-11:40' },
  { id: 3, label: '第5-6节', time: '13:30-15:10' },
  { id: 4, label: '第7-8节', time: '15:30-17:10' },
  { id: 5, label: '第9-10节', time: '18:30-20:10' },
  { id: 6, label: '第11-12节', time: '20:30-22:00' },
]

export const floors = [1, 2, 3, 4, 5]

const emptySchedule = Array.from({ length: 6 }, () => null)

function buildSchedule(slots) {
  const schedule = [...emptySchedule]
  Object.entries(slots).forEach(([index, item]) => {
    schedule[Number(index)] = item
  })
  return schedule
}

function makeRoom(roomNo, floor, type, options = {}) {
  const {
    note = '',
    capacity = 0,
    facilities = [],
    schedule = null,
    reservable = false,
  } = options

  const defaultFacilities = {
    智慧教室: ['多媒体', '空调'],
    研讨室: ['研讨屏', '空调'],
    创新基地: ['共享工位'],
    团体辅导室: ['研讨屏'],
    智慧教室控制室: ['控制台'],
    实验室: ['实验设备'],
    办公室: ['办公区'],
    会议室: ['会议屏'],
    录音棚: ['录音设备'],
    教工活动区: ['活动区'],
  }

  return {
    id: `a${floor}-${roomNo}`,
    room: String(roomNo),
    floor,
    type,
    note,
    capacity,
    facilities: facilities.length ? facilities : defaultFacilities[type] || [type],
    schedule: schedule || emptySchedule,
    reservable,
  }
}

const firstFloor = [
  makeRoom(101, 1, '创新基地', { facilities: ['共享工位', '路演区'] }),
  makeRoom(102, 1, '智慧教室', { note: '未投入' }),
  makeRoom(103, 1, '智慧教室', { note: '未投入' }),
  makeRoom(104, 1, '智慧教室', { note: '未投入' }),
]

const secondFloor = [
  makeRoom(201, 2, '智慧教室', {
    capacity: 60,
    reservable: true,
    schedule: buildSchedule({
      0: { course: 'Python 程序设计', teacher: '李思雨', unit: '计科2班' },
      3: { course: '概率论与数理统计', teacher: '何静', unit: '理学院2班' },
    }),
  }),
  makeRoom(202, 2, '团体辅导室'),
  makeRoom(203, 2, '智慧教室', {
    capacity: 60,
    reservable: true,
    schedule: buildSchedule({
      1: { course: '操作系统', teacher: '罗新', unit: '计科3班' },
      4: { course: '学术英语写作', teacher: '许南', unit: '玛丽女王1班' },
    }),
  }),
  makeRoom(204, 2, '智慧教室', {
    capacity: 60,
    reservable: true,
    schedule: buildSchedule({
      2: { course: '信号与系统', teacher: '周启', unit: '电子3班' },
    }),
  }),
  makeRoom(205, 2, '智慧教室', {
    capacity: 60,
    reservable: true,
    schedule: buildSchedule({
      0: { course: '高等数学 A（上）', teacher: '王志远', unit: '玛丽女王2班' },
    }),
  }),
  makeRoom(206, 2, '团体辅导室'),
  makeRoom(207, 2, '智慧教室', {
    capacity: 60,
    reservable: true,
    schedule: buildSchedule({
      3: { course: '数字图像处理', teacher: '邵敏', unit: '数媒2班' },
    }),
  }),
  makeRoom(208, 2, '智慧教室', {
    capacity: 60,
    reservable: true,
    schedule: buildSchedule({
      2: { course: '机器学习', teacher: '曹原', unit: '人工智能1班' },
    }),
  }),
  makeRoom(209, 2, '智慧教室', {
    capacity: 60,
    reservable: true,
    schedule: buildSchedule({
      1: { course: '通信原理', teacher: '孙博', unit: '通信3班' },
    }),
  }),
  makeRoom(210, 2, '智慧教室', { note: '未使用' }),
  makeRoom(211, 2, '智慧教室', { note: '未使用' }),
  makeRoom(212, 2, '智慧教室控制室'),
  makeRoom(213, 2, '智慧教室', { note: '未使用' }),
]

const thirdFloor = [
  makeRoom(315, 3, '智慧教室', { note: '整层未投入' }),
  makeRoom(311, 3, '智慧教室', { note: '整层未投入' }),
  makeRoom(310, 3, '智慧教室', { note: '整层未投入' }),
  makeRoom(309, 3, '智慧教室', { note: '整层未投入' }),
  makeRoom(307, 3, '智慧教室', { note: '整层未投入' }),
  makeRoom(314, 3, '研讨室', { note: '整层未投入' }),
  makeRoom(308, 3, '研讨室', { note: '整层未投入' }),
  makeRoom(313, 3, '两校三地艺术装置及智能传感实验室', { note: '整层未投入' }),
  makeRoom(312, 3, '两校三地艺术装置及智能传感实验室', { note: '整层未投入' }),
  makeRoom(306, 3, '两校三地信息计算与大数据实验室', { note: '整层未投入' }),
  makeRoom(305, 3, '两校三地信息计算与大数据实验室', { note: '整层未投入' }),
  makeRoom(304, 3, '两校三地语言实验室', { note: '整层未投入' }),
  makeRoom(303, 3, '两校三地语言实验室', { note: '整层未投入' }),
  makeRoom(302, 3, '研讨室', { note: '整层未投入' }),
  makeRoom(301, 3, '两校三地智能医学脑电实验室', { note: '整层未投入' }),
]

const fourthFloor = [
  makeRoom(401, 4, '基础电路实验室', { note: '整层未投入' }),
  makeRoom(402, 4, '实验室管理员办公室', { note: '整层未投入' }),
  makeRoom(403, 4, '数字人实验室', { note: '整层未投入' }),
  makeRoom(404, 4, '录音棚', { note: '整层未投入' }),
  makeRoom(405, 4, '物理实验室', { note: '整层未投入' }),
  makeRoom(406, 4, '物理实验室', { note: '整层未投入' }),
  makeRoom(407, 4, '两校三地智能医学图像实验室', { note: '整层未投入' }),
  makeRoom(408, 4, '研讨室', { note: '整层未投入' }),
  makeRoom(409, 4, '智慧教室', { note: '整层未投入' }),
  makeRoom(410, 4, '智慧教室', { note: '整层未投入' }),
  makeRoom(411, 4, '智慧教室', { note: '整层未投入' }),
  makeRoom(412, 4, '智慧教室', { note: '整层未投入' }),
  makeRoom(413, 4, '智慧教室', { note: '整层未投入' }),
  makeRoom(414, 4, '研讨室', { note: '整层未投入' }),
  makeRoom(415, 4, '智慧教室', { note: '整层未投入' }),
]

const fifthFloor = [
  makeRoom(501, 5, '会议室'),
  makeRoom(502, 5, '研讨室', {
    capacity: 12,
    reservable: true,
    schedule: buildSchedule({
      2: { course: '研究生文献研讨', teacher: '顾言', unit: '科研小组' },
    }),
  }),
  makeRoom('503-518', 5, '办公室', { facilities: ['办公区', '会议室'] }),
  makeRoom(519, 5, '研讨室', {
    capacity: 12,
    reservable: true,
    schedule: buildSchedule({
      3: { course: '国际交流语言实践', teacher: '陈蕾', unit: '国际2班' },
    }),
  }),
  makeRoom('520-533', 5, '办公室', { facilities: ['办公区'] }),
  makeRoom(534, 5, '研讨室', {
    capacity: 12,
    reservable: true,
    schedule: buildSchedule({
      1: { course: '学科交叉组会', teacher: '方越', unit: '科研团队' },
    }),
  }),
  makeRoom(535, 5, '教工活动区'),
]

const shouldShowInPlatform = (room) =>
  room.reservable ||
  room.note?.includes('未投入') ||
  room.note === '未使用'

export const initialRooms = [
  ...firstFloor,
  ...secondFloor,
  ...thirdFloor,
  ...fourthFloor,
  ...fifthFloor,
].filter(shouldShowInPlatform)
