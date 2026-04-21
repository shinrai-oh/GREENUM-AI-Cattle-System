// 简易 API 客户端，支持 Mock 与真实后端切换
// 将 USE_MOCK 设为 false 即可调用后端接口

const USE_MOCK = false;
const API_BASE = 'http://localhost:3000/api/v1';

const Api = {
  token: localStorage.getItem('imf_token') || null,
  me: (() => { try { return JSON.parse(localStorage.getItem('imf_user')); } catch(e) { return null; } })(),
  mockData: null,

  async ensureMockLoaded() {
    if (!USE_MOCK) return;
    if (this.mockData) return;
    const res = await fetch('mock-data.json');
    this.mockData = await res.json();
  },

  async login(username, password) {
    if (USE_MOCK) {
      await this.ensureMockLoaded();
      const ok = (username && password);
      this.token = ok ? 'mock-token' : null;
      this.me = ok ? { id: 1, username, role: username === 'admin' ? 'admin' : 'operator' } : null;
      return { token: this.token, user: this.me };
    }
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('登录失败');
    const data = await res.json();
    this.token = data.token; this.me = data.user;
    return data;
  },

  async getCattleList({ page = 1, pageSize = 20, search = '' } = {}) {
    if (USE_MOCK) {
      await this.ensureMockLoaded();
      let list = this.mockData.cattle_profiles;
      if (search) {
        list = list.filter(c => (c.ear_tag_id.includes(search) || (c.breed||'').includes(search)));
      }
      const total = list.length;
      const start = (page - 1) * pageSize;
      return { items: list.slice(start, start + pageSize), total };
    }
    const q = new URLSearchParams({ page, limit: pageSize, search }).toString();
    const res = await fetch(`${API_BASE}/cattle?${q}`, { headers: this.authHeaders() });
    const data = await res.json();
    const items = (data.items || []).map(c => ({
      ...c,
      ear_tag_id: c.earTag || c.ear_tag_id,
      sex: c.gender === 'M' ? 'male' : c.gender === 'F' ? 'female' : (c.sex || c.gender || '-'),
      birth_date: c.birthDate ? c.birthDate.slice(0, 10) : (c.birth_date || null),
      group_id: c.imfGroupId || c.penId || null,
    }));
    return { items, total: data.total || items.length };
  },

  async createCattle(payload) {
    if (USE_MOCK) {
      await this.ensureMockLoaded();
      const exists = this.mockData.cattle_profiles.find(c => c.ear_tag_id === payload.ear_tag_id);
      if (exists) throw new Error('耳标号已存在');
      const id = this.mockData.cattle_profiles.length + 1;
      this.mockData.cattle_profiles.push({ id, ...payload });
      return { id, ...payload };
    }
    const res = await fetch(`${API_BASE}/cattle`, { method: 'POST', headers: this.authJson(), body: JSON.stringify(payload) });
    return res.json();
  },

  async getCattleByEarTag(earTagId) {
    if (USE_MOCK) {
      await this.ensureMockLoaded();
      return this.mockData.cattle_profiles.find(c => c.ear_tag_id === earTagId);
    }
    const res = await fetch(`${API_BASE}/cattle/${encodeURIComponent(earTagId)}`, { headers: this.authHeaders() });
    const c = await res.json();
    if (!c || c.error) return null;
    return {
      ...c,
      ear_tag_id: c.earTag || c.ear_tag_id,
      sex: c.gender === 'M' ? 'male' : c.gender === 'F' ? 'female' : (c.sex || c.gender || '-'),
      birth_date: c.birthDate ? c.birthDate.slice(0, 10) : (c.birth_date || null),
      group_id: c.imfGroupId || c.penId || null,
    };
  },

  async updateCattle(earTagId, payload) {
    if (USE_MOCK) {
      await this.ensureMockLoaded();
      const idx = this.mockData.cattle_profiles.findIndex(c => c.ear_tag_id === earTagId);
      if (idx < 0) throw new Error('牛只不存在');
      this.mockData.cattle_profiles[idx] = { ...this.mockData.cattle_profiles[idx], ...payload };
      return this.mockData.cattle_profiles[idx];
    }
    const res = await fetch(`${API_BASE}/cattle/${encodeURIComponent(earTagId)}`, { method: 'PUT', headers: this.authJson(), body: JSON.stringify(payload) });
    return res.json();
  },

  async getMeasurementsForEarTag(earTagId) {
    if (USE_MOCK) {
      await this.ensureMockLoaded();
      return this.mockData.measurements.filter(m => m.cattle_ear_tag_id === earTagId);
    }
    const res = await fetch(`${API_BASE}/cattle/${encodeURIComponent(earTagId)}/measurements`, { headers: this.authHeaders() });
    return res.json();
  },

  calculateMockGrade(imf) {
    if (imf == null) return 'N/A';
    if (imf >= 6.0) return 'Prime+ (A5)';
    if (imf >= 4.5) return 'Prime (A4)';
    if (imf >= 3.0) return 'Choice+ (A3)';
    if (imf >= 2.0) return 'Choice (A2)';
    return 'Standard';
  },

  async createMeasurement(payload) {
    // payload: { ear_tag_id, measurement_date, backfat_thickness, ribeye_area, intramuscular_fat_imf, ribeye_height, ribeye_width, notes }
    if (USE_MOCK) {
      await this.ensureMockLoaded();
      const id = this.mockData.measurements.length + 1;
      const simulated_grade = this.calculateMockGrade(Number(payload.intramuscular_fat_imf));
      const user_id = this.me?.id || 1;
      const cattle = this.mockData.cattle_profiles.find(c => c.ear_tag_id === payload.ear_tag_id);
      if (!cattle) throw new Error('目标牛只不存在');
      const record = {
        id,
        cattle_profile_id: cattle.id,
        cattle_ear_tag_id: payload.ear_tag_id,
        user_id,
        measurement_date: payload.measurement_date,
        backfat_thickness: Number(payload.backfat_thickness || null),
        ribeye_area: Number(payload.ribeye_area || null),
        intramuscular_fat_imf: Number(payload.intramuscular_fat_imf || null),
        ribeye_height: Number(payload.ribeye_height || null),
        ribeye_width: Number(payload.ribeye_width || null),
        notes: payload.notes || '',
        simulated_grade,
      };
      this.mockData.measurements.push(record);
      return record;
    }
    const res = await fetch(`${API_BASE}/measurements`, { method: 'POST', headers: this.authJson(), body: JSON.stringify(payload) });
    return res.json();
  },

  async getGroupReports(groupIds = []) {
    if (USE_MOCK) {
      await this.ensureMockLoaded();
      const groups = this.mockData.cattle_groups.filter(g => groupIds.length === 0 || groupIds.includes(String(g.id)));
      const result = groups.map(g => {
        const cattleIds = this.mockData.cattle_profiles.filter(c => c.group_id === g.id).map(c => c.id);
        const ms = this.mockData.measurements.filter(m => cattleIds.includes(m.cattle_profile_id));
        const avg = (arr) => arr.length ? (arr.reduce((a,b)=>a+(b||0),0)/arr.length) : 0;
        return {
          group_id: g.id,
          group_name: g.group_name,
          avg_imf: Number(avg(ms.map(m => m.intramuscular_fat_imf)).toFixed(2)),
          avg_ribeye_area: Number(avg(ms.map(m => m.ribeye_area)).toFixed(2)),
          avg_backfat: Number(avg(ms.map(m => m.backfat_thickness)).toFixed(2)),
        };
      });
      return result;
    }
    const q = new URLSearchParams({ groupIds: groupIds.join(',') }).toString();
    const res = await fetch(`${API_BASE}/reports/group?${q}`, { headers: this.authHeaders() });
    return res.json();
  },

  async getCattleAssessments(filters = {}) {
    const {
      groupIds = [],
      grades = [],
      imfMin = null,
      imfMax = null,
      sortBy = 'date',
      sortOrder = 'desc',
      startDate = '',
      endDate = '',
    } = filters;
    if (USE_MOCK) {
      await this.ensureMockLoaded();
      const latestByEar = new Map();
      const startTs = startDate ? new Date(startDate).getTime() : null;
      const endTs = endDate ? new Date(endDate).getTime() : null;
      for (const m of this.mockData.measurements) {
        const key = this.mockData.cattle_profiles.find(c => c.id === m.cattle_profile_id)?.ear_tag_id;
        if (!key) continue;
        const mt = new Date(m.measurement_date).getTime();
        // 若提供时间范围，仅考虑范围内的测量
        if (startTs != null && mt < startTs) continue;
        if (endTs != null && mt > endTs) continue;
        const prev = latestByEar.get(key);
        if (!prev || new Date(m.measurement_date) > new Date(prev.measurement_date)) {
          latestByEar.set(key, m);
        }
      }
      let items = this.mockData.cattle_profiles
        .filter(c => (groupIds.length ? groupIds.includes(String(c.group_id)) || groupIds.includes(Number(c.group_id)) : true))
        .map(c => {
          const latest = latestByEar.get(c.ear_tag_id) || null;
          const grade = latest ? this.calculateMockGrade(Number(latest.intramuscular_fat_imf)) : null;
          return {
            ear_tag_id: c.ear_tag_id,
            group_id: c.group_id || null,
            breed: c.breed || null,
            sex: c.sex || null,
            latest: latest ? {
              measurement_date: latest.measurement_date,
              intramuscular_fat_imf: latest.intramuscular_fat_imf,
              ribeye_area: latest.ribeye_area,
              backfat_thickness: latest.backfat_thickness,
              simulated_grade: grade,
            } : null,
          };
        });
      if (grades.length) {
        items = items.filter(x => x.latest && x.latest.simulated_grade && grades.includes(String(x.latest.simulated_grade)));
      }
      if (imfMin != null) {
        items = items.filter(x => x.latest && x.latest.intramuscular_fat_imf != null && Number(x.latest.intramuscular_fat_imf) >= Number(imfMin));
      }
      if (imfMax != null) {
        items = items.filter(x => x.latest && x.latest.intramuscular_fat_imf != null && Number(x.latest.intramuscular_fat_imf) <= Number(imfMax));
      }
      const gradeRank = {
        'Standard': 1,
        'Choice (A2)': 2,
        'Choice+ (A3)': 3,
        'Prime (A4)': 4,
        'Prime+ (A5)': 5,
      };
      const dir = sortOrder === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        const la = a.latest, lb = b.latest;
        if (!la && !lb) return 0;
        if (!la) return 1;
        if (!lb) return -1;
        if (sortBy === 'imf') {
          const va = Number(la.intramuscular_fat_imf || 0);
          const vb = Number(lb.intramuscular_fat_imf || 0);
          return (va - vb) * dir;
        } else if (sortBy === 'grade') {
          const va = gradeRank[String(la.simulated_grade)] || 0;
          const vb = gradeRank[String(lb.simulated_grade)] || 0;
          return (va - vb) * dir;
        } else {
          const va = new Date(String(la.measurement_date)).getTime();
          const vb = new Date(String(lb.measurement_date)).getTime();
          return (va - vb) * dir;
        }
      });
      return items;
    }
    const params = new URLSearchParams({
      groupIds: groupIds.length ? groupIds.join(',') : '',
      grades: grades.length ? grades.join(',') : '',
      sortBy, sortOrder,
    });
    if (imfMin != null) params.set('imfMin', String(imfMin));
    if (imfMax != null) params.set('imfMax', String(imfMax));
    if (startDate) params.set('start', String(startDate));
    if (endDate) params.set('end', String(endDate));
    const res = await fetch(`${API_BASE}/reports/cattle?${params.toString()}`, { headers: this.authHeaders() });
    return res.json();
  },

  authHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  },
  authJson() {
    return { 'Content-Type': 'application/json', ...this.authHeaders() };
  },
};

window.Api = Api;
