document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const processBtn = document.getElementById('processBtn');
    const resultContainer = document.getElementById('resultContainer');
    const initialMessage = document.getElementById('initialMessage');
    const resultsBody = document.getElementById('resultsBody');
    const exportBtn = document.getElementById('exportBtn');
    const totalDuplicates = document.getElementById('totalDuplicates');
    const uniqueDuplicates = document.getElementById('uniqueDuplicates');
    const totalRows = document.getElementById('totalRows');

    let workbookData = null;
    let duplicates = [];

    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = '#66bb6a';
    });
    dropArea.addEventListener('dragleave', () => {
        dropArea.style.borderColor = '#4CAF50';
    });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = '#4CAF50';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFile(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            alert('Selecione um arquivo Excel (.xlsx ou .xls)');
            return;
        }
        fileName.textContent = file.name;
        fileSize.textContent = formatSize(file.size);
        fileInfo.style.display = 'block';
        processBtn.disabled = false;
        workbookData = file;
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    processBtn.addEventListener('click', () => {
        if (!workbookData) return;
        processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        processBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                analyzeDuplicates(jsonData);
                processBtn.innerHTML = '<i class="fas fa-cogs"></i> Processar Arquivo';
                processBtn.disabled = false;
            } catch (error) {
                alert('Erro: ' + error.message);
                processBtn.innerHTML = '<i class="fas fa-cogs"></i> Processar Arquivo';
                processBtn.disabled = false;
            }
        };
        reader.readAsArrayBuffer(workbookData);
    });

    function analyzeDuplicates(data) {
        duplicates = [];
        const seen = new Map();
        const duplicateGroups = new Map();

        data.forEach((row, index) => {
            const produtoid = row.ProdutoId || row.produtoid;
            if (!produtoid) return;
            const coluna = row.Coluna || row.COLUNA || '';
            const linha = row.Linha || row.LINHA || '';
            const key = `${coluna}-${linha}-${produtoid}`;

            if (seen.has(key)) {
                duplicates.push({ coluna, linha, produtoid, rowIndex: index + 2 });
                if (duplicateGroups.has(key)) {
                    duplicateGroups.get(key).count++;
                } else {
                    duplicates.push(seen.get(key));
                    duplicateGroups.set(key, { coluna, linha, produtoid, count: 2 });
                }
            } else {
                seen.set(key, { coluna, linha, produtoid, rowIndex: index + 2 });
            }
        });

        displayResults(duplicateGroups);
    }

    function displayResults(groups) {
        if (groups.size === 0) {
            resultsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px;">Nenhuma duplicata encontrada</td></tr>`;
            totalDuplicates.textContent = '0';
            uniqueDuplicates.textContent = '0';
            totalRows.textContent = '0';
        } else {
            let html = '';
            let count = 0;
            const sorted = [...groups.values()].sort((a, b) => String(a.produtoid).localeCompare(String(b.produtoid)));
            sorted.forEach((group, idx) => {
                count++;
                html += `<tr>
                    <td>${idx + 1}</td>
                    <td>${group.coluna}</td>
                    <td>${group.linha}</td>
                    <td>${group.produtoid}</td>
                    <td>${group.count} ocorrências</td>
                </tr>`;
            });
            resultsBody.innerHTML = html;
            totalDuplicates.textContent = duplicates.length;
            uniqueDuplicates.textContent = groups.size;
            totalRows.textContent = 'Concluído';
        }
        initialMessage.style.display = 'none';
        resultContainer.style.display = 'block';
    }

    exportBtn.addEventListener('click', () => {
        if (duplicates.length === 0) {
            alert('Nada para exportar.');
            return;
        }
        const wsData = duplicates.map(d => ({
            COLUNA: d.coluna,
            LINHA: d.linha,
            'Produto ID': d.produtoid,
            'Linha Original': d.rowIndex
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Duplicatas');
        XLSX.writeFile(wb, 'duplicatas_encontradas.xlsx');
    });
});