document.addEventListener('DOMContentLoaded', () => {
    const baseInput = document.getElementById('baseCode');
    const rowsInput = document.getElementById('rowCount');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const output = document.getElementById('output');

    function calcDV(codigo) {
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
        }
        return (10 - (soma % 10)) % 10;
    }

    generateBtn.addEventListener('click', () => {
        const base = baseInput.value.trim();
        const rows = parseInt(rowsInput.value);
        output.textContent = '';

        if (base.length !== 12 || isNaN(base)) {
            alert('O código base deve ter 12 dígitos numéricos!');
            return;
        }
        if (isNaN(rows) || rows < 1 || rows > 10000000) {
            alert('Número de linhas inválido (1 - 10.000.000)');
            return;
        }

        let result = '';
        for (let i = 1; i <= rows; i++) {
            const seq = String(i).padStart(4, '0');
            const codigoCompleto = base.slice(0, 8) + seq;
            const dv = calcDV(codigoCompleto);
            const ean13 = codigoCompleto + dv;
            result += ean13 + '\n';
        }
        output.textContent = result;
    });

    copyBtn.addEventListener('click', () => {
        if (!output.textContent.trim()) {
            alert('Nada para copiar.');
            return;
        }
        navigator.clipboard.writeText(output.textContent)
            .then(() => alert('Códigos copiados!'))
            .catch(() => alert('Falha ao copiar.'));
    });
});