(function () {
    const menuURL = '/componentes/menu.html';

    function destacarLinkAtivo() {
        // Agora pega APENAS os links dentro do menu-container
        const container = document.getElementById('menu-container');
        if (!container) return;
        const links = container.querySelectorAll('nav ul li a');
        const path = window.location.pathname;

        links.forEach(link => {
            link.classList.remove('active');
            const linkPath = new URL(link.href, window.location.origin).pathname;

            if (linkPath === '/' && path === '/') {
                link.classList.add('active');
            } else if (linkPath !== '/' && path.startsWith(linkPath)) {
                link.classList.add('active');
            }
        });
    }

    fetch(menuURL)
        .then(response => response.text())
        .then(html => {
            document.getElementById('menu-container').innerHTML = html;
            destacarLinkAtivo();
        })
        .catch(error => console.error('Erro ao carregar o menu:', error));
})();