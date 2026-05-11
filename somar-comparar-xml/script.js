// Sistema de Análise de XMLs - Versão 2.6
// Correção da comparação de valores

// ==================== VARIÁVEIS GLOBAIS ====================
let arquivosNFe = [];
let arquivoXLS = null;
let chavesReferencia = new Map(); // Agora armazena objeto com nNF e valor
let detalhesPorData = {};
let notasPorSerie = new Map();
let todasNotasPorSerie = new Map();
let notasCanceladas = [];
let notasProtocolo = [];
let processando = false;
let dadosProcessados = false;
let relatorioCarregado = false;

const formatador = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

// Elementos do DOM
const elementos = {
    statusBar: document.getElementById('status-text'),
    statusIndicator: document.getElementById('status-indicator'),
    xmlCount: document.getElementById('xml-count'),
    xmlTotal: document.getElementById('xml-total'),
    totalGeral: document.getElementById('total-geral'),
    totalNotas: document.getElementById('total-notas'),
    periodo: document.getElementById('periodo'),
    diasAnalisados: document.getElementById('dias-analisados'),
    seriesCount: document.getElementById('series-count'),
    canceladasCount: document.getElementById('canceladas-count'),
    protocolosCount: document.getElementById('protocolos-count'),
    totalPorData: document.getElementById('total-por-data'),
    analiseSequencia: document.getElementById('analise-sequencia'),
    detalhesData: document.getElementById('detalhes-data'),
    resultadoComparacao: document.getElementById('resultado-comparacao'),
    xlsStatus: document.getElementById('xls-status'),
    btnComparar: document.getElementById('btn-comparar') // Novo botão
};

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function () {
    inicializarSistema();
});

function inicializarSistema() {
    // Configurar upload de XMLs
    configurarUploadXML();

    // Configurar upload de XLS
    configurarUploadXLS();

    // Configurar tabs
    configurarTabs();

    // Configurar botões de ação
    configurarBotoes();

    // Atualizar status
    atualizarStatus('Pronto para importar arquivos', 'success');
}

function configurarUploadXML() {
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZoneXml');

    fileInput.addEventListener('change', async function (e) {
        if (processando) {
            alert('Aguarde o processamento atual terminar.');
            return;
        }

        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            processando = true;
            atualizarStatus('Processando arquivos...', 'processing');

            // Processar arquivos (pode ser ZIP ou XMLs individuais)
            arquivosNFe = await processarArquivosUpload(files);

            if (arquivosNFe.length > 0) {
                elementos.xmlCount.textContent = `${arquivosNFe.length} arquivos`;
                await processarXMLs();
            } else {
                atualizarStatus('Nenhum arquivo XML encontrado', 'error');
            }
        } catch (error) {
            console.error('Erro ao processar upload:', error);
            atualizarStatus(`Erro: ${error.message}`, 'error');
        } finally {
            processando = false;
        }
    });

    // Configurar drag and drop
    configurarDragDrop('dropZoneXml', 'fileInput');
}

async function processarArquivosUpload(files) {
    let todosArquivos = [];

    for (const file of files) {
        const nomeArquivo = file.name.toLowerCase();

        if (nomeArquivo.endsWith('.zip')) {
            // Extrair arquivos do ZIP
            atualizarStatus(`Extraindo arquivos do ZIP: ${file.name}`, 'processing');
            const arquivosZip = await extrairArquivosDoZip(file, 'xml');
            todosArquivos = todosArquivos.concat(arquivosZip);
        } else if (nomeArquivo.endsWith('.xml')) {
            // Adicionar arquivo XML diretamente
            todosArquivos.push(file);
        } else {
            console.log(`Arquivo ignorado: ${file.name} - Tipo não suportado`);
        }
    }

    // Filtrar apenas arquivos XML
    return todosArquivos.filter(arquivo =>
        arquivo.name.toLowerCase().endsWith('.xml')
    );
}

async function extrairArquivosDoZip(arquivoZip, tipo = 'xml') {
    try {
        const zip = await JSZip.loadAsync(arquivoZip);
        const arquivos = [];

        // Contar arquivos do tipo especificado no ZIP
        let fileCount = 0;
        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                const nome = zipEntry.name.toLowerCase();
                if (tipo === 'xml' && nome.endsWith('.xml')) {
                    fileCount++;
                } else if (tipo === 'excel' && (nome.endsWith('.xls') || nome.endsWith('.xlsx'))) {
                    fileCount++;
                }
            }
        });

        if (fileCount === 0) {
            throw new Error(`Nenhum arquivo ${tipo.toUpperCase()} encontrado no ZIP`);
        }

        atualizarStatus(`Encontrados ${fileCount} arquivos no ZIP`, 'processing');

        // Extrair cada arquivo
        let extraidos = 0;
        for (const relativePath in zip.files) {
            const zipEntry = zip.files[relativePath];

            if (!zipEntry.dir) {
                const nome = zipEntry.name.toLowerCase();
                let deveExtrair = false;

                if (tipo === 'xml' && nome.endsWith('.xml')) {
                    deveExtrair = true;
                } else if (tipo === 'excel' && (nome.endsWith('.xls') || nome.endsWith('.xlsx'))) {
                    deveExtrair = true;
                }

                if (deveExtrair) {
                    try {
                        const blob = await zipEntry.async('blob');
                        const file = new File([blob], zipEntry.name, {
                            type: blob.type,
                            lastModified: Date.now()
                        });

                        arquivos.push(file);
                        extraidos++;

                        // Atualizar progresso
                        if (fileCount > 10) {
                            const percentual = Math.round((extraidos / fileCount) * 100);
                            elementos.statusBar.textContent = `Extraindo ZIP: ${percentual}%`;
                        }
                    } catch (error) {
                        console.error(`Erro ao extrair ${zipEntry.name}:`, error);
                    }
                }
            }
        }

        return arquivos;
    } catch (error) {
        console.error('Erro ao processar ZIP:', error);
        throw new Error(`Erro no arquivo ZIP: ${error.message}`);
    }
}

