(function () {
    const scripts = document.getElementsByTagName('script');
    let baseURL = '';
    for (let script of scripts) {
        if (script.src.includes('/js/menu.js')) {
            baseURL = script.src.split('/js/menu.js')[0];
            break;
        }
    }

    const menuURL = baseURL + '/componentes/menu.html';

    function destacarLinkAtivo() {
        const container = document.getElementById('menu-container');
        if (!container) return;
        const links = container.querySelectorAll('nav ul li a');
        const path = window.location.pathname;

        links.forEach(link => {
            link.classList.remove('active');
            const linkPath = new URL(link.href, window.location.origin).pathname;
            
            const isHome = linkPath === new URL(baseURL + '/', window.location.origin).pathname;

            if (isHome && path === linkPath) {
                link.classList.add('active');
            } else if (!isHome && path.startsWith(linkPath)) {
                link.classList.add('active');
            }
        });
    }

    fetch(menuURL)
        .then(response => {
            if (!response.ok) throw new Error('Menu não encontrado');
            return response.text();
        })
        .then(html => {
            let fixedHtml = html.replace(/href="\//g, 'href="' + baseURL + '/');
            document.getElementById('menu-container').innerHTML = fixedHtml;
            destacarLinkAtivo();
        })
        .catch(error => console.error('Erro ao carregar o menu:', error));
})();