document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectBtn = document.getElementById('selectBtn');
    const fileSection = document.getElementById('fileSection');
    const fileList = document.getElementById('fileList');
    const preview = document.getElementById('preview');
    const previewContent = document.getElementById('previewContent');
    const previewBtn = document.getElementById('previewBtn');
    const mergeBtn = document.getElementById('mergeBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const messageDiv = document.getElementById('message');
    const addSeparator = document.getElementById('addSeparator');
    const addFileName = document.getElementById('addFileName');
    const separatorText = document.getElementById('separatorText');
    const outputFileName = document.getElementById('outputFileName');

    let files = [];
    let mergedContent = '';

    // ---------- função para abrir o seletor de arquivos ----------
    function abrirFileInput() {
        fileInput.click();
    }

    // ---------- estado da drop zone ----------
    function atualizarEstadoDropZone() {
        if (files.length === 0) {
            dropZone.classList.remove('carregado');
            selectBtn.innerHTML = '<i class="fas fa-folder-open"></i> Selecionar Arquivos';
            selectBtn.style.display = 'block';
            fileSection.style.display = 'none';
            dropZone.style.pointerEvents = 'auto'; // permite clique na zona toda
        } else {
            dropZone.classList.add('carregado');
            selectBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar mais arquivos';
            selectBtn.style.display = 'block';
            fileSection.style.display = 'block';
            // Desabilita clique acidental na zona, exceto no botão
            dropZone.style.pointerEvents = 'none';
            selectBtn.style.pointerEvents = 'auto';
            // Para permitir clique apenas no botão, já que pointer-events none na zona afeta tudo,
            // mas o botão com auto fica clicável.
        }
    }

    // ---------- eventos de clique ----------
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();       // impede que o clique chegue na drop-zone
        e.preventDefault();        // evita qualquer comportamento padrão inesperado
        abrirFileInput();
    });

    dropZone.addEventListener('click', (e) => {
        // Só abre se a lista estiver vazia e o clique não foi no botão (mas o botão já parou propagação)
        if (files.length === 0) {
            abrirFileInput();
        }
    });

    // ---------- processar arquivos selecionados ----------
    fileInput.addEventListener('change', (e) => {
        const novos = Array.from(e.target.files).filter(f => f.name.endsWith('.txt') || f.name.endsWith('.sql'));
        if (novos.length > 0) {
            files = files.concat(novos);
            atualizarLista();
            atualizarEstadoDropZone();
        }
        fileInput.value = ''; // permite selecionar o mesmo arquivo novamente
    });

    // ---------- arrastar e soltar ----------
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (files.length === 0) {
            dropZone.style.borderColor = '#66bb6a';
        }
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#4CAF50';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4CAF50';
        if (files.length > 0) return; // não sobrescreve, mas pode-se permitir adicionar
        const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.txt') || f.name.endsWith('.sql'));
        files = droppedFiles;
        atualizarLista();
        atualizarEstadoDropZone();
    });

    // ---------- atualizar lista de arquivos ----------
    function atualizarLista() {
        fileList.innerHTML = '';
        files.forEach((file, idx) => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.innerHTML = `
                <span>${file.name}</span>
                <span>${formatSize(file.size)}</span>
                <span class="remove-file" data-index="${idx}">✕</span>
            `;
            fileList.appendChild(li);
        });
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                files.splice(idx, 1);
                atualizarLista();
                atualizarEstadoDropZone();
            });
        });
    }

    // ---------- leitura e ações ----------
    async function lerTodosArquivos() {
        let conteudo = '';
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const texto = await file.text();
            if (addFileName.checked && addSeparator.checked) {
                conteudo += separatorText.value.replace('{filename}', file.name) + '\n\n';
            } else if (addSeparator.checked && i > 0) {
                conteudo += '\n' + separatorText.value.replace('{filename}', '') + '\n\n';
            }
            conteudo += texto;
            if (i < files.length - 1) conteudo += '\n\n';
        }
        return conteudo;
    }

    async function gerarPreview() {
        if (files.length === 0) {
            mostraMensagem('Adicione pelo menos um arquivo.', 'erro');
            return;
        }
        const conteudo = await lerTodosArquivos();
        previewContent.textContent = conteudo;
        preview.style.display = 'block';
        mostraMensagem('Pré‑visualização atualizada.', 'sucesso');
    }

    async function juntarArquivos() {
        if (files.length === 0) {
            mostraMensagem('Nenhum arquivo para unir.', 'erro');
            return;
        }
        mergedContent = await lerTodosArquivos();
        downloadBtn.style.display = 'inline-flex';
        mostraMensagem('Arquivos unidos! Clique em "Baixar" para salvar.', 'sucesso');
    }

    function baixarArquivo() {
        if (!mergedContent) {
            mostraMensagem('Nada para baixar. Primeiro junte os arquivos.', 'erro');
            return;
        }
        const blob = new Blob([mergedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFileName.value || 'arquivo_combinado.txt';
        a.click();
        URL.revokeObjectURL(url);
        mostraMensagem('Download concluído.', 'sucesso');
    }

    function mostraMensagem(texto, tipo) {
        messageDiv.textContent = texto;
        messageDiv.className = '';
        if (tipo === 'erro') {
            messageDiv.style.background = 'rgba(255,0,0,0.2)';
            messageDiv.style.color = '#ff6b6b';
        } else {
            messageDiv.style.background = 'rgba(76,175,80,0.2)';
            messageDiv.style.color = '#4CAF50';
        }
        messageDiv.style.display = 'block';
        setTimeout(() => messageDiv.style.display = 'none', 4000);
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ---------- botões de ação ----------
    previewBtn.addEventListener('click', gerarPreview);
    mergeBtn.addEventListener('click', juntarArquivos);
    downloadBtn.addEventListener('click', baixarArquivo);

    // ---------- iniciar ----------
    atualizarEstadoDropZone();
});