function configurarUploadXLS() {
    const fileInput = document.getElementById('fileInputChaves');
    const dropZone = document.getElementById('dropZoneXls');

    fileInput.addEventListener('change', async function (e) {
        if (processando) {
            alert('Aguarde o processamento atual terminar.');
            return;
        }

        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            processando = true;
            atualizarStatus('Processando relatório...', 'processing');

            let arquivosExcel = [];

            for (const file of files) {
                const nomeArquivo = file.name.toLowerCase();

                if (nomeArquivo.endsWith('.zip')) {
                    // Extrair arquivos Excel do ZIP
                    atualizarStatus(`Extraindo relatório do ZIP: ${file.name}`, 'processing');
                    const arquivosZip = await extrairArquivosDoZip(file, 'excel');
                    arquivosExcel = arquivosExcel.concat(arquivosZip);
                } else if (nomeArquivo.endsWith('.xls') || nomeArquivo.endsWith('.xlsx')) {
                    // Adicionar arquivo Excel diretamente
                    arquivosExcel.push(file);
                }
            }

            if (arquivosExcel.length > 0) {
                arquivoXLS = arquivosExcel[0]; // Usar o primeiro arquivo Excel encontrado
                elementos.xlsStatus.textContent = `Arquivo carregado: ${arquivoXLS.name}`;

                // Processar o relatório imediatamente
                await processarArquivoXLS();
                relatorioCarregado = true;

                // Se já temos dados de XML processados, executar a comparação
                if (dadosProcessados) {
                    await executarComparacao();
                } else {
                    atualizarStatus('Relatório carregado com sucesso! Aguardando XMLs...', 'success');
                }
            } else {
                atualizarStatus('Nenhum arquivo XLS/XLSX encontrado', 'error');
            }
        } catch (error) {
            console.error('Erro ao processar relatório:', error);
            atualizarStatus(`Erro: ${error.message}`, 'error');
            elementos.xlsStatus.textContent = 'Erro ao carregar relatório';
        } finally {
            processando = false;
        }
    });

    // Configurar drag and drop
    configurarDragDrop('dropZoneXls', 'fileInputChaves');
}

function configurarDragDrop(dropZoneId, inputId) {
    const dropZone = document.getElementById(dropZoneId);

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#45a049';
        dropZone.style.transform = 'scale(1.02)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#4CAF50';
        dropZone.style.transform = 'scale(1)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4CAF50';
        dropZone.style.transform = 'scale(1)';

        const files = e.dataTransfer.files;
        document.getElementById(inputId).files = files;

        // Disparar evento change manualmente
        const event = new Event('change');
        document.getElementById(inputId).dispatchEvent(event);
    });
}

function configurarTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover classe active de todos os botões
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // Adicionar classe active ao botão clicado
            button.classList.add('active');

            // Esconder todos os painéis
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });

            // Mostrar o painel correspondente
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');

            // Se for a aba de comparação e temos ambos os dados, mostrar comparação
            if (tabId === 'comparar' && dadosProcessados && relatorioCarregado) {
                // Já temos os dados processados, só precisamos exibir
                mostrarResultadosComparacaoAtual();
            } else if (tabId === 'comparar') {
                // Mostrar mensagem do que está faltando
                mostrarStatusComparacao();
            }
        });
    });
}

function configurarBotoes() {
    // Botão reiniciar
    document.getElementById('btn-reiniciar').addEventListener('click', reiniciarSistema);

    // Botão exportar
    document.getElementById('btn-exportar').addEventListener('click', exportarRelatorio);

    // Botão expandir todos
    document.getElementById('btn-expandir-todos').addEventListener('click', expandirTodosDias);

    // Botão mostrar cancelados
    document.getElementById('btn-mostrar-cancelados').addEventListener('click', mostrarCancelados);

    // Botão mostrar protocolos
    document.getElementById('btn-mostrar-protocolos').addEventListener('click', mostrarProtocolos);

    // Botão comparar manualmente
    document.getElementById('btn-comparar-manual').addEventListener('click', async function () {
        if (!dadosProcessados) {
            alert('Por favor, importe os XMLs primeiro.');
            return;
        }

        if (!relatorioCarregado) {
            alert('Por favor, importe um relatório XLS/XLSX primeiro.');
            return;
        }

        await executarComparacao();
    });
}

