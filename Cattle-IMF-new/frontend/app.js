// 简易 SPA 路由和页面渲染

const app = document.getElementById('app');
const userInfo = document.getElementById('user-info');

// 从 localStorage 恢复登录状态（防止页面刷新后丢失 token）
(function restoreSession() {
  const t = localStorage.getItem('imf_token');
  const u = localStorage.getItem('imf_user');
  if (t) { Api.token = t; }
  if (u) { try { Api.me = JSON.parse(u); } catch(e) {} }
})();

function setUserInfo() {
  if (Api.me) {
    userInfo.innerHTML = `<span class="pill">${Api.me.role}</span> <span class="muted">${Api.me.username}</span>`;
  } else {
    userInfo.innerHTML = `<span class="muted">未登录</span>`;
  }
}

async function renderLogin() {
  app.innerHTML = `
    <div class="card">
      <h2>用户登录</h2>
      <div class="row">
        <div class="col">
          <label>用户名</label>
          <input id="login-username" placeholder="admin 或 operator" />
        </div>
        <div class="col">
          <label>密码</label>
          <input id="login-password" type="password" placeholder="任意（Mock模式）" />
        </div>
      </div>
      <div style="margin-top: 12px;">
        <button id="login-btn">登录</button>
      </div>
      <p class="muted" style="margin-top:8px;">Mock 模式下任意密码均可登录</p>
      <p class="success" id="login-msg"></p>
    </div>
  `;
  document.getElementById('login-btn').onclick = async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    try {
      await Api.login(username, password);
      localStorage.setItem('imf_token', Api.token);
      localStorage.setItem('imf_user', JSON.stringify(Api.me));
      setUserInfo();
      location.hash = '#/cattle';
    } catch (e) {
      document.getElementById('login-msg').innerText = '登录失败：' + (e.message || '');
    }
  };
}

async function renderCattleList() {
  // 兼容无查询参数的情况，避免 new URL('') 抛错
  const hash = location.hash || '';
  const qs = hash.includes('?') ? hash.split('?')[1] : '';
  const search = new URLSearchParams(qs).get('search') || '';
  const { items, total } = await Api.getCattleList({ page: 1, pageSize: 100, search });
  app.innerHTML = `
    <div class="card">
      <h2>牛群档案 (${total})</h2>
      <div class="row">
        <div class="col"><input id="search" placeholder="按耳标号/品种搜索" value="${search}" /></div>
        <div><button id="search-btn" class="secondary">搜索</button></div>
      </div>
      <div style="margin-top:12px;">
        <table>
          <thead><tr><th>耳标号</th><th>品种</th><th>性别</th><th>分组</th><th>出生日期</th><th>操作</th></tr></thead>
          <tbody>
            ${items.map(c => `
              <tr>
                <td>${c.ear_tag_id}</td>
                <td>${c.breed||'-'}</td>
                <td>${c.sex||'-'}</td>
                <td>${c.group_id||'-'}</td>
                <td>${c.birth_date||'-'}</td>
                <td><button onclick="location.hash='#/cattle/${c.ear_tag_id}'">查看</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h3>新增牛只</h3>
      <div class="row">
        <div class="col"><label>耳标号</label><input id="new-ear" /></div>
        <div class="col"><label>品种</label><input id="new-breed" /></div>
        <div class="col"><label>性别</label><select id="new-sex"><option value="male">male</option><option value="female">female</option></select></div>
        <div class="col"><label>分组ID</label><input id="new-group" type="number" /></div>
      </div>
      <div class="row" style="margin-top:8px;">
        <div class="col"><label>出生日期</label><input id="new-birth" type="date" /></div>
        <div class="col"><label>父系耳标</label><input id="new-sire" /></div>
        <div class="col"><label>母系耳标</label><input id="new-dam" /></div>
      </div>
      <div style="margin-top:12px;"><button id="new-submit">保存</button> <span id="new-msg" class="success"></span></div>
    </div>
  `;
  document.getElementById('search-btn').onclick = () => {
    const s = document.getElementById('search').value.trim();
    location.hash = `#/cattle?search=${encodeURIComponent(s)}`;
  };
  document.getElementById('new-submit').onclick = async () => {
    const payload = {
      ear_tag_id: document.getElementById('new-ear').value.trim(),
      breed: document.getElementById('new-breed').value.trim(),
      sex: document.getElementById('new-sex').value,
      group_id: Number(document.getElementById('new-group').value || null),
      birth_date: document.getElementById('new-birth').value || null,
      sire_ear_tag_id: document.getElementById('new-sire').value || null,
      dam_ear_tag_id: document.getElementById('new-dam').value || null,
    };
    try {
      await Api.createCattle(payload);
      document.getElementById('new-msg').innerText = '保存成功';
      renderCattleList();
    } catch (e) {
      document.getElementById('new-msg').innerText = '保存失败：' + e.message;
    }
  };
}

