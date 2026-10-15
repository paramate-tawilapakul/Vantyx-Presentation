// Vantyx Viewer — คู่มือการใช้งาน: hash routing ทีละหน้า, สารบัญย่อยใน sidebar, ค้นหา (สูงสุด 5 รายการ), lightbox
;(function () {
  'use strict'

  const pages = Array.from(document.querySelectorAll('section.page'))
  const navLinks = Array.from(document.querySelectorAll('.sidebar a.nav'))
  const order = navLinks.map((a) => a.getAttribute('href').slice(1))
  const pageById = new Map(pages.map((p) => [p.id, p]))
  const baseTitle = document.title

  // ---------- เลขรูป + pager ----------
  pages.forEach((page) => {
    const link = navLinks.find((a) => a.getAttribute('href') === '#' + page.id)
    const no = link ? link.querySelector('.n')?.textContent.trim() : ''
    page.querySelectorAll('figcaption').forEach((cap, i) => {
      cap.dataset.n = (no ? no + '.' : '') + (i + 1)
    })
    const idx = order.indexOf(page.id)
    if (idx === -1) return
    const pager = document.createElement('nav')
    pager.className = 'pager'
    const prev = order[idx - 1] && pageById.get(order[idx - 1])
    const next = order[idx + 1] && pageById.get(order[idx + 1])
    if (prev) pager.append(pagerLink(prev, 'prev', '← ก่อนหน้า'))
    if (next) pager.append(pagerLink(next, 'next', 'ถัดไป →'))
    page.append(pager)
  })
  function pagerLink(page, cls, label) {
    const a = document.createElement('a')
    a.href = '#' + page.id
    a.className = cls
    a.innerHTML = '<small>' + label + '</small>' + escapeHtml(page.querySelector('h1').textContent)
    return a
  }

  // ---------- routing ----------
  let currentPage = null
  function route() {
    const hash = decodeURIComponent(location.hash.slice(1))
    let target = hash ? document.getElementById(hash) : null
    let page = target ? target.closest('section.page') : null
    if (!page) {
      page = pages[0]
      target = null
    }
    if (page !== currentPage) {
      pages.forEach((p) => p.classList.toggle('show', p === page))
      currentPage = page
      buildToc(page)
      document.title = page.querySelector('h1').textContent + ' · ' + baseTitle
    }
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + page.id))
    document.body.classList.remove('nav-open')
    if (target && target !== page) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'start' })
        target.classList.remove('flash')
        void target.offsetWidth
        target.classList.add('flash')
      })
    } else {
      window.scrollTo(0, 0)
    }
    const activeNav = document.querySelector('.sidebar a.nav.active')
    if (activeNav) activeNav.scrollIntoView({ block: 'nearest' })
  }
  window.addEventListener('hashchange', route)

  // ---------- สารบัญย่อยของหน้าปัจจุบัน ----------
  let tocHeads = []
  function buildToc(page) {
    document.querySelectorAll('.sidebar .toc').forEach((t) => t.remove())
    const link = navLinks.find((a) => a.getAttribute('href') === '#' + page.id)
    tocHeads = Array.from(page.querySelectorAll('h2[id]'))
    if (!link || !tocHeads.length) return
    const toc = document.createElement('div')
    toc.className = 'toc'
    tocHeads.forEach((h) => {
      const a = document.createElement('a')
      a.href = '#' + h.id
      a.textContent = h.textContent
      toc.append(a)
    })
    link.after(toc)
  }
  function spy() {
    if (!tocHeads.length) return
    let cur = null
    for (const h of tocHeads) {
      if (h.getBoundingClientRect().top < 140) cur = h
      else break
    }
    document.querySelectorAll('.toc a').forEach((a) => a.classList.toggle('on', cur && a.getAttribute('href') === '#' + cur.id))
  }
  window.addEventListener('scroll', spy, { passive: true })

  // ---------- sidebar บนจอเล็ก ----------
  document.querySelector('.menu-btn').addEventListener('click', () => document.body.classList.toggle('nav-open'))
  document.querySelector('.scrim').addEventListener('click', () => document.body.classList.remove('nav-open'))

  // ---------- ค้นหา ----------
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const index = []
  pages.forEach((page) => {
    const pageTitle = page.querySelector('h1').textContent.trim()
    const lead = page.querySelector('.lead')
    const crumb = page.querySelector('.crumb')
    index.push({ id: page.id, title: pageTitle, path: crumb ? crumb.textContent.trim() : '', text: lead ? lead.textContent : '', level: 1 })
    const heads = Array.from(page.querySelectorAll('h2[id], h3[id]'))
    heads.forEach((h) => {
      const lvl = h.tagName === 'H2' ? 2 : 3
      let text = ''
      let el = h.nextElementSibling
      while (el && !(el.matches('h2') || (lvl === 3 && el.matches('h3')))) {
        if (!el.matches('nav.pager')) text += ' ' + el.textContent
        el = el.nextElementSibling
      }
      const parent = lvl === 3 ? findPrevH2(h) : null
      index.push({
        id: h.id,
        title: h.textContent.trim(),
        path: pageTitle + (parent ? ' › ' + parent.textContent.trim() : ''),
        text: text.replace(/\s+/g, ' ').trim(),
        level: lvl,
      })
    })
  })
  index.forEach((e) => {
    e.nTitle = norm(e.title)
    e.nText = norm(e.text)
    e.nPath = norm(e.path)
  })
  function findPrevH2(h) {
    let el = h.previousElementSibling
    while (el && !el.matches('h2')) el = el.previousElementSibling
    return el
  }

  function search(q) {
    const nq = norm(q)
    if (!nq) return []
    const tokens = nq.split(' ').filter(Boolean)
    const out = []
    for (const e of index) {
      const hay = e.nTitle + ' ' + e.nPath + ' ' + e.nText
      if (!tokens.every((t) => hay.includes(t))) continue
      let score = 0
      if (e.nTitle === nq) score += 60
      if (e.nTitle.includes(nq)) score += 30
      if (e.nTitle.startsWith(tokens[0])) score += 6
      tokens.forEach((t) => {
        if (e.nTitle.includes(t)) score += 12
        if (e.nPath.includes(t)) score += 3
        score += Math.min(count(e.nText, t), 6)
      })
      score += e.level === 1 ? 4 : e.level === 2 ? 2 : 0
      out.push({ e, score })
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 5)
  }
  function count(s, t) {
    let n = 0
    let i = s.indexOf(t)
    while (i !== -1 && n < 10) {
      n++
      i = s.indexOf(t, i + t.length)
    }
    return n
  }
  function snippet(e, tokens) {
    const src = e.text || ''
    const low = src.toLowerCase()
    let at = -1
    for (const t of tokens) {
      at = low.indexOf(t)
      if (at !== -1) break
    }
    if (at === -1) return src.slice(0, 120)
    const start = Math.max(0, at - 45)
    return (start > 0 ? '…' : '') + src.slice(start, at + 90) + '…'
  }
  function highlight(s, tokens) {
    let html = escapeHtml(s)
    tokens
      .slice()
      .sort((a, b) => b.length - a.length)
      .forEach((t) => {
        const re = new RegExp('(' + escapeHtml(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi')
        html = html.replace(re, '<mark>$1</mark>')
      })
    return html
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  }

  const input = document.getElementById('q')
  const box = document.getElementById('suggest')
  let results = []
  let sel = 0
  function render() {
    const q = input.value
    if (!q.trim()) {
      box.classList.remove('open')
      return
    }
    results = search(q)
    const tokens = norm(q).split(' ').filter(Boolean)
    sel = 0
    box.innerHTML = results.length
      ? results
          .map(
            ({ e }, i) =>
              '<a href="#' + e.id + '" data-i="' + i + '"' + (i === 0 ? ' class="active"' : '') + '>' +
              '<div class="s-path">' + escapeHtml(e.path) + '</div>' +
              '<div class="s-title">' + highlight(e.title, tokens) + '</div>' +
              '<div class="s-snip">' + highlight(snippet(e, tokens), tokens) + '</div></a>',
          )
          .join('')
      : '<div class="empty">ไม่พบหัวข้อที่ตรงกับ “' + escapeHtml(q) + '” — ลองคำอื่น เช่น MPR, SUV, ปุ่มลัด, key image</div>'
    box.classList.add('open')
  }
  function go(i) {
    const r = results[i]
    if (!r) return
    box.classList.remove('open')
    input.blur()
    if (location.hash === '#' + r.e.id) route()
    else location.hash = r.e.id
  }
  input.addEventListener('input', render)
  input.addEventListener('focus', render)
  input.addEventListener('keydown', (ev) => {
    const items = box.querySelectorAll('a')
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      if (!items.length) return
      ev.preventDefault()
      sel = (sel + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items.forEach((a, i) => a.classList.toggle('active', i === sel))
    } else if (ev.key === 'Enter') {
      ev.preventDefault()
      go(sel)
    } else if (ev.key === 'Escape') {
      box.classList.remove('open')
      input.blur()
    }
  })
  box.addEventListener('mousedown', (ev) => {
    const a = ev.target.closest('a[data-i]')
    if (!a) return
    ev.preventDefault()
    go(Number(a.dataset.i))
  })
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('.search')) box.classList.remove('open')
  })
  document.addEventListener('keydown', (ev) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)
    if ((ev.key === '/' && !typing) || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k')) {
      ev.preventDefault()
      input.focus()
      input.select()
    } else if (ev.key === 'Escape') {
      closeLightbox()
    }
  })

  // ---------- dark / light mode (ไอคอน + title เหมือนปุ่มบนหน้าเว็บ: โหมดมืดแสดง LightMode) ----------
  const themeBtn = document.querySelector('.theme-btn')
  // คีย์เดียวกับคู่มือ VNA — เลือกธีมที่หน้าไหนก็มีผลทั้ง 2 คู่มือ
  const themeKey = 'vantyx-doc-theme'
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t)
    const label = t === 'dark' ? 'Switch to Light' : 'Switch to Dark'
    themeBtn.title = label
    themeBtn.setAttribute('aria-label', label)
    themeBtn.querySelector('use').setAttribute('href', t === 'dark' ? '#m-light-mode' : '#m-dark-mode')
  }
  applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    try {
      localStorage.setItem(themeKey, next)
    } catch (e) {}
  })
  // คู่มืออีกหน้า (VNA/Viewer) เปลี่ยนธีมในแท็บอื่น → ตามทันทีโดยไม่ต้องโหลดใหม่ (คีย์ localStorage เดียวกัน)
  window.addEventListener('storage', (e) => {
    if (e.key === themeKey && (e.newValue === 'light' || e.newValue === 'dark')) applyTheme(e.newValue)
  })
  // ยังไม่เคยเลือกเอง = ตามธีมของระบบปฏิบัติการเมื่อเปลี่ยน
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (e) => {
      let saved = null
      try {
        saved = localStorage.getItem(themeKey)
      } catch (err) {}
      if (saved !== 'light' && saved !== 'dark') applyTheme(e.matches ? 'light' : 'dark')
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange)
  }

  // ---------- lightbox ----------
  const lb = document.querySelector('.lightbox')
  const lbImg = lb.querySelector('img')
  const lbCap = lb.querySelector('p')
  document.addEventListener('click', (ev) => {
    const img = ev.target.closest('figure img')
    if (!img) return
    lbImg.src = img.src
    lbImg.alt = img.alt
    const cap = img.closest('figure').querySelector('figcaption')
    lbCap.textContent = cap ? 'รูปที่ ' + cap.dataset.n + ' · ' + cap.textContent : ''
    lb.classList.add('open')
  })
  lb.addEventListener('click', closeLightbox)
  function closeLightbox() {
    lb.classList.remove('open')
  }

  route()
})()
