(function () {
    // Caminho absoluto do arquivo de menu (ajuste se necessário)
    const menuURL = '/componentes/container-index.html';

    

    // Busca o conteúdo do menu e insere no container
    fetch(menuURL)
        .then(response => {
            if (!response.ok) throw new Error('Menu não encontrado');
            return response.text();
        })
        .then(html => {
            // Insere o HTML no container reservado
            document.getElementById('container-index').innerHTML = html;
            // Destaca o link da página atual
            destacarLinkAtivo();
        })
        .catch(error => {
            console.error('Erro ao carregar o menu:', error);
            // Fallback: você pode colocar um menu estático de emergência aqui se quiser
        });
})();