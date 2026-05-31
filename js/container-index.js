(function () {
    const scripts = document.getElementsByTagName('script');
    let baseURL = '';
    for (let script of scripts) {
        if (script.src.includes('/js/container-index.js')) {
            baseURL = script.src.split('/js/container-index.js')[0];
            break;
        }
    }

    const menuURL = baseURL + '/componentes/container-index.html';

    fetch(menuURL)
        .then(response => {
            if (!response.ok) throw new Error('Menu não encontrado');
            return response.text();
        })
        .then(html => {
            document.getElementById('container-index').innerHTML = html;
        })
        .catch(error => {
            console.error('Erro ao carregar o menu:', error);
        });
})();