// ==================== PROCESSAMENTO DE XMLs ====================
async function processarXMLs() {
    try {
        processando = true;
        dadosProcessados = false;

        atualizarStatus('Processando XMLs...', 'processing');

        // Limpar dados anteriores
        detalhesPorData = {};
        notasPorSerie.clear();
        todasNotasPorSerie.clear();
        notasCanceladas = [];
        notasProtocolo = [];

        let totalGeral = 0;
        let totalNotas = 0;
        let notasValidas = 0;
        let datas = [];

        // Mostrar loading
        elementos.totalPorData.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Processando ${arquivosNFe.length} arquivos...</p>
            </div>
        `;

        // Processar cada XML
        for (let i = 0; i < arquivosNFe.length; i++) {
            const file = arquivosNFe[i];
            const resultado = await processarArquivoXML(file);

            // Classificar o tipo de arquivo
            const nomeArquivo = file.name.toLowerCase();

            // Armazenar todas as numerações por série (para análise de sequência)
            if (resultado.serie && resultado.nNF) {
                if (!todasNotasPorSerie.has(resultado.serie)) {
                    todasNotasPorSerie.set(resultado.serie, new Set());
                }
                todasNotasPorSerie.get(resultado.serie).add(resultado.nNF);
            }

            if (nomeArquivo.includes('-proceventonfe')) {
                // Protocolo de Cancelamento
                notasProtocolo.push(resultado);
            } else if (nomeArquivo.includes('canc')) {
                // Nota Cancelada
                notasCanceladas.push(resultado);
            } else {
                // Nota Normal (Autorizada)
                if (resultado.valor > 0) {
                    totalGeral += resultado.valor;
                    notasValidas++;

                    // Organizar por data
                    if (!detalhesPorData[resultado.data]) {
                        detalhesPorData[resultado.data] = {
                            total: 0,
                            documentos: []
                        };
                        datas.push(resultado.data);
                    }

                    detalhesPorData[resultado.data].total += resultado.valor;
                    detalhesPorData[resultado.data].documentos.push(resultado);

                    // Organizar por série (apenas autorizadas para análise de valores)
                    if (resultado.serie) {
                        if (!notasPorSerie.has(resultado.serie)) {
                            notasPorSerie.set(resultado.serie, []);
                        }
                        notasPorSerie.get(resultado.serie).push(resultado.nNF);
                    }
                }
            }

            totalNotas++;

            // Atualizar progresso
            const progresso = Math.round((i + 1) / arquivosNFe.length * 100);
            elementos.statusBar.textContent = `Processando XMLs: ${progresso}%`;

            // Atualizar estatísticas do upload
            elementos.xmlTotal.textContent = formatador.format(totalGeral);
        }

        // Ordenar datas
        datas.sort();

        // Atualizar dashboard
        atualizarDashboard(totalGeral, notasValidas, datas);

        // Atualizar tabela de totais por data
        atualizarTotaisPorData(datas);

        // Atualizar análise de sequência
        atualizarAnaliseSequencia();

        // Atualizar status
        elementos.xmlTotal.textContent = formatador.format(totalGeral);
        dadosProcessados = true;

        // Se já temos relatório carregado, executar comparação
        if (relatorioCarregado) {
            await executarComparacao();
        }

        atualizarStatus('XMLs processados com sucesso!', 'success');

    } catch (error) {
        console.error('Erro no processamento:', error);
        atualizarStatus('Erro ao processar XMLs', 'error');

        elementos.totalPorData.innerHTML = `
            <div class="error">
                <p>Erro ao processar arquivos: ${error.message}</p>
            </div>
        `;
    } finally {
        processando = false;
    }
}

async function processarArquivoXML(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            let resultado = {
                chNFe: 'N/A',
                nNF: 0,
                serie: '',
                data: '',
                valor: 0,
                tipo: 'autorizada',
                nomeArquivo: file.name,
                dataProcessamento: new Date().toISOString()
            };

            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

                // Verificar tipo pelo nome do arquivo
                const nomeArquivo = file.name.toLowerCase();
                if (nomeArquivo.includes('-proceventonfe')) {
                    resultado.tipo = 'protocolo';
                } else if (nomeArquivo.includes('canc')) {
                    resultado.tipo = 'cancelada';
                }

                // Extrair dados básicos
                resultado.chNFe = xmlDoc.querySelector('chNFe')?.textContent?.trim() ||
                    xmlDoc.querySelector('chNFe')?.textContent?.trim() || 'N/A';
                resultado.nNF = parseInt(xmlDoc.querySelector('nNF')?.textContent) || 0;
                resultado.serie = xmlDoc.querySelector('serie')?.textContent?.trim() || '';

                // Extrair valor e data apenas se for nota autorizada
                if (resultado.tipo === 'autorizada') {
                    const vNF = xmlDoc.querySelector('vNF');
                    resultado.valor = vNF?.textContent ? parseFloat(vNF.textContent) : 0;

                    const dhEmi = xmlDoc.querySelector('dhEmi');
                    const dataCompleta = dhEmi?.textContent || '';
                    resultado.data = dataCompleta.split('T')[0];
                } else {
                    // Para cancelados e protocolos, tentar extrair a data do evento
                    const dhEvento = xmlDoc.querySelector('dhEvento');
                    if (dhEvento) {
                        const dataCompleta = dhEvento.textContent || '';
                        resultado.data = dataCompleta.split('T')[0];
                    }
                }

                // Para cancelados, tentar extrair o valor original se disponível
                if (resultado.tipo === 'cancelada' || resultado.tipo === 'protocolo') {
                    const vNF = xmlDoc.querySelector('vNF');
                    if (vNF) {
                        resultado.valor = parseFloat(vNF.textContent) || 0;
                    }
                }

            } catch (error) {
                console.error(`Erro no arquivo ${file.name}:`, error);
            }

            resolve(resultado);
        };

        reader.readAsText(file);
    });
}

// ==================== ATUALIZAÇÃO DO DASHBOARD ====================
function atualizarDashboard(totalGeral, notasValidas, datas) {
    // Atualizar cards
    elementos.totalGeral.textContent = formatador.format(totalGeral);
    elementos.totalNotas.textContent = `${notasValidas} notas`;

    if (datas.length > 0) {
        const primeiraData = formatarData(datas[0]);
        const ultimaData = formatarData(datas[datas.length - 1]);
        elementos.periodo.textContent = `${primeiraData} a ${ultimaData}`;
        elementos.diasAnalisados.textContent = `${datas.length} dias`;
    } else {
        elementos.periodo.textContent = '-';
        elementos.diasAnalisados.textContent = '0 dias';
    }

    elementos.seriesCount.textContent = notasPorSerie.size;
    elementos.canceladasCount.textContent = notasCanceladas.length;
    elementos.protocolosCount.textContent = notasProtocolo.length;
}

function atualizarTotaisPorData(datas) {
    if (datas.length === 0) {
        elementos.totalPorData.innerHTML = `
            <div class="no-data">
                <p>Nenhum dado para exibir</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Total</th>
                    <th>Notas</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    datas.forEach(data => {
        const detalhes = detalhesPorData[data];
        html += `
            <tr>
                <td>${formatarData(data)}</td>
                <td class="valor-cell">${formatador.format(detalhes.total)}</td>
                <td class="notas-cell">
                    <span class="badge">${detalhes.documentos.length}</span>
                </td>
                <td>
                    <button class="btn-secondary btn-sm" onclick="mostrarDetalhesData('${data}')">
                        <i class="fas fa-search"></i> Detalhes
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    elementos.totalPorData.innerHTML = html;
}

// ==================== ANÁLISE DE SEQUÊNCIA ====================
function atualizarAnaliseSequencia() {
    if (todasNotasPorSerie.size === 0) {
        elementos.analiseSequencia.innerHTML = `
            <div class="no-data">
                <p>Nenhuma série encontrada para análise</p>
            </div>
        `;
        return;
    }

    let html = '';
    const seriesOrdenadas = Array.from(todasNotasPorSerie.keys()).sort();

    seriesOrdenadas.forEach(serie => {
        const numerosSet = todasNotasPorSerie.get(serie);
        const numeros = Array.from(numerosSet).map(n => parseInt(n)).sort((a, b) => a - b);

        if (numeros.length === 0) return;

        const primeiro = numeros[0];
        const ultimo = numeros[numeros.length - 1];

        // Criar array com todos os números esperados no intervalo
        const todosNumeros = Array.from(
            { length: ultimo - primeiro + 1 },
            (_, i) => primeiro + i
        );

        // Encontrar números faltantes
        const numerosFaltantes = todosNumeros.filter(num => !numeros.includes(num));

        html += `
            <div class="serie-container">
                <div class="serie-header">
                    <h3>Série ${serie}</h3>
                    <span class="badge">${numeros.length} notas encontradas</span>
                </div>
                
                <div class="serie-info">
                    <div class="info-item">
                        <span class="info-label">Menor número:</span>
                        <span class="info-value">${primeiro}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Maior número:</span>
                        <span class="info-value">${ultimo}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Intervalo:</span>
                        <span class="info-value">${ultimo - primeiro + 1}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Números ausentes:</span>
                        <span class="info-value">${numerosFaltantes.length}</span>
                    </div>
                </div>
                
                ${numerosFaltantes.length > 0 ? `
                    <div class="faltantes-container">
                        <h4>Números que não existem em nenhum XML (${numerosFaltantes.length}):</h4>
                        <div class="numeros-lista">
                            ${formatarNumerosFaltantes(numerosFaltantes)}
                        </div>
                    </div>
                ` : `
                    <div class="completa">
                        <i class="fas fa-check-circle"></i> Todos os números do intervalo existem em algum XML
                    </div>
                `}
            </div>
        `;
    });

    elementos.analiseSequencia.innerHTML = html;
}

// ==================== FUNÇÕES DE EXIBIÇÃO ====================
function mostrarDetalhesData(data) {
    const detalhes = detalhesPorData[data];
    const documentos = detalhes.documentos.sort((a, b) => a.nNF - b.nNF);

    let html = `
        <div class="detalhes-data-container">
            <div class="detalhes-header">
                <h2>${formatarData(data)} - ${formatador.format(detalhes.total)}</h2>
                <button class="btn-secondary" onclick="ocultarDetalhesData()">
                    <i class="fas fa-times"></i> Fechar
                </button>
            </div>
            
            <table class="detalhes-table">
                <thead>
                    <tr>
                        <th>Série</th>
                        <th>Número</th>
                        <th>Chave</th>
                        <th>Valor</th>
                        <th>Arquivo</th>
                    </tr>
                </thead>
                <tbody>
    `;

    documentos.forEach(doc => {
        html += `
            <tr>
                <td>${doc.serie || 'N/A'}</td>
                <td>${doc.nNF}</td>
                <td class="chave">${formatarChave(doc.chNFe)}</td>
                <td class="valor-cell">${formatador.format(doc.valor)}</td>
                <td>${doc.nomeArquivo}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    elementos.detalhesData.innerHTML = html;
    elementos.detalhesData.scrollIntoView({ behavior: 'smooth' });
}

function mostrarCancelados() {
    if (notasCanceladas.length === 0) {
        alert('Nenhuma nota cancelada encontrada.');
        return;
    }

    let html = `
        <div class="detalhes-data-container">
            <div class="detalhes-header">
                <h2>Notas Canceladas - ${notasCanceladas.length} arquivos</h2>
                <button class="btn-secondary" onclick="ocultarDetalhesData()">
                    <i class="fas fa-times"></i> Fechar
                </button>
            </div>
            
            <table class="detalhes-table">
                <thead>
                    <tr>
                        <th>Arquivo</th>
                        <th>Chave</th>
                        <th>Número</th>
                        <th>Série</th>
                        <th>Valor Original</th>
                    </tr>
                </thead>
                <tbody>
    `;

    notasCanceladas.forEach(doc => {
        html += `
            <tr>
                <td>${doc.nomeArquivo}</td>
                <td class="chave">${formatarChave(doc.chNFe)}</td>
                <td>${doc.nNF}</td>
                <td>${doc.serie || 'N/A'}</td>
                <td class="valor-cell">${formatador.format(doc.valor)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    elementos.detalhesData.innerHTML = html;
    elementos.detalhesData.scrollIntoView({ behavior: 'smooth' });
}

function mostrarProtocolos() {
    if (notasProtocolo.length === 0) {
        alert('Nenhum protocolo de cancelamento encontrado.');
        return;
    }

    let html = `
        <div class="detalhes-data-container">
            <div class="detalhes-header">
                <h2>Protocolos de Cancelamento - ${notasProtocolo.length} arquivos</h2>
                <button class="btn-secondary" onclick="ocultarDetalhesData()">
                    <i class="fas fa-times"></i> Fechar
                </button>
            </div>
            
            <table class="detalhes-table">
                <thead>
                    <tr>
                        <th>Arquivo</th>
                        <th>Chave</th>
                        <th>Número</th>
                        <th>Série</th>
                        <th>Data Evento</th>
                    </tr>
                </thead>
                <tbody>
    `;

    notasProtocolo.forEach(doc => {
        html += `
            <tr>
                <td>${doc.nomeArquivo}</td>
                <td class="chave">${formatarChave(doc.chNFe)}</td>
                <td>${doc.nNF}</td>
                <td>${doc.serie || 'N/A'}</td>
                <td>${doc.data ? formatarData(doc.data) : 'N/A'}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    elementos.detalhesData.innerHTML = html;
    elementos.detalhesData.scrollIntoView({ behavior: 'smooth' });
}

function ocultarDetalhesData() {
    elementos.detalhesData.innerHTML = '';
}

function expandirTodosDias() {
    const datas = Object.keys(detalhesPorData).sort();
    let html = '';

    datas.forEach(data => {
        const detalhes = detalhesPorData[data];
        const documentos = detalhes.documentos.sort((a, b) => a.nNF - b.nNF);

        html += `
            <div class="detalhes-data-container" style="margin-bottom: 20px;">
                <div class="detalhes-header">
                    <h2>${formatarData(data)} - ${formatador.format(detalhes.total)}</h2>
                </div>
                
                <table class="detalhes-table">
                    <thead>
                        <tr>
                            <th>Série</th>
                            <th>Número</th>
                            <th>Chave</th>
                            <th>Valor</th>
                            <th>Arquivo</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        documentos.forEach(doc => {
            html += `
                <tr>
                    <td>${doc.serie || 'N/A'}</td>
                    <td>${doc.nNF}</td>
                    <td class="chave">${formatarChave(doc.chNFe)}</td>
                    <td class="valor-cell">${formatador.format(doc.valor)}</td>
                    <td>${doc.nomeArquivo}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    });

    elementos.detalhesData.innerHTML = html;
}

// ==================== PROCESSAMENTO DO RELATÓRIO XLS ====================
async function processarArquivoXLS() {
    return new Promise((resolve, reject) => {
        if (!arquivoXLS) {
            reject(new Error('Nenhum arquivo XLS selecionado'));
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Ver todas as planilhas disponíveis
                console.log('Planilhas disponíveis:', workbook.SheetNames);

                // Usar a primeira planilha
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                console.log('Total de linhas no relatório:', jsonData.length);
                if (jsonData.length > 0) {
                    console.log('Cabeçalho do relatório:', jsonData[0]);
                }

                chavesReferencia.clear();

                // Procurar colunas automaticamente
                let colunaChave = -1;
                let colunaNumero = -1;
                let colunaValor = -1;

                // Analisar cabeçalho (primeira linha)
                if (jsonData.length > 0) {
                    const cabecalho = jsonData[0];

                    for (let i = 0; i < cabecalho.length; i++) {
                        const celula = cabecalho[i] ? cabecalho[i].toString().toLowerCase() : '';

                        if (celula.includes('chave') || celula.length === 44) {
                            colunaChave = i;
                        }

                        if (celula.includes('númer') || celula.includes('numero') || celula.includes('nf')) {
                            colunaNumero = i;
                        }

                        if (celula.includes('valor') || celula.includes('total') || celula.includes('vlr')) {
                            colunaValor = i;
                        }
                    }
                }

                // Se não encontrou pelo cabeçalho, usar índices padrão
                if (colunaChave === -1) colunaChave = 6; // Coluna G
                if (colunaNumero === -1) colunaNumero = 12; // Coluna M
                if (colunaValor === -1) colunaValor = 13; // Coluna N

                console.log('Colunas identificadas:', {
                    chave: colunaChave,
                    numero: colunaNumero,
                    valor: colunaValor
                });

                // Processar linhas
                let chavesProcessadas = 0;
                for (let i = 1; i < jsonData.length; i++) {
                    const linha = jsonData[i];

                    if (!linha || linha.length === 0) continue;

                    const chave = linha[colunaChave] ? linha[colunaChave].toString().trim() : '';
                    const nNF = linha[colunaNumero] ? linha[colunaNumero].toString().trim() : 'N/A';

                    // Extrair valor
                    let valor = 0;
                    if (linha[colunaValor] !== undefined && linha[colunaValor] !== null) {
                        const valorStr = linha[colunaValor].toString();
                        // Remover caracteres não numéricos exceto ponto e vírgula
                        const valorLimpo = valorStr.replace(/[^\d,.-]/g, '').replace(',', '.');
                        valor = parseFloat(valorLimpo) || 0;
                    }

                    // Validar e armazenar chave
                    if (chave && chave.length === 44 && /^\d+$/.test(chave)) {
                        chavesReferencia.set(chave, { nNF, valor });
                        chavesProcessadas++;
                    }
                }

                console.log(`Total de chaves processadas no relatório: ${chavesProcessadas}`);
                elementos.xlsStatus.textContent = `${chavesProcessadas} chaves carregadas do relatório`;

                if (chavesProcessadas === 0) {
                    console.warn('Nenhuma chave válida encontrada no relatório. Verifique o formato do arquivo.');
                }

                resolve();

            } catch (error) {
                console.error('Erro ao processar arquivo XLS:', error);
                reject(new Error(`Erro no formato do arquivo: ${error.message}`));
            }
        };

        reader.onerror = function () {
            reject(new Error('Erro na leitura do arquivo'));
        };

        reader.readAsArrayBuffer(arquivoXLS);
    });
}

// ==================== EXECUÇÃO DA COMPARAÇÃO ====================
async function executarComparacao() {
    if (!dadosProcessados) {
        alert('Por favor, importe os XMLs primeiro.');
        return;
    }

    if (!relatorioCarregado) {
        alert('Por favor, importe um relatório XLS/XLSX primeiro.');
        return;
    }

    try {
        atualizarStatus('Executando comparação...', 'processing');

        // Coletar chaves dos XMLs (apenas autorizadas)
        const chavesXML = new Map();
        Object.values(detalhesPorData).forEach(detalhes => {
            detalhes.documentos.forEach(doc => {
                if (doc.chNFe !== 'N/A') {
                    chavesXML.set(doc.chNFe, doc);
                }
            });
        });

        // Coletar chaves de notas canceladas
        const chavesCanceladas = new Map();
        notasCanceladas.forEach(doc => {
            if (doc.chNFe !== 'N/A') {
                chavesCanceladas.set(doc.chNFe, doc);
            }
        });

        // Encontrar chaves faltantes e divergências
        const faltantesXML = []; // XMLs ausentes no XLS (apenas autorizadas)
        const faltantesXMLCanceladas = []; // Canceladas ausentes no XLS
        const faltantesXLS = []; // XLS ausentes nos XMLs (exceto canceladas)
        const divergenciasValor = []; // Chaves com valores diferentes
        const correspondencias = []; // Chaves com valores iguais

        // Verificar chaves dos XMLs autorizadas
        chavesXML.forEach((doc, chave) => {
            const referencia = chavesReferencia.get(chave);

            if (!referencia) {
                // Chave não encontrada no XLS
                faltantesXML.push(doc);
            } else {
                // Chave encontrada, verificar valor
                const valorXML = doc.valor;
                const valorXLS = referencia.valor || 0;

                // Comparar valores com tolerância de 0.01
                if (Math.abs(valorXML - valorXLS) <= 0.01) {
                    correspondencias.push({
                        ...doc,
                        valorXLS: valorXLS,
                        status: 'OK'
                    });
                } else {
                    divergenciasValor.push({
                        ...doc,
                        valorXLS: valorXLS,
                        diferenca: valorXML - valorXLS,
                        status: 'DIVERGENTE'
                    });
                }
            }
        });

        // Verificar chaves dos XMLs canceladas ausentes no XLS
        chavesCanceladas.forEach((doc, chave) => {
            if (!chavesReferencia.has(chave)) {
                faltantesXMLCanceladas.push(doc);
            }
        });

        // Verificar chaves do XLS ausentes nos XMLs (ignorando as canceladas)
        chavesReferencia.forEach((referencia, chave) => {
            if (!chavesXML.has(chave)) {
                // Se não está nas autorizadas, verificar se está nas canceladas
                if (!chavesCanceladas.has(chave)) {
                    // Se não está nas canceladas, então está faltando
                    faltantesXLS.push({
                        chave,
                        nNF: referencia.nNF || 'N/A',
                        valorXLS: referencia.valor || 0
                    });
                }
            }
        });

        // Exibir resultados
        mostrarResultadosComparacao(
            faltantesXML,
            faltantesXMLCanceladas,
            faltantesXLS,
            divergenciasValor,
            correspondencias
        );

        atualizarStatus('Comparação concluída com sucesso!', 'success');

    } catch (error) {
        console.error('Erro na comparação:', error);
        atualizarStatus('Erro na comparação', 'error');

        elementos.resultadoComparacao.innerHTML = `
            <div class="error">
                <h3><i class="fas fa-exclamation-triangle"></i> Erro na Comparação</h3>
                <p>${error.message}</p>
                <p>Verifique se o formato do relatório está correto.</p>
                <button class="btn-secondary" onclick="executarComparacao()">
                    <i class="fas fa-redo"></i> Tentar Novamente
                </button>
            </div>
        `;
    }
}

function mostrarResultadosComparacao(faltantesXML, faltantesXMLCanceladas, faltantesXLS, divergenciasValor, correspondencias) {
    let html = '';

    // Seção de resumo
    html += `
        <div class="resumo-comparacao">
            <h2><i class="fas fa-chart-pie"></i> Resumo da Comparação</h2>
            <div class="resumo-cards">
                <div class="resumo-card">
                    <div class="resumo-icon" style="background: #4CAF50;">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="resumo-content">
                        <h3>${correspondencias.length}</h3>
                        <p>Valores Consistentes</p>
                    </div>
                </div>
                
                <div class="resumo-card">
                    <div class="resumo-icon" style="background: #FF9800;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="resumo-content">
                        <h3>${divergenciasValor.length}</h3>
                        <p>Valores Divergentes</p>
                    </div>
                </div>
                
                <div class="resumo-card">
                    <div class="resumo-icon" style="background: #2196F3;">
                        <i class="fas fa-file-excel"></i>
                    </div>
                    <div class="resumo-content">
                        <h3>${faltantesXLS.length}</h3>
                        <p>Chaves no XLS Ausentes</p>
                    </div>
                </div>
                
                <div class="resumo-card">
                    <div class="resumo-icon" style="background: #9C27B0;">
                        <i class="fas fa-file-code"></i>
                    </div>
                    <div class="resumo-content">
                        <h3>${faltantesXML.length}</h3>
                        <p>Chaves XMLs Ausentes</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    

    // Chaves no XLS ausentes nos XMLs
    if (faltantesXLS.length > 0) {
        html += `
            <div class="tabela-comparacao">
                <h3><i class="fas fa-file-excel"></i> Chaves no Relatório Ausentes nos XMLs (${faltantesXLS.length})</h3>
                <p class="info-text"><small><i class="fas fa-info-circle"></i> Notas canceladas não são consideradas ausentes</small></p>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>Chave</th>
                                <th>Valor no XLS</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        faltantesXLS.forEach(item => {
            html += `
                <tr class="status-ausente">
                    <td>${item.nNF}</td>
                    <td class="chave">${formatarChave(item.chave)}</td>
                    <td class="valor-cell">${formatador.format(item.valorXLS)}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Chaves nos XMLs ausentes no XLS
    if (faltantesXML.length > 0) {
        html += `
            <div class="tabela-comparacao">
                <h3><i class="fas fa-file-code"></i> Chaves Autorizadas nos XMLs Ausentes no Relatório (${faltantesXML.length})</h3>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Série</th>
                                <th>Número</th>
                                <th>Chave</th>
                                <th>Valor XML</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        faltantesXML.forEach(doc => {
            html += `
                <tr class="status-ausente">
                    <td>${doc.serie || 'N/A'}</td>
                    <td>${doc.nNF}</td>
                    <td class="chave">${formatarChave(doc.chNFe)}</td>
                    <td class="valor-cell">${formatador.format(doc.valor)}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Comparação completa XML vs XLS - AGORA COM FILTRO
    html += `
        <div class="tabela-comparacao">
            <div class="comparacao-header">
                <h3><i class="fas fa-list-check"></i> Comparação Valor de cada XML vs Relatório (${correspondencias.length + divergenciasValor.length} notas autorizadas)</h3>
                <div class="filtro-container">
                    <label for="filtro-status">
                        <i class="fas fa-filter"></i> Filtrar por Status:
                    </label>
                    <select id="filtro-status" class="filtro-select">
                        <option value="todos">Todos</option>
                        <option value="OK">Apenas OK</option>
                        <option value="DIVERGENTE">Apenas Divergentes</option>
                    </select>
                </div>
            </div>
            <p class="info-text"><small><i class="fas fa-info-circle"></i> Comparação lado a lado de todas as notas autorizadas</small></p>
            <div class="table-responsive">
                <table id="tabela-comparacao-principal">
                    <thead>
                        <tr>
                            <th>Série</th>
                            <th>Número</th>
                            <th>Chave</th>
                            <th>Valor XML</th>
                            <th>Valor XLS</th>
                            <th>Diferença</th>
                            <th>Arquivo XML</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Combinar correspondências e divergências
    const todasNotas = [...correspondencias, ...divergenciasValor];

    // Ordenar por série e número
    todasNotas.sort((a, b) => {
        if (a.serie !== b.serie) return (a.serie || '').localeCompare(b.serie || '');
        return a.nNF - b.nNF;
    });

    if (todasNotas.length === 0) {
        html += `
            <tr>
                <td colspan="8" class="no-data-cell">
                    <i class="fas fa-info-circle"></i> Nenhuma nota autorizada para comparar
                </td>
            </tr>
        `;
    } else {
        todasNotas.forEach(doc => {
            const statusClass = doc.status === 'OK' ? 'status-ok' : 'status-divergente';
            const statusIcon = doc.status === 'OK' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
            const statusText = doc.status === 'OK' ? 'OK' : 'Divergente';

            html += `
                <tr class="${statusClass}" data-status="${doc.status}">
                    <td>${doc.serie || 'N/A'}</td>
                    <td>${doc.nNF}</td>
                    <td class="chave">${formatarChave(doc.chNFe)}</td>
                    <td class="valor-cell">${formatador.format(doc.valor)}</td>
                    <td class="valor-cell">${formatador.format(doc.valorXLS)}</td>
                    <td class="${doc.diferenca > 0.01 ? 'diferenca-positiva' : doc.diferenca < -0.01 ? 'diferenca-negativa' : ''}">
                        ${doc.diferenca ? (doc.diferenca > 0 ? '+' : '') + formatador.format(doc.diferenca) : 'R$ 0,00'}
                    </td>
                    <td>${doc.nomeArquivo}</td>
                    <td>
                        <i class="${statusIcon}"></i> ${statusText}
                    </td>
                </tr>
            `;
        });
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Chaves canceladas ausentes no XLS
    if (faltantesXMLCanceladas.length > 0) {
        html += `
            <div class="tabela-comparacao">
                <h3><i class="fas fa-ban"></i> Chaves Canceladas nos XMLs Ausentes no XLS (${faltantesXMLCanceladas.length})</h3>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Série</th>
                                <th>Número</th>
                                <th>Chave</th>
                                <th>Valor Original</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        faltantesXMLCanceladas.forEach(doc => {
            html += `
                <tr class="status-cancelada">
                    <td>${doc.serie || 'N/A'}</td>
                    <td>${doc.nNF}</td>
                    <td class="chave">${formatarChave(doc.chNFe)}</td>
                    <td class="valor-cell">${formatador.format(doc.valor)}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    elementos.resultadoComparacao.innerHTML = html;

    // Adicionar funcionalidade ao filtro após inserir o HTML
    adicionarFiltroStatus();
}

function mostrarStatusComparacao() {
    let statusHTML = '';

    if (!dadosProcessados && !relatorioCarregado) {
        statusHTML = `
            <div class="status-comparacao">
                <div class="status-icon">
                    <i class="fas fa-info-circle fa-3x"></i>
                </div>
                <h3>Comparação não disponível</h3>
                <p>Para realizar a comparação, você precisa:</p>
                <ol>
                    <li>Importar os arquivos XMLs na aba Dashboard</li>
                    <li>Importar um relatório XLS/XLSX nesta aba</li>
                </ol>
                <p>Após importar ambos, a comparação será executada automaticamente.</p>
            </div>
        `;
    } else if (!dadosProcessados) {
        statusHTML = `
            <div class="status-comparacao">
                <div class="status-icon" style="color: #2196F3;">
                    <i class="fas fa-file-excel fa-3x"></i>
                </div>
                <h3>Relatório Carregado</h3>
                <p>Relatório XLS/XLSX importado com sucesso!</p>
                <p>${chavesReferencia.size} chaves carregadas.</p>
                <p>Para realizar a comparação, importe os arquivos XMLs na aba Dashboard.</p>
            </div>
        `;
    } else if (!relatorioCarregado) {
        statusHTML = `
            <div class="status-comparacao">
                <div class="status-icon" style="color: #4CAF50;">
                    <i class="fas fa-file-code fa-3x"></i>
                </div>
                <h3>XMLs Processados</h3>
                <p>${arquivosNFe.length} arquivos XML processados com sucesso!</p>
                <p>Para realizar a comparação, importe um relatório XLS/XLSX nesta aba.</p>
                <button id="btn-comparar-manual" class="btn-action btn-primary">
                    <i class="fas fa-exchange-alt"></i> Executar Comparação Manualmente
                </button>
            </div>
        `;
    }

    elementos.resultadoComparacao.innerHTML = statusHTML;

    // Reconfigurar botão se necessário
    if (!relatorioCarregado && dadosProcessados) {
        document.getElementById('btn-comparar-manual').addEventListener('click', async function () {
            if (!arquivoXLS) {
                alert('Por favor, importe um relatório XLS/XLSX primeiro.');
                return;
            }
            await executarComparacao();
        });
    }
}

function mostrarResultadosComparacaoAtual() {
    // Esta função é chamada quando a aba de comparação é aberta e já temos dados
    if (dadosProcessados && relatorioCarregado) {
        // Simplesmente recriar a exibição com os dados atuais
        // Re-executar a lógica de comparação
        const chavesXML = new Map();
        Object.values(detalhesPorData).forEach(detalhes => {
            detalhes.documentos.forEach(doc => {
                if (doc.chNFe !== 'N/A') {
                    chavesXML.set(doc.chNFe, doc);
                }
            });
        });

        const chavesCanceladas = new Map();
        notasCanceladas.forEach(doc => {
            if (doc.chNFe !== 'N/A') {
                chavesCanceladas.set(doc.chNFe, doc);
            }
        });

        const faltantesXML = [];
        const faltantesXMLCanceladas = [];
        const faltantesXLS = [];
        const divergenciasValor = [];
        const correspondencias = [];

        // Verificar chaves dos XMLs autorizadas
        chavesXML.forEach((doc, chave) => {
            const referencia = chavesReferencia.get(chave);

            if (!referencia) {
                faltantesXML.push(doc);
            } else {
                const valorXML = doc.valor;
                const valorXLS = referencia.valor || 0;

                if (Math.abs(valorXML - valorXLS) <= 0.01) {
                    correspondencias.push({
                        ...doc,
                        valorXLS: valorXLS,
                        status: 'OK'
                    });
                } else {
                    divergenciasValor.push({
                        ...doc,
                        valorXLS: valorXLS,
                        diferenca: valorXML - valorXLS,
                        status: 'DIVERGENTE'
                    });
                }
            }
        });

        // Verificar chaves dos XMLs canceladas ausentes no XLS
        chavesCanceladas.forEach((doc, chave) => {
            if (!chavesReferencia.has(chave)) {
                faltantesXMLCanceladas.push(doc);
            }
        });

        // Verificar chaves do XLS ausentes nos XMLs
        chavesReferencia.forEach((referencia, chave) => {
            if (!chavesXML.has(chave)) {
                if (!chavesCanceladas.has(chave)) {
                    faltantesXLS.push({
                        chave,
                        nNF: referencia.nNF || 'N/A',
                        valorXLS: referencia.valor || 0
                    });
                }
            }
        });

        mostrarResultadosComparacao(
            faltantesXML,
            faltantesXMLCanceladas,
            faltantesXLS,
            divergenciasValor,
            correspondencias
        );
    } else {
        mostrarStatusComparacao();
    }
}

// ==================== FUNÇÕES UTILITÁRIAS ====================
function atualizarStatus(mensagem, tipo) {
    elementos.statusBar.textContent = mensagem;

    switch (tipo) {
        case 'success':
            elementos.statusIndicator.style.background = '#4CAF50';
            break;
        case 'error':
            elementos.statusIndicator.style.background = '#ff4444';
            break;
        case 'processing':
            elementos.statusIndicator.style.background = '#2196F3';
            break;
        default:
            elementos.statusIndicator.style.background = '#4CAF50';
    }
}

function formatarData(dataISO) {
    if (!dataISO) return 'N/A';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
}

function formatarChave(chave) {
    return chave?.match(/.{1,4}/g)?.join(' ') || 'Chave inválida';
}

function formatarNumerosFaltantes(numeros) {
    if (numeros.length === 0) return '';

    const grupos = [];
    let inicio = numeros[0];
    let atual = numeros[0];

    for (let i = 1; i <= numeros.length; i++) {
        if (i === numeros.length || numeros[i] !== atual + 1) {
            if (inicio === atual) {
                grupos.push(inicio);
            } else {
                grupos.push(`${inicio}-${atual}`);
            }
            if (i < numeros.length) {
                inicio = numeros[i];
                atual = numeros[i];
            }
        } else {
            atual = numeros[i];
        }
    }

    return grupos.map(grupo => `<span class="numero-faltante">${grupo}</span>`).join(', ');
}

function reiniciarSistema() {
    if (confirm('Tem certeza que deseja reiniciar o sistema? Todos os dados serão perdidos.')) {
        // Limpar variáveis
        arquivosNFe = [];
        arquivoXLS = null;
        chavesReferencia.clear();
        detalhesPorData = {};
        notasPorSerie.clear();
        todasNotasPorSerie.clear();
        notasCanceladas = [];
        notasProtocolo = [];
        dadosProcessados = false;
        relatorioCarregado = false;

        // Limpar inputs
        document.getElementById('fileInput').value = '';
        document.getElementById('fileInputChaves').value = '';

        // Limpar interface
        elementos.xmlCount.textContent = '0 arquivos';
        elementos.xmlTotal.textContent = 'R$ 0,00';
        elementos.totalGeral.textContent = 'R$ 0,00';
        elementos.totalNotas.textContent = '0 notas';
        elementos.periodo.textContent = '-';
        elementos.diasAnalisados.textContent = '0 dias';
        elementos.seriesCount.textContent = '0';
        elementos.canceladasCount.textContent = '0';
        elementos.protocolosCount.textContent = '0';
        elementos.totalPorData.innerHTML = '';
        elementos.analiseSequencia.innerHTML = '';
        elementos.detalhesData.innerHTML = '';
        elementos.resultadoComparacao.innerHTML = '';
        elementos.xlsStatus.textContent = 'Aguardando relatório';

        // Voltar para aba dashboard
        document.querySelector('[data-tab="dashboard"]').click();

        atualizarStatus('Sistema reiniciado com sucesso', 'success');
    }
}

function exportarRelatorio() {
    if (!dadosProcessados) {
        alert('Importe os XMLs primeiro para exportar o relatório.');
        return;
    }

    // Criar dados para exportação
    const dados = [];
    const datas = Object.keys(detalhesPorData).sort();

    // Adicionar cabeçalho para notas autorizadas
    dados.push(['=== NOTAS AUTORIZADAS ===']);
    dados.push(['Data', 'Série', 'Número', 'Chave', 'Valor', 'Arquivo']);

    // Adicionar dados das notas autorizadas
    datas.forEach(data => {
        const detalhes = detalhesPorData[data];
        detalhes.documentos.forEach(doc => {
            dados.push([
                formatarData(data),
                doc.serie || '',
                doc.nNF,
                doc.chNFe,
                doc.valor,
                doc.nomeArquivo
            ]);
        });
    });

    // Adicionar separador para notas canceladas
    dados.push(['']);
    dados.push(['=== NOTAS CANCELADAS ===']);
    dados.push(['Arquivo', 'Chave', 'Número', 'Série', 'Valor Original']);

    // Adicionar notas canceladas
    notasCanceladas.forEach(doc => {
        dados.push([
            doc.nomeArquivo,
            doc.chNFe,
            doc.nNF,
            doc.serie || '',
            doc.valor
        ]);
    });

    // Adicionar separador para protocolos
    dados.push(['']);
    dados.push(['=== PROTOCOLOS DE CANCELAMENTO ===']);
    dados.push(['Arquivo', 'Chave', 'Número', 'Série', 'Data Evento']);

    // Adicionar protocolos de cancelamento
    notasProtocolo.forEach(doc => {
        dados.push([
            doc.nomeArquivo,
            doc.chNFe,
            doc.nNF,
            doc.serie || '',
            doc.data ? formatarData(doc.data) : 'N/A'
        ]);
    });

    // Adicionar comparação com relatório se disponível
    if (relatorioCarregado) {
        dados.push(['']);
        dados.push(['=== COMPARAÇÃO COM RELATÓRIO ===']);
        dados.push(['Série', 'Número', 'Chave', 'Valor XML', 'Valor XLS', 'Diferença', 'Status']);

        // Coletar todas as chaves autorizadas
        const todasChavesAutorizadas = [];
        Object.values(detalhesPorData).forEach(detalhes => {
            detalhes.documentos.forEach(doc => {
                if (doc.chNFe !== 'N/A') {
                    todasChavesAutorizadas.push(doc);
                }
            });
        });

        // Processar cada nota
        todasChavesAutorizadas.forEach(doc => {
            const referencia = chavesReferencia.get(doc.chNFe);
            const valorXLS = referencia ? referencia.valor : 0;
            const diferenca = doc.valor - valorXLS;

            let status = '';
            if (!referencia) {
                status = 'AUSENTE NO XLS';
            } else if (Math.abs(diferenca) > 0.01) {
                status = 'VALOR DIVERGENTE';
            } else {
                status = 'OK';
            }

            dados.push([
                doc.serie || '',
                doc.nNF,
                doc.chNFe,
                doc.valor,
                referencia ? valorXLS : 'N/A',
                referencia ? diferenca : 'N/A',
                status
            ]);
        });
    }

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dados);

    // Estilizar (largura das colunas)
    const colWidths = [
        { wch: 12 }, // Data
        { wch: 8 },  // Série
        { wch: 10 }, // Número
        { wch: 48 }, // Chave
        { wch: 15 }, // Valor
        { wch: 30 }, // Arquivo
        { wch: 15 }, // Valor Original
        { wch: 12 }, // Data Evento
        { wch: 15 }, // Valor XLS
        { wch: 15 }, // Diferença
        { wch: 20 }  // Status
    ];
    ws['!cols'] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Completo');

    // Adicionar sheet de resumo
    const resumoDados = [
        ['RESUMO GERAL'],
        ['Total Geral Autorizado:', elementos.totalGeral.textContent],
        ['Total de Notas Autorizadas:', elementos.totalNotas.textContent],
        ['Período:', elementos.periodo.textContent],
        ['Dias Analisados:', elementos.diasAnalisados.textContent],
        ['Séries Encontradas:', elementos.seriesCount.textContent],
        ['Notas Canceladas:', elementos.canceladasCount.textContent],
        ['Protocolos de Cancelamento:', elementos.protocolosCount.textContent],
        [''],
        ['=== COMPARAÇÃO ==='],
        ['Chaves no Relatório:', chavesReferencia.size],
        ['Valores Consistentes:', `${correspondencias ? correspondencias.length : 0}`],
        ['Valores Divergentes:', `${divergenciasValor ? divergenciasValor.length : 0}`]
    ];

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoDados);
    wsResumo['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Gerar nome do arquivo com data atual
    const dataAtual = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nomeArquivo = `relatorio_xmls_${dataAtual}.xlsx`;

    // Salvar arquivo
    XLSX.writeFile(wb, nomeArquivo);

    atualizarStatus('Relatório exportado com sucesso', 'success');
}

// ==================== FUNÇÃO DO FILTRO ADICIONADA ====================
function adicionarFiltroStatus() {
    const filtroSelect = document.getElementById('filtro-status');
    const tabela = document.getElementById('tabela-comparacao-principal');

    if (!filtroSelect || !tabela) return;

    filtroSelect.addEventListener('change', function () {
        const statusSelecionado = this.value;
        const linhas = tabela.querySelectorAll('tbody tr');
        let linhasVisiveis = 0;

        linhas.forEach(linha => {
            const statusLinha = linha.getAttribute('data-status');

            if (statusSelecionado === 'todos' || statusSelecionado === statusLinha) {
                linha.style.display = '';
                linhasVisiveis++;
            } else {
                linha.style.display = 'none';
            }
        });

        // Atualizar contador no cabeçalho
        const header = tabela.closest('.tabela-comparacao').querySelector('h3');
        if (header && statusSelecionado === 'todos') {
            const totalOriginal = linhas.length;
            header.innerHTML = `<i class="fas fa-list-check"></i> Comparação Completa XML vs XLS (${totalOriginal} notas autorizadas)`;
        } else if (header) {
            header.innerHTML = `<i class="fas fa-list-check"></i> Comparação Completa XML vs XLS (${linhasVisiveis} notas autorizadas) <span class="filtro-ativo">- Filtro: ${statusSelecionado === 'OK' ? 'Apenas OK' : 'Apenas Divergentes'}</span>`;
        }
    });
}

// Adicione esta função para alternar entre as abas
function alternarAba(tabId) {
    // Oculta todas as abas
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove a classe active de todos os botões
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Ativa a aba selecionada
    document.getElementById(tabId).classList.add('active');

    // Ativa o botão correspondente
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    // Se for a aba comparar, atualiza as estatísticas dos XMLs
    if (tabId === 'comparar') {
        atualizarUIModuloXml();
    }
}

// Adicione event listeners para os botões das abas
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function () {
        const tabId = this.getAttribute('data-tab');
        alternarAba(tabId);
    });
});

// Certifique-se de que a drop zone de XMLs na aba comparar usa os mesmos dados
function atualizarUIModuloXml() {
    // Atualiza a aba dashboard
    if (document.getElementById('xml-count')) {
        document.getElementById('xml-count').textContent = `${xmlFiles.length} arquivos`;
        document.getElementById('xml-total').textContent = formatCurrency(totalGeral);
    }

    // Atualiza a aba comparar (se estiver visível)
    if (document.getElementById('xml-count-comparar')) {
        document.getElementById('xml-count-comparar').textContent = `${xmlFiles.length} arquivos`;
    }

    // Atualiza os cards de resumo
    atualizarCardsResumo();
}

// Adicione event listeners para a nova drop zone de XMLs na aba comparar
const dropZoneXmlComparar = document.getElementById('dropZoneXmlComparar');
const fileInputComparar = document.getElementById('fileInputComparar');

if (dropZoneXmlComparar && fileInputComparar) {
    // Configurar os mesmos eventos da drop zone principal
    configurarDropZone(dropZoneXmlComparar, fileInputComparar);

    // Processar arquivos quando selecionados
    fileInputComparar.addEventListener('change', function (e) {
        processarArquivosXML(e.target.files);
    });
}