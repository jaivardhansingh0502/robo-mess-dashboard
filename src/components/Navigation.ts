// ROBOMESS - Navigation Header in TypeScript

export class Navigation {
    public nav: HTMLElement | null;
    public progressBar: HTMLElement | null;

    constructor() {
        this.nav = document.getElementById('main-nav');
        this.progressBar = document.getElementById('nav-progress-bar');
        this.initScrollSpy();
        this.initProgress();
        this.initHeartbeat();
    }

    private initScrollSpy(): void {
        const links = document.querySelectorAll('.nav-links a');
        const sections = document.querySelectorAll('section[id]');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    links.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                    });
                }
            });
        }, { threshold: 0.25 });

        sections.forEach(sec => observer.observe(sec));

        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                if (targetId && targetId.startsWith('#')) {
                    e.preventDefault();
                    const targetEl = document.querySelector(targetId);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    private initProgress(): void {
        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / (docHeight || 1)) * 100;
            if (this.progressBar) {
                this.progressBar.style.width = `${scrollPercent}%`;
            }

            if (this.nav) {
                if (scrollTop > 60) {
                    this.nav.classList.add('scrolled');
                } else {
                    this.nav.classList.remove('scrolled');
                }
            }
        });
    }

    private initHeartbeat(): void {
        const pingEl = document.getElementById('nav-ping-val');
        if (!pingEl) return;

        setInterval(() => {
            const ping = Math.round(16 + Math.random() * 8);
            pingEl.textContent = `${ping}ms`;
        }, 3000);
    }
}
