/* ======================================================================
   لوحة الدراسات — Vanilla JS App
   ====================================================================== */

(function () {
    'use strict';

    const API_BASE = (window.__API_BASE__ || '') + '/api';

    // ----------- DOM refs -----------
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const podium = $('#podium');
    const leaderboardBody = $('#leaderboardBody');
    const emptyState = $('#emptyState');
    const refreshBtn = $('#refreshBtn');

    const addForm = $('#addForm');
    const newName = $('#newName');
    const addMsg = $('#addMsg');
    const generatedCode = $('#generatedCode');
    const gcValue = $('#gcValue');
    const copyCodeBtn = $('#copyCodeBtn');

    const searchForm = $('#searchForm');
    const searchCode = $('#searchCode');
    const searchMsg = $('#searchMsg');
    const studentPanel = $('#studentPanel');
    const panelCode = $('#panelCode');
    const panelName = $('#panelName');
    const panelBalance = $('#panelBalance');
    const panelStars = $('#panelStars');
    const panelNegatives = $('#panelNegatives');

    const btnAddStar = $('#btnAddStar');
    const btnAddNeg = $('#btnAddNeg');
    const btnRemoveStar = $('#btnRemoveStar');
    const btnRemoveNeg = $('#btnRemoveNeg');
    const btnDelete = $('#btnDelete');

    const ovTotal = $('#ovTotal');
    const ovStars = $('#ovStars');
    const ovNeg = $('#ovNeg');

    // Student login view
    const studentLoginForm = $('#studentLoginForm');
    const studentLoginCode = $('#studentLoginCode');
    const studentLoginMsg = $('#studentLoginMsg');
    const resultCard = $('#resultCard');
    const resultCodeTxt = $('#resultCodeTxt');
    const resultName = $('#resultName');
    const resultBalance = $('#resultBalance');
    const resultStars = $('#resultStars');
    const resultNegatives = $('#resultNegatives');
    const resultRank = $('#resultRank');
    const studentLogoutBtn = $('#studentLogoutBtn');

    const toastWrap = $('#toastWrap');

    // Teacher all-students table
    const teacherAllBody = $('#teacherAllBody');
    const teacherAllEmpty = $('#teacherAllEmpty');

    // Teacher lock
    const teacherLock = $('#teacherLock');
    const teacherContent = $('#teacherContent');
    const teacherLoginForm = $('#teacherLoginForm');
    const teacherPassword = $('#teacherPassword');
    const teacherLoginMsg = $('#teacherLoginMsg');
    const teacherLogoutBtn = $('#teacherLogoutBtn');
    let teacherAuthed = false;

    let currentStudent = null;
    let studentsCache = [];

    // ----------- Helpers -----------
    function getBackendUrl() {
        if (window.__API_BASE__ && !window.__API_BASE__.includes('%REACT_APP')) {
            return window.__API_BASE__.replace(/\/$/, '');
        }
        return '';
    }

    async function api(path, opts = {}) {
        const base = getBackendUrl();
        const url = base + '/api' + path;
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opts,
        });
        if (!res.ok) {
            let msg = 'حدث خطأ';
            try {
                const body = await res.json();
                msg = body.detail || msg;
            } catch (_) {}
            throw new Error(msg);
        }
        if (res.status === 204) return null;
        return res.json();
    }

    function toast(message, type = 'success') {
        const el = document.createElement('div');
        el.className = 'toast ' + type;
        const icon = type === 'error' ? 'fa-circle-exclamation'
            : type === 'success' ? 'fa-circle-check'
            : 'fa-circle-info';
        el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
        el.setAttribute('data-testid', 'toast-' + type);
        toastWrap.appendChild(el);
        setTimeout(() => {
            el.classList.add('is-leaving');
            setTimeout(() => el.remove(), 280);
        }, 2600);
    }

    function confirmDialog(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'confirm-modal';
            modal.innerHTML = `
                <div class="confirm-overlay"></div>
                <div class="confirm-box" data-testid="confirm-box">
                    <div class="confirm-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <p class="confirm-msg">${escapeHtml(message)}</p>
                    <div class="confirm-actions">
                        <button class="primary-btn danger-btn" data-testid="confirm-yes">
                            <i class="fa-solid fa-trash"></i> نعم، احذف
                        </button>
                        <button class="ghost-btn" data-testid="confirm-no">إلغاء</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            const cleanup = (result) => {
                modal.remove();
                resolve(result);
            };
            modal.querySelector('[data-testid="confirm-yes"]').addEventListener('click', () => cleanup(true));
            modal.querySelector('[data-testid="confirm-no"]').addEventListener('click', () => cleanup(false));
            modal.querySelector('.confirm-overlay').addEventListener('click', () => cleanup(false));
        });
    }

    function setMsg(el, text, type) {
        el.textContent = text || '';
        el.className = 'form-msg' + (type ? ' ' + type : '');
    }

    // ----------- Tabs -----------
    $$('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            $$('.tab-btn').forEach((b) => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            const target = btn.getAttribute('data-tab');
            $$('.view').forEach((v) => v.classList.remove('is-active'));
            $(`.view[data-view="${target}"]`).classList.add('is-active');
            if (target === 'teacher') {
                // Show lock or content based on auth state
                teacherLock.hidden = teacherAuthed;
                teacherContent.hidden = !teacherAuthed;
                if (!teacherAuthed) {
                    setTimeout(() => teacherPassword && teacherPassword.focus(), 50);
                }
            }
        });
    });

    // ----------- Teacher login -----------
    teacherLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pw = teacherPassword.value;
        if (!pw) return;
        setMsg(teacherLoginMsg, 'جاري التحقق...', '');
        try {
            await api('/teacher/login', {
                method: 'POST',
                body: JSON.stringify({ password: pw }),
            });
            teacherAuthed = true;
            teacherLock.hidden = true;
            teacherContent.hidden = false;
            teacherPassword.value = '';
            setMsg(teacherLoginMsg, '', '');
            toast('مرحباً أستاذ! تم الدخول بنجاح', 'success');
        } catch (err) {
            teacherAuthed = false;
            setMsg(teacherLoginMsg, err.message, 'error');
        }
    });

    teacherLogoutBtn.addEventListener('click', () => {
        teacherAuthed = false;
        teacherLock.hidden = false;
        teacherContent.hidden = true;
        currentStudent = null;
        studentPanel.hidden = true;
        toast('تم تسجيل الخروج', 'success');
    });

    // ----------- Render leaderboard -----------
    function renderPodium(top3) {
        podium.innerHTML = '';
        if (!top3.length) {
            podium.innerHTML = `<div class="podium-empty" data-testid="podium-empty">
                <i class="fa-regular fa-face-smile" style="font-size:32px;display:block;margin-bottom:10px;color:var(--gold)"></i>
                ابدأ بإضافة طلاب من لوحة المعلم لرؤية أول 3 هنا.
            </div>`;
            return;
        }
        // Render in order: 2nd, 1st, 3rd for visual podium effect
        const arranged = [];
        if (top3[1]) arranged.push({ s: top3[1], rank: 2 });
        if (top3[0]) arranged.push({ s: top3[0], rank: 1 });
        if (top3[2]) arranged.push({ s: top3[2], rank: 3 });

        arranged.forEach(({ s, rank }) => {
            const balClass = s.balance < 0 ? 'negative' : '';
            const rankLabel = rank === 1 ? 'الأول' : rank === 2 ? 'الثاني' : 'الثالث';
            podium.innerHTML += `
                <article class="podium-card rank-${rank}" data-testid="podium-rank-${rank}">
                    <div class="medal">${rank}</div>
                    <h3 class="podium-name" data-testid="podium-name-${rank}">${escapeHtml(s.name)}</h3>
                    <div class="podium-balance ${balClass}" data-testid="podium-balance-${rank}">${s.balance}</div>
                    <div class="podium-balance-label">الرصيد</div>
                    <div class="podium-mini">
                        <span><i class="fa-solid fa-star"></i>${s.stars}</span>
                        <span class="neg"><i class="fa-solid fa-circle-minus"></i>${s.negatives}</span>
                    </div>
                    <button class="cert-btn" data-name="${escapeHtml(s.name)}" data-rank="${rank}" data-rank-label="${rankLabel}" data-balance="${s.balance}" data-stars="${s.stars}" data-testid="cert-btn-${rank}">
                        <i class="fa-solid fa-award"></i>
                        شهادة تقدير
                    </button>
                </article>
            `;
        });

        // Attach certificate handlers
        podium.querySelectorAll('.cert-btn').forEach((btn) => {
            btn.addEventListener('click', () => openCertificate(btn.dataset));
        });
    }

    function renderList(rest) {
        leaderboardBody.innerHTML = '';
        if (!rest.length) {
            emptyState.hidden = false;
            return;
        }
        emptyState.hidden = true;
        rest.forEach((s, i) => {
            const rank = i + 4;
            const balClass = s.balance < 0 ? 'negative' : '';
            const row = document.createElement('tr');
            row.setAttribute('data-testid', `row-${s.code}`);
            row.innerHTML = `
                <td><span class="rank-pill">${rank}</span></td>
                <td>${escapeHtml(s.name)}</td>
                <td class="stars-cell"><i class="fa-solid fa-star"></i>${s.stars}</td>
                <td class="neg-cell"><i class="fa-solid fa-circle-minus"></i>${s.negatives}</td>
                <td class="balance-cell ${balClass}" data-testid="balance-${s.code}">${s.balance}</td>
            `;
            leaderboardBody.appendChild(row);
        });
    }

    function renderOverview(students) {
        const total = students.length;
        const stars = students.reduce((a, s) => a + s.stars, 0);
        const neg = students.reduce((a, s) => a + s.negatives, 0);
        ovTotal.textContent = total;
        ovStars.textContent = stars;
        ovNeg.textContent = neg;
    }

    function renderTeacherAll(students) {
        if (!teacherAllBody) return;
        teacherAllBody.innerHTML = '';
        if (!students.length) {
            if (teacherAllEmpty) teacherAllEmpty.hidden = false;
            return;
        }
        if (teacherAllEmpty) teacherAllEmpty.hidden = true;
        students.forEach((s, i) => {
            const rank = i + 1;
            const balClass = s.balance < 0 ? 'negative' : '';
            const tr = document.createElement('tr');
            tr.setAttribute('data-testid', `teacher-row-${s.code}`);
            tr.className = 'teacher-row';
            tr.dataset.code = s.code;
            tr.innerHTML = `
                <td><span class="rank-pill">${rank}</span></td>
                <td><span class="code-chip">${escapeHtml(s.code)}</span></td>
                <td>${escapeHtml(s.name)}</td>
                <td class="stars-cell"><i class="fa-solid fa-star"></i>${s.stars}</td>
                <td class="neg-cell"><i class="fa-solid fa-circle-minus"></i>${s.negatives}</td>
                <td class="balance-cell ${balClass}">${s.balance}</td>
                <td class="row-actions">
                    <button type="button" class="row-del-btn" data-testid="row-del-${s.code}" title="حذف الطالب">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            // Click on row (except delete button) opens management
            tr.addEventListener('click', (e) => {
                if (e.target.closest('.row-del-btn')) return;
                searchCode.value = s.code;
                searchStudent(s.code);
                searchCode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            // Delete button per row
            tr.querySelector('.row-del-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(`هل أنت متأكد من حذف الطالب "${s.name}"؟`)) return;
                try {
                    await api('/students/' + encodeURIComponent(s.code), { method: 'DELETE' });
                    toast(`تم حذف الطالب ${s.name}`, 'success');
                    if (currentStudent && currentStudent.code === s.code) {
                        currentStudent = null;
                        studentPanel.hidden = true;
                        searchCode.value = '';
                    }
                    loadStudents();
                } catch (err) {
                    toast(err.message, 'error');
                }
            });
            teacherAllBody.appendChild(tr);
        });
    }

    async function loadStudents() {
        try {
            const students = await api('/students');
            studentsCache = students;
            renderPodium(students.slice(0, 3));
            renderList(students.slice(3));
            renderOverview(students);
            renderTeacherAll(students);
        } catch (e) {
            console.error(e);
            toast('فشل تحميل البيانات: ' + e.message, 'error');
        }
    }

    // ----------- Add student -----------
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = newName.value.trim();
        if (!name) return;
        setMsg(addMsg, 'جاري الإضافة...', '');
        generatedCode.hidden = true;
        try {
            const created = await api('/students', {
                method: 'POST',
                body: JSON.stringify({ name }),
            });
            setMsg(addMsg, `تمت إضافة ${name} بنجاح`, 'success');
            toast(`تمت إضافة الطالب ${name}`, 'success');
            gcValue.textContent = created.code;
            generatedCode.hidden = false;
            newName.value = '';
            newName.focus();
            loadStudents();
        } catch (err) {
            setMsg(addMsg, err.message, 'error');
            toast(err.message, 'error');
        }
    });

    copyCodeBtn.addEventListener('click', async () => {
        const code = gcValue.textContent.trim();
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            toast('تم نسخ الكود', 'success');
        } catch (_) {
            // Fallback: select text
            const range = document.createRange();
            range.selectNode(gcValue);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            toast('حدد ثم انسخ الكود يدوياً', '');
        }
    });

    // ----------- Search student -----------
    async function searchStudent(code) {
        try {
            const s = await api('/students/' + encodeURIComponent(code));
            currentStudent = s;
            showPanel(s);
            setMsg(searchMsg, '', '');
        } catch (err) {
            currentStudent = null;
            studentPanel.hidden = true;
            setMsg(searchMsg, err.message, 'error');
        }
    }

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = searchCode.value.trim();
        if (!code) return;
        await searchStudent(code);
    });

    function showPanel(s) {
        studentPanel.hidden = false;
        panelCode.textContent = s.code;
        panelName.textContent = s.name;
        panelStars.textContent = s.stars;
        panelNegatives.textContent = s.negatives;
        panelBalance.textContent = s.balance;
        panelBalance.classList.toggle('negative', s.balance < 0);
    }

    // ----------- Actions -----------
    const qtyInput = $('#qtyInput');

    // Quick qty chips
    $$('.qty-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const q = parseInt(chip.getAttribute('data-qty'), 10) || 1;
            qtyInput.value = q;
            $$('.qty-chip').forEach((c) => c.classList.remove('is-active'));
            chip.classList.add('is-active');
        });
    });
    qtyInput.addEventListener('input', () => {
        $$('.qty-chip').forEach((c) => c.classList.remove('is-active'));
    });

    function getQty() {
        const v = parseInt(qtyInput.value, 10);
        if (!v || v < 1) return 1;
        if (v > 1000) return 1000;
        return v;
    }

    async function actOnStudent(path, successMsg, useQty = false) {
        if (!currentStudent) return;
        try {
            const qs = useQty ? `?count=${getQty()}` : '';
            const s = await api(
                `/students/${encodeURIComponent(currentStudent.code)}${path}${qs}`,
                { method: 'POST' }
            );
            currentStudent = s;
            showPanel(s);
            toast(successMsg, 'success');
            loadStudents();
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    btnAddStar.addEventListener('click', () => {
        const n = getQty();
        actOnStudent('/star', `تم إضافة ${n} نجمة ⭐`, true);
    });
    btnAddNeg.addEventListener('click', () => {
        const n = getQty();
        actOnStudent('/negative', `تم تسجيل ${n} نقطة سالبة`, true);
    });
    btnRemoveStar.addEventListener('click', () => actOnStudent('/star/remove', 'تم التراجع عن نجمة'));
    btnRemoveNeg.addEventListener('click', () => actOnStudent('/negative/remove', 'تم التراجع عن نقطة سالبة'));

    btnDelete.addEventListener('click', async () => {
        if (!currentStudent) return;
        if (!confirm(`هل أنت متأكد من حذف الطالب "${currentStudent.name}"؟`)) return;
        try {
            await api('/students/' + encodeURIComponent(currentStudent.code), { method: 'DELETE' });
            toast('تم حذف الطالب', 'success');
            currentStudent = null;
            studentPanel.hidden = true;
            searchCode.value = '';
            loadStudents();
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('is-spinning');
        loadStudents().finally(() => {
            setTimeout(() => refreshBtn.classList.remove('is-spinning'), 400);
        });
    });

    // ----------- Student login (read-only view) -----------
    studentLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = studentLoginCode.value.trim();
        if (!/^\d{9}$/.test(code)) {
            setMsg(studentLoginMsg, 'الكود يجب أن يكون 9 أرقام', 'error');
            return;
        }
        setMsg(studentLoginMsg, 'جاري التحقق...', '');
        try {
            const s = await api('/students/' + encodeURIComponent(code));
            // compute rank from cached list
            const rank = computeRank(code);
            renderResult(s, rank);
            setMsg(studentLoginMsg, '', '');
        } catch (err) {
            resultCard.hidden = true;
            setMsg(studentLoginMsg, err.message, 'error');
        }
    });

    studentLogoutBtn.addEventListener('click', () => {
        resultCard.hidden = true;
        studentLoginCode.value = '';
        studentLoginCode.focus();
    });

    function computeRank(code) {
        if (!studentsCache.length) return '—';
        const idx = studentsCache.findIndex((s) => s.code === code);
        return idx >= 0 ? (idx + 1) : '—';
    }

    function renderResult(s, rank) {
        resultCard.hidden = false;
        resultCodeTxt.textContent = s.code;
        resultName.textContent = s.name;
        resultBalance.textContent = s.balance;
        resultBalance.classList.toggle('negative', s.balance < 0);
        resultStars.textContent = s.stars;
        resultNegatives.textContent = s.negatives;
        resultRank.textContent = rank;
    }

    // ----------- Certificate modal -----------
    function openCertificate(data) {
        const { name, rank, rankLabel, balance, stars } = data;
        const today = new Date().toLocaleDateString('ar-EG', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const modal = document.createElement('div');
        modal.className = 'cert-modal';
        modal.setAttribute('data-testid', 'cert-modal');
        modal.innerHTML = `
            <div class="cert-overlay"></div>
            <div class="cert-sheet rank-${rank}" data-testid="cert-sheet">
                <div class="cert-corner tl"></div>
                <div class="cert-corner tr"></div>
                <div class="cert-corner bl"></div>
                <div class="cert-corner br"></div>

                <div class="cert-header">
                    <div class="cert-seal">
                        <i class="fa-solid fa-award"></i>
                    </div>
                    <div class="cert-eyebrow">مادة الدراسات الاجتماعية</div>
                    <h1 class="cert-title">شهادة تقدير</h1>
                    <div class="cert-divider"><span></span><i class="fa-solid fa-star"></i><span></span></div>
                </div>

                <div class="cert-body">
                    <p class="cert-line">تُمنح هذه الشهادة بكل فخر واعتزاز إلى</p>
                    <h2 class="cert-name" data-testid="cert-name">${escapeHtml(name)}</h2>
                    <p class="cert-line">لحصوله على <strong>المركز ${escapeHtml(rankLabel)}</strong></p>
                    <p class="cert-line">في لوحة الشرف الشهرية برصيد قدره</p>
                    <div class="cert-score">
                        <span class="cert-score-num">${escapeHtml(balance)}</span>
                        <span class="cert-score-unit">نقطة</span>
                        <span class="cert-score-stars"><i class="fa-solid fa-star"></i> ${escapeHtml(stars)} نجمة</span>
                    </div>
                    <p class="cert-line cert-note">مع أطيب التمنيات بدوام التفوق والتميّز</p>
                </div>

                <div class="cert-footer">
                    <div class="cert-sign">
                        <div class="cert-sign-line"></div>
                        <span>المعلم</span>
                    </div>
                    <div class="cert-date">
                        <i class="fa-regular fa-calendar"></i>
                        ${today}
                    </div>
                    <div class="cert-sign">
                        <div class="cert-sign-line"></div>
                        <span>مدير المادة</span>
                    </div>
                </div>
            </div>

            <div class="cert-actions no-print">
                <button class="primary-btn" id="certPrintBtn" data-testid="cert-print-btn">
                    <i class="fa-solid fa-print"></i>
                    طباعة / حفظ PDF
                </button>
                <button class="ghost-btn" id="certCloseBtn" data-testid="cert-close-btn">
                    <i class="fa-solid fa-xmark"></i>
                    إغلاق
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        document.body.classList.add('cert-open');

        modal.querySelector('#certCloseBtn').addEventListener('click', closeCert);
        modal.querySelector('.cert-overlay').addEventListener('click', closeCert);
        modal.querySelector('#certPrintBtn').addEventListener('click', () => window.print());

        function closeCert() {
            document.body.classList.remove('cert-open');
            modal.remove();
        }
    }

    // ----------- Boot -----------
    loadStudents();
})();
