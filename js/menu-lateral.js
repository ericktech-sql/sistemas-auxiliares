(function () {
    const scripts = document.getElementsByTagName('script');
    let baseURL = '';
    for (let script of scripts) {
        if (script.src.includes('/js/menu-lateral.js')) {
            baseURL = script.src.split('/js/menu-lateral.js')[0];
            break;
        }
    }

    const menuURL = baseURL + '/componentes/menu-lateral.html';
    const container = document.getElementById('menu-lateral-container');

    if (!container) return; 

    fetch(menuURL)
        .then(response => response.text())
        .then(html => {
            let fixedHtml = html.replace(/href="\//g, 'href="' + baseURL + '/');
            container.innerHTML = fixedHtml;
            ativarSubmenus();
            configurarToggle();
        })
        .catch(error => console.error('Erro ao carregar menu lateral:', error));

    function ativarSubmenus() {
        const toggles = document.querySelectorAll('.has-submenu > .menu-link');

        toggles.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault(); 
                const parent = this.parentElement;
                const submenu = parent.querySelector('.submenu');
                const icon = this.querySelector('.submenu-icon');

                document.querySelectorAll('.submenu.aberto').forEach(aberto => {
                    if (aberto !== submenu) {
                        aberto.classList.remove('aberto');
                        const outroIcon = aberto.parentElement.querySelector('.submenu-icon');
                        if (outroIcon) outroIcon.style.transform = 'rotate(0deg)';
                    }
                });

                submenu.classList.toggle('aberto');
                if (submenu.classList.contains('aberto')) {
                    icon.style.transform = 'rotate(90deg)';
                } else {
                    icon.style.transform = 'rotate(0deg)';
                }
            });
        });
    }

    function configurarToggle() {
        const menu = document.getElementById('menu-lateral');
        const toggleBtn = document.getElementById('toggle-menu');
        
        if (!menu || !toggleBtn) return;

        // Inicia recolhido por padrão em todas as páginas
        menu.classList.add('collapsed');

        toggleBtn.addEventListener('click', () => {
            menu.classList.toggle('collapsed');
        });
    }
})();