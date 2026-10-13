(() => {
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => [...el.querySelectorAll(s)];
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- dynamic facts ---------- */
    const now = new Date();
    $$('[data-years]').forEach(el => (el.textContent = now.getFullYear() - 2016));
    $$('[data-year]').forEach(el => (el.textContent = now.getFullYear()));

    const tick = () => {
        const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        $$('[data-clock]').forEach(el => (el.textContent = t));
    };
    tick();
    setInterval(tick, 15000);

    /* ---------- nav state ---------- */
    const nav = $('.nav');
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 20);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- pointer effects ---------- */
    if (canHover && !reduceMotion) {
        const root = document.documentElement;
        const phone = $('#phone');
        let raf = 0;
        addEventListener('pointermove', e => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                root.style.setProperty('--mx', e.clientX + 'px');
                root.style.setProperty('--my', e.clientY + 'px');
                const r = phone.getBoundingClientRect();
                if (r.bottom > 0 && r.top < innerHeight) {
                    const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
                    const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
                    phone.style.setProperty('--ry', (dx * 26 - 6).toFixed(2) + 'deg');
                    phone.style.setProperty('--rx', (-dy * 18 + 2).toFixed(2) + 'deg');
                }
            });
        }, { passive: true });

        $$('.app').forEach(card => {
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--x', e.clientX - r.left + 'px');
                card.style.setProperty('--y', e.clientY - r.top + 'px');
            });
        });
    }

    $$('.app-icon').forEach((el, i) => el.style.setProperty('--i', i));

    /* ---------- scroll reveal ---------- */
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            el.classList.add('in');
            el.addEventListener('transitionend', function done(e) {
                if (e.target !== el || e.propertyName !== 'opacity') return;
                el.classList.remove('reveal');
                el.style.removeProperty('--d');
                el.removeEventListener('transitionend', done);
            });
            io.unobserve(el);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    $$('.reveal').forEach(el => {
        const siblings = $$(':scope > .reveal', el.parentElement);
        el.style.setProperty('--d', Math.min(siblings.indexOf(el), 6) * 0.08 + 's');
        io.observe(el);
    });

    /* ---------- toast ---------- */
    const toastEl = $('.toast');
    let toastTimer;
    const toast = msg => {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3600);
    };

    /* ---------- app launch sheet ---------- */
    const sheet = $('#sheet');
    const sheetInner = $('.sheet__inner', sheet);
    let source = null;
    let animating = false;

    const fill = card => {
        sheet.style.setProperty('--g1', card.style.getPropertyValue('--g1'));
        sheet.style.setProperty('--g2', card.style.getPropertyValue('--g2'));
        $('.sheet__icon', sheet).style.cssText = card.getAttribute('style');
        $('.sheet__icon use', sheet).setAttribute('href', '#' + card.dataset.icon);
        $('#sheet-title').textContent = $('h3', card).textContent.trim();
        $('.sheet__org', sheet).textContent = $('.app__org', card).textContent;
        $('.sheet__tags', sheet).innerHTML = $('.app__tags', card).innerHTML;
        $('.sheet__body', sheet).innerHTML =
            `<p>${$('.app__pitch', card).innerHTML}</p>` + $('.app__more', card).innerHTML;
        sheetInner.scrollTop = 0;
    };

    const launchFrames = from => {
        const to = sheet.getBoundingClientRect();
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        return [
            { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`, borderRadius: '120px', opacity: 0.4 },
            { transform: 'none', borderRadius: getComputedStyle(sheet).borderRadius, opacity: 1 },
        ];
    };

    const openApp = (id, trigger) => {
        const card = document.getElementById(id);
        if (!card || animating) return;
        fill(card);
        source = trigger ? ($('.app-icon__tile', trigger) || trigger) : $('.app__icon', card);
        sheet.showModal();
        history.replaceState(null, '', '#' + id);
        if (reduceMotion) return;
        animating = true;
        sheet.animate(launchFrames(source.getBoundingClientRect()), { duration: 520, easing: 'cubic-bezier(.2,.9,.2,1)' })
            .finished.finally(() => (animating = false));
        sheetInner.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 180, fill: 'backwards' });
    };

    const closeApp = () => {
        if (!sheet.open || animating) return;
        const done = () => {
            sheet.close();
            history.replaceState(null, '', location.pathname + location.search);
        };
        const r = source && source.isConnected ? source.getBoundingClientRect() : null;
        if (reduceMotion || !r || r.bottom < 0 || r.top > innerHeight) return done();
        animating = true;
        sheetInner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
        sheet.animate(launchFrames(r).reverse(), { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' })
            .finished.then(() => {
                done();
                sheet.getAnimations().forEach(a => a.cancel());
                sheetInner.getAnimations().forEach(a => a.cancel());
            })
            .finally(() => (animating = false));
    };

    document.addEventListener('click', e => {
        const opener = e.target.closest('[data-open]');
        if (opener) {
            e.preventDefault();
            openApp(opener.dataset.open, opener);
        }
    });
    sheet.addEventListener('click', e => {
        if (e.target === sheet || e.target.closest('[data-close]')) closeApp();
    });
    sheet.addEventListener('cancel', e => {
        e.preventDefault();
        closeApp();
    });

    if (/^#app-/.test(location.hash) && document.getElementById(location.hash.slice(1))) {
        setTimeout(() => openApp(location.hash.slice(1)), 450);
    }

    /* ---------- semantic_zoom mini demo (inside the sheet) ---------- */
    const setLevel = (sz, level) => {
        const text = $('.sz__text', sz);
        const max = 2;
        level = Math.max(0, Math.min(max, level));
        if (String(level) === sz.dataset.level) return;
        sz.dataset.level = level;
        $$('[data-level]', sz).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.level === level)));
        if (reduceMotion) return void (text.textContent = text.dataset['l' + level]);
        text.classList.add('swap');
        setTimeout(() => {
            text.textContent = text.dataset['l' + level];
            text.classList.remove('swap');
        }, 180);
    };
    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-sz] [data-level]');
        if (btn) setLevel(btn.closest('[data-sz]'), +btn.dataset.level);
    });
    let pinch = 0;
    sheet.addEventListener('wheel', e => {
        const sz = e.target.closest('[data-sz]');
        if (!sz || !e.ctrlKey) return; // trackpad pinch arrives as ctrl+wheel
        e.preventDefault();
        pinch -= e.deltaY;
        if (Math.abs(pinch) < 24) return;
        setLevel(sz, (+sz.dataset.level || 0) + Math.sign(pinch));
        pinch = 0;
    }, { passive: false });
    let touchStart = 0;
    sheet.addEventListener('touchstart', e => {
        if (e.touches.length === 2 && e.target.closest('[data-sz]')) {
            touchStart = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        }
    }, { passive: true });
    sheet.addEventListener('touchmove', e => {
        const sz = e.target.closest('[data-sz]');
        if (!sz || e.touches.length !== 2 || !touchStart) return;
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (Math.abs(d - touchStart) > 40) {
            setLevel(sz, (+sz.dataset.level || 0) + Math.sign(d - touchStart));
            touchStart = d;
        }
    }, { passive: false });

    /* ---------- offline mode (manual or real) ---------- */
    const airplane = $('#airplane');
    const onlineLabel = $('[data-online]');
    const setOffline = (off, msg) => {
        document.body.classList.toggle('offline', off);
        airplane.setAttribute('aria-checked', String(off));
        onlineLabel.textContent = off ? 'Offline · working' : 'Online';
        if (msg) toast(msg);
    };
    airplane.addEventListener('click', () => {
        const off = !document.body.classList.contains('offline');
        setOffline(off, off
            ? 'You\'re offline. Nothing broke — that\'s the whole idea.'
            : 'Back online. Syncing… done ✓');
    });
    addEventListener('offline', () => setOffline(true, 'Your connection dropped — this page still works. Like my apps.'));
    addEventListener('online', () => setOffline(false, 'Connection restored. Synced ✓'));

    /* ---------- stack tabs ---------- */
    const tabs = $$('[role="tab"]');
    const selectTab = tab => {
        tabs.forEach(t => {
            const on = t === tab;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
            document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
        tab.focus();
    };
    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            selectTab(tabs[next]);
        });
    });

    /* ---------- copy email / print ---------- */
    $$('[data-copy]').forEach(btn => {
        const label = $('[data-copy-label]', btn);
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(btn.dataset.copy);
                label.textContent = 'Copied to clipboard ✓';
                label.classList.add('ok');
                setTimeout(() => {
                    label.textContent = 'Click to copy';
                    label.classList.remove('ok');
                }, 2400);
            } catch {
                location.href = 'mailto:' + btn.dataset.copy;
            }
        });
    });
    $$('[data-print]').forEach(btn => btn.addEventListener('click', () => print()));

    /* ---------- hello, fellow developer ---------- */
    console.log(
        '%c RD %c Hey, you opened DevTools — my kind of person.\n%cNo frameworks, no trackers. Flutter folks: pub.dev/packages/semantic_zoom · Say hi: roshendilandz@gmail.com',
        'background:#d4ff3a;color:#0a0b0f;font-weight:700;padding:2px 6px;border-radius:4px',
        'font-weight:600',
        'color:#8b8f9c'
    );
})();