async function renderCattleDetail(earTagId) {
  const cattle = await Api.getCattleByEarTag(earTagId);
  const ms = await Api.getMeasurementsForEarTag(earTagId);
  app.innerHTML = `
    <div class="card">
      <h2>个体档案：${earTagId}</h2>
      <p class="muted">品种：${cattle?.breed||'-'}；性别：${cattle?.sex||'-'}；分组：${cattle?.group_id||'-'}</p>
    </div>
    <div class="card">
      <h3>最新测量</h3>
      ${ms.length ? `
        <p>时间：${ms[ms.length-1].measurement_date}；IMF：${ms[ms.length-1].intramuscular_fat_imf||'-'}%；评级：<span class="pill">${ms[ms.length-1].simulated_grade||'-'}</span></p>
      ` : '<p class="muted">暂无测量记录</p>'}
    </div>
    <div class="card">
      <h3>测量历史</h3>
      <table>
        <thead><tr><th>时间</th><th>背膘(mm)</th><th>眼肌面积(cm²)</th><th>IMF(%)</th><th>评级</th></tr></thead>
        <tbody>
          ${ms.map(m => `<tr><td>${m.measurement_date}</td><td>${m.backfat_thickness||'-'}</td><td>${m.ribeye_area||'-'}</td><td>${m.intramuscular_fat_imf||'-'}</td><td>${m.simulated_grade||'-'}</td></tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:12px;">
        <canvas id="chart"></canvas>
      </div>
    </div>
  `;
  const points = ms.map(m => ({ x: m.measurement_date, y: m.intramuscular_fat_imf||0 }));
  const canvas = document.getElementById('chart');
  if (canvas && points.length) {
    drawLineChart(canvas, points, { title: 'IMF 历次变化 (%)' });
  }
}

async function renderMeasurementEntry() {
  app.innerHTML = `
    <div class="card">
      <h2>超声波测量数据录入</h2>
      <div class="row">
        <div class="col"><label>耳标号</label><input id="m-ear" /></div>
        <div class="col"><label>测量日期</label><input id="m-date" type="datetime-local" /></div>
        <div class="col"><label>备注</label><input id="m-notes" /></div>
      </div>
      <div class="row" style="margin-top:8px;">
        <div class="col"><label>背膘(mm)</label><input id="m-backfat" type="number" step="0.01" /></div>
        <div class="col"><label>眼肌面积(cm²)</label><input id="m-area" type="number" step="0.01" /></div>
        <div class="col"><label>IMF(%)</label><input id="m-imf" type="number" step="0.01" /></div>
      </div>
      <div class="row" style="margin-top:8px;">
        <div class="col"><label>眼肌高度(cm)</label><input id="m-height" type="number" step="0.01" /></div>
        <div class="col"><label>眼肌宽度(cm)</label><input id="m-width" type="number" step="0.01" /></div>
        <div class="col"><label>操作员</label><input id="m-operator" disabled placeholder="自动填充当前用户" /></div>
      </div>
      <div style="margin-top:12px;">
        <button id="m-submit">保存</button> <span id="m-msg" class="success"></span>
      </div>
    </div>
  `;
  document.getElementById('m-operator').value = Api.me?.username || 'mock-operator';
  document.getElementById('m-submit').onclick = async () => {
    const payload = {
      ear_tag_id: document.getElementById('m-ear').value.trim(),
      measurement_date: document.getElementById('m-date').value || new Date().toISOString(),
      backfat_thickness: document.getElementById('m-backfat').value,
      ribeye_area: document.getElementById('m-area').value,
      intramuscular_fat_imf: document.getElementById('m-imf').value,
      ribeye_height: document.getElementById('m-height').value,
      ribeye_width: document.getElementById('m-width').value,
      notes: document.getElementById('m-notes').value,
    };
    try {
      const rec = await Api.createMeasurement(payload);
      document.getElementById('m-msg').innerText = `保存成功，模拟评级：${rec.simulated_grade}`;
    } catch (e) {
      document.getElementById('m-msg').innerText = '保存失败：' + e.message;
    }
  };
}

async function renderGroupReports(filters = {}) {
  const {
    groupIds = [], grades = [], imfMin = null, imfMax = null,
    sortBy = 'date', sortOrder = 'desc',
    startDate = '', endDate = '',
  } = filters;
  // 根据筛选条件获取分组报表与个体评估
  const [groups, cattle] = await Promise.all([
    Api.getGroupReports(groupIds || []),
    Api.getCattleAssessments({ groupIds, grades, imfMin, imfMax, sortBy, sortOrder, startDate, endDate }),
  ]);
  const safeGroups = Array.isArray(groups) ? groups : [];
  const safeCattle = Array.isArray(cattle) ? cattle : [];
  app.innerHTML = `
    <div class="card">
      <h2>群体对比报表</h2>
      <table>
        <thead><tr><th>分组</th><th>平均 IMF(%)</th><th>平均眼肌面积(cm²)</th><th>平均背膘(mm)</th></tr></thead>
        <tbody>
          ${safeGroups.map(g => `<tr><td>${g.group_name}</td><td>${g.avg_imf}</td><td>${g.avg_ribeye_area}</td><td>${g.avg_backfat}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="card">
      <h2>牛只单体肉质评估（最新测量）</h2>
      <div class="row" style="margin-bottom:8px;">
        <div class="col">
          <label>分组IDs</label>
          <input id="f-group" placeholder="如 1,2" value="${(groupIds||[]).join(',')}" />
        </div>
        <div class="col">
          <label>评级</label>
          <select id="f-grade">
            ${['','Standard','Choice (A2)','Choice+ (A3)','Prime (A4)','Prime+ (A5)'].map(opt => `<option value="${opt}" ${ (grades&&grades[0]===opt) ? 'selected' : '' }>${opt||'全部'}</option>`).join('')}
          </select>
        </div>
        <div class="col">
          <label>IMF 最小(%)</label>
          <input id="f-imf-min" type="number" step="0.1" value="${imfMin ?? ''}" />
        </div>
        <div class="col">
          <label>IMF 最大(%)</label>
          <input id="f-imf-max" type="number" step="0.1" value="${imfMax ?? ''}" />
        </div>
        <div class="col">
          <label>开始时间</label>
          <input id="f-start" type="datetime-local" value="${startDate}" />
        </div>
        <div class="col">
          <label>结束时间</label>
          <input id="f-end" type="datetime-local" value="${endDate}" />
        </div>
        <div class="col">
          <label>排序</label>
          <select id="f-sort-by">
            ${['date','imf','grade'].map(opt => `<option value="${opt}" ${sortBy===opt?'selected':''}>${opt}</option>`).join('')}
          </select>
          <select id="f-sort-order">
            ${['desc','asc'].map(opt => `<option value="${opt}" ${sortOrder===opt?'selected':''}>${opt}</option>`).join('')}
          </select>
        </div>
        <div style="align-self:flex-end;">
          <button id="f-apply" class="secondary">应用筛选</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>耳标号</th><th>分组</th><th>品种</th><th>性别</th>
            <th>时间</th><th>IMF(%)</th><th>眼肌面积(cm²)</th><th>背膘(mm)</th><th>评级</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${safeCattle.map(x => {
            const l = x.latest;
            return `<tr>
              <td><a href="#/cattle/${x.ear_tag_id}">${x.ear_tag_id}</a></td>
              <td>${x.group_id||'-'}</td>
              <td>${x.breed||'-'}</td>
              <td>${x.sex||'-'}</td>
              <td>${l?.measurement_date||'-'}</td>
              <td>${l?.intramuscular_fat_imf??'-'}</td>
              <td>${l?.ribeye_area??'-'}</td>
              <td>${l?.backfat_thickness??'-'}</td>
              <td>${l?.simulated_grade ? `<span class="pill">${l.simulated_grade}</span>` : '-'}</td>
              <td><button onclick="location.hash='#/cattle/${x.ear_tag_id}'">查看趋势</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // 绑定筛选按钮
  const applyBtn = document.getElementById('f-apply');
  if (applyBtn) {
    applyBtn.onclick = async () => {
      const groupStr = document.getElementById('f-group').value.trim();
      const groupIdsNew = groupStr ? groupStr.split(',').map(s=>s.trim()).filter(Boolean) : [];
      const gradeVal = document.getElementById('f-grade').value;
      const gradesNew = gradeVal ? [gradeVal] : [];
      const imfMinVal = document.getElementById('f-imf-min').value;
      const imfMaxVal = document.getElementById('f-imf-max').value;
      const startVal = document.getElementById('f-start').value;
      const endVal = document.getElementById('f-end').value;
      const sortByNew = document.getElementById('f-sort-by').value;
      const sortOrderNew = document.getElementById('f-sort-order').value;
      const nextFilters = {
        groupIds: groupIdsNew,
        grades: gradesNew,
        imfMin: imfMinVal !== '' ? Number(imfMinVal) : null,
        imfMax: imfMaxVal !== '' ? Number(imfMaxVal) : null,
        startDate: startVal || '',
        endDate: endVal || '',
        sortBy: sortByNew,
        sortOrder: sortOrderNew,
      };
      renderGroupReports(nextFilters);
    };
  }
}

async function router() {
  setUserInfo();
  const h = location.hash || '#/login';
  // 当使用真实后端且未登录时，保护受限路由并跳转到登录
  try {
    if (typeof USE_MOCK !== 'undefined' && !USE_MOCK && !Api.token) {
      const needAuth = ['#/cattle', '#/measure', '#/reports'];
      if (needAuth.some(p => h.startsWith(p))) {
        location.hash = '#/login';
        return renderLogin();
      }
    }
  } catch (e) {
    // 忽略环境变量未定义等异常，保持原有行为
  }
  if (h.startsWith('#/login')) return renderLogin();
  if (h.startsWith('#/cattle/')) {
    const ear = h.replace('#/cattle/','');
    return renderCattleDetail(ear);
  }
  if (h.startsWith('#/cattle')) return renderCattleList();
  if (h.startsWith('#/measure')) return renderMeasurementEntry();
  if (h.startsWith('#/reports')) return renderGroupReports();
  return renderLogin();
}

window.addEventListener('hashchange', router);
router();
