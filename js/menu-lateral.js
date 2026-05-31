(function () {
    const menuURL = '/componentes/menu-lateral.html';
    const container = document.getElementById('menu-lateral-container');

    if (!container) return; // Se não houver o container, não faz nada

    fetch(menuURL)
        .then(response => response.text())
        .then(html => {
            container.innerHTML = html;
            ativarSubmenus();
        })
        .catch(error => console.error('Erro ao carregar menu lateral:', error));

    function ativarSubmenus() {
        // Seleciona apenas os links que controlam um submenu
        const toggles = document.querySelectorAll('.has-submenu > .menu-link');

        toggles.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault(); // Evita que a página role para o topo
                const parent = this.parentElement;
                const submenu = parent.querySelector('.submenu');
                const icon = this.querySelector('.submenu-icon');

                // Fecha outros submenus abertos (opcional)
                document.querySelectorAll('.submenu.aberto').forEach(aberto => {
                    if (aberto !== submenu) {
                        aberto.classList.remove('aberto');
                        const outroIcon = aberto.parentElement.querySelector('.submenu-icon');
                        if (outroIcon) outroIcon.style.transform = 'rotate(0deg)';
                    }
                });

                // Alterna o estado do submenu atual
                submenu.classList.toggle('aberto');
                // Rotaciona o ícone
                if (submenu.classList.contains('aberto')) {
                    icon.style.transform = 'rotate(90deg)';
                } else {
                    icon.style.transform = 'rotate(0deg)';
                }
            });
        });
    }
})();