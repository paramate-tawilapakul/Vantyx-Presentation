// เมนู "หน้าทั้งหมด" ของ presentation — ทุกหน้าลิงก์ถึงกันได้โดยไม่ต้องกลับหน้าแรก
// ใช้: <link rel="stylesheet" href="shared/site-nav.css"> + <script src="shared/site-nav.js" defer>
//      แล้ววาง <div class="site-nav" data-current="<id>" data-base="../"></div> ตรงที่ต้องการปุ่ม
//      (data-base = ทางกลับไป presentation/ — หน้าในโฟลเดอร์ย่อยใส่ "../")
// เพิ่ม / ย้ายหน้า แก้ที่ GROUPS ที่เดียว (href นับจาก presentation/)
;(function () {
  const GROUPS = [
    {
      label: 'Overview',
      items: [
        { id: 'home', href: 'index.html', title: 'หน้าแรก', desc: 'ภาพรวม ความสามารถ และคู่มือ' },
        { id: 'arch', href: 'vantyx-architecture.html', title: 'สถาปัตยกรรมระบบ', desc: 'ภาพการทำงานทั้งระบบ 22 component' },
      ],
    },
    {
      label: 'Features',
      items: [
        { id: 'vna', href: 'vna_main_features.html', title: 'Vantyx VNA', desc: 'ความสามารถของคลังภาพกลาง' },
        { id: 'viewer', href: 'viewer_main_features.html', title: 'Vantyx DICOM Viewer', desc: 'ความสามารถของ Viewer' },
      ],
    },
    {
      label: 'Manuals',
      items: [
        { id: 'vna-manual', href: 'user_documentation/index.html', title: 'คู่มือการใช้งาน VNA', desc: 'ทุกหน้า ทุกเมนูของเว็บ VNA' },
        { id: 'viewer-manual', href: 'viewer_documentation/index.html', title: 'คู่มือการใช้งาน Viewer', desc: 'ทุกเครื่องมือของ Viewer' },
      ],
    },
  ]

  // @mui/icons-material Apps + ArrowDropDown — ชุดเดียวกับไอคอนในคู่มือ
  const ICON_APPS =
    '<svg class="sn-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4V4H4zm6 12h4v-4h-4zm-6 0h4v-4H4zm0-6h4v-4H4zm6 0h4v-4h-4zm6-10v4h4V4zm-6 4h4V4h-4zm6 6h4v-4h-4zm0 6h4v-4h-4z"/></svg>'
  const ICON_CARET = '<svg class="sn-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg>'

  function render(host, n) {
    const base = host.dataset.base || ''
    const current = host.dataset.current || ''
    const panelId = 'sn-panel-' + n
    let html =
      `<button type="button" class="sn-btn" aria-expanded="false" aria-controls="${panelId}" title="ไปหน้าอื่น">` +
      `${ICON_APPS}<span class="sn-label">หน้าทั้งหมด</span>${ICON_CARET}</button>` +
      `<nav class="sn-panel" id="${panelId}" aria-label="หน้าทั้งหมด" hidden>`
    for (const g of GROUPS) {
      html += `<p class="sn-group">${g.label}</p>`
      for (const p of g.items) {
        const cur = p.id === current
        html +=
          `<a class="sn-item${cur ? ' is-current' : ''}" href="${base}${p.href}"${cur ? ' aria-current="page"' : ''}>` +
          `<b>${p.title}</b><span>${p.desc}</span>${cur ? '<em>หน้านี้</em>' : ''}</a>`
      }
    }
    host.classList.add('sn')
    host.innerHTML = html + '</nav>'

    const btn = host.querySelector('.sn-btn')
    const panel = host.querySelector('.sn-panel')
    const setOpen = (open) => {
      panel.hidden = !open
      btn.setAttribute('aria-expanded', String(open))
      host.classList.toggle('is-open', open)
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      setOpen(panel.hidden)
    })
    // คลิกนอกเมนู / กด Esc = ปิด
    document.addEventListener('click', (e) => {
      if (!panel.hidden && !host.contains(e.target)) setOpen(false)
    })
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) {
        setOpen(false)
        btn.focus()
      }
    })
  }

  const init = () => document.querySelectorAll('.site-nav[data-current]').forEach(render)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
